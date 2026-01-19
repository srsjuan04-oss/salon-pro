import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendWhatsAppMessage(to: string, message: string): Promise<string | null> {
  const token = Deno.env.get("META_WHATSAPP_TOKEN")!;
  const phoneNumberId = Deno.env.get("META_WHATSAPP_PHONE_ID")!;

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
          to,
          type: "text",
          text: { body: message },
        }),
      }
    );

    const data = await response.json();
    console.log("WhatsApp send response:", data);
    
    return data.messages?.[0]?.id || null;
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    return null;
  }
}

function formatMessage(template: string, appointment: any): string {
  const date = new Date(appointment.appointment_date + "T" + appointment.start_time);
  const formattedDate = date.toLocaleDateString("es-MX", { 
    weekday: "long", 
    day: "numeric", 
    month: "long" 
  });
  const formattedTime = appointment.start_time.slice(0, 5);

  return template
    .replace(/\{\{cliente\}\}/gi, appointment.customer?.name || "Cliente")
    .replace(/\{\{fecha\}\}/gi, formattedDate)
    .replace(/\{\{hora\}\}/gi, formattedTime)
    .replace(/\{\{barbero\}\}/gi, appointment.barber?.name || "")
    .replace(/\{\{servicio\}\}/gi, appointment.service?.name || "")
    .replace(/\{\{precio\}\}/gi, `$${appointment.service?.price || 0} MXN`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    console.log("Processing notifications at:", now.toISOString());

    // Get active notification flows
    const { data: flows, error: flowsError } = await supabase
      .from("notification_flows")
      .select(`
        *,
        template:whatsapp_templates(body_text)
      `)
      .eq("is_active", true);

    if (flowsError) {
      throw flowsError;
    }

    if (!flows || flows.length === 0) {
      console.log("No active notification flows");
      return new Response(
        JSON.stringify({ message: "No active flows", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${flows.length} active flows`);

    // Get upcoming appointments (next 24 hours + past 2 hours for after-appointment flows)
    const past2Hours = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { data: appointments, error: appointmentsError } = await supabase
      .from("appointments")
      .select(`
        *,
        customer:customers(id, name, phone),
        barber:barbers(name),
        service:services(name, price)
      `)
      .gte("appointment_date", past2Hours.toISOString().split("T")[0])
      .lte("appointment_date", next24Hours.toISOString().split("T")[0])
      .eq("status", "confirmed");

    if (appointmentsError) {
      throw appointmentsError;
    }

    console.log(`Found ${appointments?.length || 0} appointments to check`);

    let processedCount = 0;

    for (const appointment of appointments || []) {
      if (!appointment.customer?.phone) {
        console.log(`Appointment ${appointment.id} has no customer phone`);
        continue;
      }

      const appointmentDateTime = new Date(
        `${appointment.appointment_date}T${appointment.start_time}`
      );

      for (const flow of flows) {
        // Calculate when this notification should be sent
        const triggerTime = new Date(
          appointmentDateTime.getTime() + flow.trigger_minutes * 60 * 1000
        );

        // Check if it's time to send (within 5 minute window)
        const timeDiff = Math.abs(now.getTime() - triggerTime.getTime());
        const isWithinWindow = timeDiff <= 5 * 60 * 1000; // 5 minutes

        if (!isWithinWindow) {
          continue;
        }

        console.log(`Flow ${flow.name} triggered for appointment ${appointment.id}`);

        // Check if already sent
        const { data: existing } = await supabase
          .from("sent_notifications")
          .select("id")
          .eq("appointment_id", appointment.id)
          .eq("flow_id", flow.id)
          .maybeSingle();

        if (existing) {
          console.log(`Already sent for appointment ${appointment.id}, flow ${flow.id}`);
          continue;
        }

        // Get message content
        const messageTemplate = flow.template?.body_text || flow.custom_message;
        if (!messageTemplate) {
          console.log(`No message template for flow ${flow.id}`);
          continue;
        }

        const message = formatMessage(messageTemplate, appointment);
        console.log(`Sending to ${appointment.customer.phone}: ${message.substring(0, 50)}...`);

        // Send message
        const messageId = await sendWhatsAppMessage(appointment.customer.phone, message);

        // Record sent notification
        await supabase
          .from("sent_notifications")
          .insert({
            appointment_id: appointment.id,
            flow_id: flow.id,
            status: messageId ? "sent" : "failed",
            whatsapp_message_id: messageId,
          });

        processedCount++;
      }
    }

    console.log(`Processed ${processedCount} notifications`);

    return new Response(
      JSON.stringify({ success: true, processed: processedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Process notifications error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
