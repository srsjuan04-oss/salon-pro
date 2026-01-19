import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  text?: { body: string };
  type: string;
}

interface WhatsAppChange {
  value: {
    messaging_product: string;
    metadata: { phone_number_id: string };
    contacts?: Array<{ profile: { name: string }; wa_id: string }>;
    messages?: WhatsAppMessage[];
    statuses?: Array<{ id: string; status: string }>;
  };
  field: string;
}

interface WhatsAppWebhookBody {
  object: string;
  entry: Array<{
    id: string;
    changes: WhatsAppChange[];
  }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // Webhook verification (GET request from Meta)
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const verifyToken = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN");

    console.log("Webhook verification attempt:", { mode, tokenMatch: token === verifyToken });

    if (mode === "subscribe" && token === verifyToken) {
      console.log("Webhook verified successfully");
      return new Response(challenge, { status: 200 });
    } else {
      console.error("Webhook verification failed");
      return new Response("Forbidden", { status: 403 });
    }
  }

  // Handle incoming messages (POST request)
  if (req.method === "POST") {
    try {
      const body: WhatsAppWebhookBody = await req.json();
      console.log("Received webhook:", JSON.stringify(body, null, 2));

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field !== "messages") continue;

          const value = change.value;
          const messages = value.messages || [];
          const contacts = value.contacts || [];

          for (const message of messages) {
            const phoneNumber = message.from;
            const contactName = contacts.find(c => c.wa_id === phoneNumber)?.profile?.name || "Cliente";

            console.log(`Processing message from ${phoneNumber} (${contactName}): ${message.text?.body}`);

            // Find or create conversation
            let { data: conversation } = await supabase
              .from("whatsapp_conversations")
              .select("*")
              .eq("phone_number", phoneNumber)
              .single();

            if (!conversation) {
              // Check if customer exists
              let { data: customer } = await supabase
                .from("customers")
                .select("*")
                .eq("phone", phoneNumber)
                .single();

              if (!customer) {
                const { data: newCustomer } = await supabase
                  .from("customers")
                  .insert({
                    name: contactName,
                    phone: phoneNumber,
                    whatsapp_id: phoneNumber,
                  })
                  .select()
                  .single();
                customer = newCustomer;
              }

              const { data: newConversation } = await supabase
                .from("whatsapp_conversations")
                .insert({
                  phone_number: phoneNumber,
                  customer_id: customer?.id,
                  status: "active",
                  last_message: message.text?.body || "",
                  last_message_at: new Date().toISOString(),
                })
                .select()
                .single();
              conversation = newConversation;
            } else {
              await supabase
                .from("whatsapp_conversations")
                .update({
                  last_message: message.text?.body || "",
                  last_message_at: new Date().toISOString(),
                  status: "active",
                })
                .eq("id", conversation.id);
            }

            if (!conversation) continue;

            // Store inbound message
            await supabase
              .from("whatsapp_messages")
              .insert({
                conversation_id: conversation.id,
                direction: "inbound",
                message_type: message.type,
                content: message.text?.body || JSON.stringify(message),
                whatsapp_message_id: message.id,
                status: "received",
              });

            // Process text messages with AI
            if (message.type === "text" && message.text?.body) {
              // Get recent conversation history for context
              const { data: recentMessages } = await supabase
                .from("whatsapp_messages")
                .select("direction, content, created_at")
                .eq("conversation_id", conversation.id)
                .order("created_at", { ascending: false })
                .limit(10);

              const conversationContext = recentMessages
                ?.reverse()
                .map(m => `${m.direction === "inbound" ? "Cliente" : "Asistente"}: ${m.content}`)
                .join("\n") || "";

              // Call AI Assistant
              const aiResponse = await fetch(`${supabaseUrl}/functions/v1/ai-assistant`, {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${supabaseKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  message: message.text.body,
                  phone_number: phoneNumber,
                  conversation_context: conversationContext,
                }),
              });

              if (aiResponse.ok) {
                const aiData = await aiResponse.json();
                const replyMessage = aiData.response;

                console.log("AI Response:", replyMessage);

                // Send WhatsApp reply
                await sendWhatsAppMessage(phoneNumber, replyMessage);

                // Store outbound message
                await supabase
                  .from("whatsapp_messages")
                  .insert({
                    conversation_id: conversation.id,
                    direction: "outbound",
                    message_type: "text",
                    content: replyMessage,
                    status: "sent",
                  });

                // Update conversation context with AI action if any
                if (aiData.action) {
                  await supabase
                    .from("whatsapp_conversations")
                    .update({
                      context: { last_action: aiData.action },
                      last_message: replyMessage,
                      last_message_at: new Date().toISOString(),
                    })
                    .eq("id", conversation.id);
                }
              } else {
                console.error("AI Assistant error:", await aiResponse.text());
                // Fallback response
                await sendWhatsAppMessage(
                  phoneNumber,
                  "¡Hola! 👋 Gracias por contactarnos. Un momento por favor, te atenderemos pronto."
                );
              }
            }
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error processing webhook:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});

async function sendWhatsAppMessage(to: string, message: string): Promise<void> {
  const token = Deno.env.get("META_WHATSAPP_TOKEN");
  const phoneNumberId = Deno.env.get("META_WHATSAPP_PHONE_ID");

  if (!token || !phoneNumberId) {
    console.error("WhatsApp credentials not configured");
    return;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: to,
          type: "text",
          text: { body: message },
        }),
      }
    );

    const result = await response.json();
    console.log("WhatsApp API response:", result);
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
  }
}
