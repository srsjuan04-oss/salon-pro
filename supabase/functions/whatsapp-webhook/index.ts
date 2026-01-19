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
  // Handle CORS
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

    console.log("Webhook verification attempt:", { mode, token, verifyToken: verifyToken?.substring(0, 5) + "..." });

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

      // Initialize Supabase client
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Process each entry
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field !== "messages") continue;

          const value = change.value;
          const messages = value.messages || [];
          const contacts = value.contacts || [];

          for (const message of messages) {
            const phoneNumber = message.from;
            const contactName = contacts.find(c => c.wa_id === phoneNumber)?.profile?.name || "Unknown";

            console.log(`Processing message from ${phoneNumber} (${contactName})`);

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

              // Create customer if not exists
              if (!customer) {
                const { data: newCustomer, error: customerError } = await supabase
                  .from("customers")
                  .insert({
                    name: contactName,
                    phone: phoneNumber,
                    whatsapp_id: phoneNumber,
                  })
                  .select()
                  .single();

                if (customerError) {
                  console.error("Error creating customer:", customerError);
                } else {
                  customer = newCustomer;
                }
              }

              // Create conversation
              const { data: newConversation, error: convError } = await supabase
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

              if (convError) {
                console.error("Error creating conversation:", convError);
                continue;
              }
              conversation = newConversation;
            } else {
              // Update existing conversation
              await supabase
                .from("whatsapp_conversations")
                .update({
                  last_message: message.text?.body || "",
                  last_message_at: new Date().toISOString(),
                  status: "active",
                })
                .eq("id", conversation.id);
            }

            // Store the message
            const { error: msgError } = await supabase
              .from("whatsapp_messages")
              .insert({
                conversation_id: conversation.id,
                direction: "inbound",
                message_type: message.type,
                content: message.text?.body || JSON.stringify(message),
                whatsapp_message_id: message.id,
                status: "received",
              });

            if (msgError) {
              console.error("Error storing message:", msgError);
            }

            // Auto-reply with appointment booking info
            if (message.type === "text" && message.text?.body) {
              const messageText = message.text.body.toLowerCase();
              
              if (messageText.includes("cita") || messageText.includes("reservar") || messageText.includes("agendar")) {
                await sendWhatsAppMessage(
                  phoneNumber,
                  "¡Hola! 👋 Gracias por contactarnos.\n\n📅 Para agendar tu cita, por favor indícanos:\n1. ¿Qué servicio deseas?\n2. ¿Qué día y hora prefieres?\n3. ¿Con qué barbero?\n\nTe confirmaremos la disponibilidad enseguida. 💈"
                );
              } else if (messageText.includes("hola") || messageText.includes("buenos")) {
                await sendWhatsAppMessage(
                  phoneNumber,
                  "¡Hola! 👋 Bienvenido a nuestra barbería.\n\n¿En qué podemos ayudarte hoy?\n\n💈 Escribe 'cita' para agendar\n📋 Escribe 'servicios' para ver opciones\n⏰ Escribe 'horarios' para ver disponibilidad"
                );
              } else if (messageText.includes("servicio")) {
                // Fetch services from database
                const { data: services } = await supabase
                  .from("services")
                  .select("name, price, duration_minutes")
                  .eq("is_active", true);

                if (services && services.length > 0) {
                  let servicesText = "📋 *Nuestros Servicios:*\n\n";
                  services.forEach((s, i) => {
                    servicesText += `${i + 1}. ${s.name} - $${s.price} (${s.duration_minutes} min)\n`;
                  });
                  servicesText += "\n¿Cuál te gustaría agendar?";
                  await sendWhatsAppMessage(phoneNumber, servicesText);
                }
              } else if (messageText.includes("horario")) {
                await sendWhatsAppMessage(
                  phoneNumber,
                  "⏰ *Horarios de Atención:*\n\nLunes a Viernes: 9:00 AM - 8:00 PM\nSábados: 9:00 AM - 6:00 PM\nDomingos: Cerrado\n\n¿Te gustaría agendar una cita?"
                );
              }

              // Store outbound message
              const replyContent = "Auto-reply sent";
              await supabase
                .from("whatsapp_messages")
                .insert({
                  conversation_id: conversation.id,
                  direction: "outbound",
                  message_type: "text",
                  content: replyContent,
                  status: "sent",
                });
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
