import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { template_id } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const metaToken = Deno.env.get("META_WHATSAPP_TOKEN")!;
    const phoneNumberId = Deno.env.get("META_WHATSAPP_PHONE_ID")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get template from database
    const { data: template, error: templateError } = await supabase
      .from("whatsapp_templates")
      .select("*")
      .eq("id", template_id)
      .single();

    if (templateError || !template) {
      throw new Error("Template not found");
    }

    console.log("Syncing template to Meta:", template.name);

    // Get WhatsApp Business Account ID from phone number
    const phoneInfoRes = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}?fields=whatsapp_business_account`,
      {
        headers: { Authorization: `Bearer ${metaToken}` },
      }
    );

    if (!phoneInfoRes.ok) {
      const errorText = await phoneInfoRes.text();
      console.error("Failed to get WABA ID:", errorText);
      throw new Error("Failed to get WhatsApp Business Account ID");
    }

    const phoneInfo = await phoneInfoRes.json();
    const wabaId = phoneInfo.whatsapp_business_account?.id;

    if (!wabaId) {
      throw new Error("WhatsApp Business Account ID not found");
    }

    console.log("WABA ID:", wabaId);

    // Build template components
    const components: any[] = [];

    // Header component
    if (template.header_type && template.header_type !== "NONE" && template.header_content) {
      if (template.header_type === "TEXT") {
        components.push({
          type: "HEADER",
          format: "TEXT",
          text: template.header_content,
        });
      } else {
        components.push({
          type: "HEADER",
          format: template.header_type,
          example: {
            header_handle: [template.header_content],
          },
        });
      }
    }

    // Body component (required)
    components.push({
      type: "BODY",
      text: template.body_text,
    });

    // Footer component
    if (template.footer_text) {
      components.push({
        type: "FOOTER",
        text: template.footer_text,
      });
    }

    // Buttons
    if (template.buttons && Array.isArray(template.buttons) && template.buttons.length > 0) {
      components.push({
        type: "BUTTONS",
        buttons: template.buttons,
      });
    }

    // Create/update template in Meta
    const metaPayload = {
      name: template.name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
      category: template.category,
      language: template.language,
      components,
    };

    console.log("Sending to Meta:", JSON.stringify(metaPayload, null, 2));

    const metaRes = await fetch(
      `https://graph.facebook.com/v18.0/${wabaId}/message_templates`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${metaToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(metaPayload),
      }
    );

    const metaData = await metaRes.json();
    console.log("Meta response:", metaData);

    if (!metaRes.ok) {
      // Update template with error
      await supabase
        .from("whatsapp_templates")
        .update({
          meta_status: "rejected",
          meta_rejection_reason: metaData.error?.message || "Unknown error",
        })
        .eq("id", template_id);

      throw new Error(metaData.error?.message || "Failed to create template in Meta");
    }

    // Update template with Meta info
    await supabase
      .from("whatsapp_templates")
      .update({
        meta_template_id: metaData.id,
        meta_status: metaData.status || "pending",
        meta_rejection_reason: null,
      })
      .eq("id", template_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        meta_template_id: metaData.id,
        status: metaData.status 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Sync template error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
