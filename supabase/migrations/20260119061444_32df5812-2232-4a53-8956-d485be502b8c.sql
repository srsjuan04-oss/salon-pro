-- Table for WhatsApp message templates
CREATE TABLE public.whatsapp_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  category text NOT NULL DEFAULT 'UTILITY',
  language text NOT NULL DEFAULT 'es_MX',
  header_type text, -- TEXT, IMAGE, VIDEO, DOCUMENT, NONE
  header_content text,
  body_text text NOT NULL,
  footer_text text,
  buttons jsonb, -- Array of button objects
  meta_template_id text, -- ID returned by Meta after creation
  meta_status text DEFAULT 'draft', -- draft, pending, approved, rejected
  meta_rejection_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table for notification flows/rules
CREATE TABLE public.notification_flows (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  trigger_type text NOT NULL, -- 'before_appointment', 'after_appointment'
  trigger_minutes integer NOT NULL, -- Negative for before, positive for after
  template_id uuid REFERENCES public.whatsapp_templates(id) ON DELETE SET NULL,
  custom_message text, -- Used if no template
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table to track sent notifications (avoid duplicates)
CREATE TABLE public.sent_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  flow_id uuid NOT NULL REFERENCES public.notification_flows(id) ON DELETE CASCADE,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  status text DEFAULT 'sent',
  whatsapp_message_id text,
  UNIQUE(appointment_id, flow_id)
);

-- Enable RLS
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sent_notifications ENABLE ROW LEVEL SECURITY;

-- Policies for templates
CREATE POLICY "Staff can read whatsapp_templates" ON public.whatsapp_templates
  FOR SELECT USING (is_authenticated_staff());
CREATE POLICY "Staff can insert whatsapp_templates" ON public.whatsapp_templates
  FOR INSERT WITH CHECK (is_authenticated_staff());
CREATE POLICY "Staff can update whatsapp_templates" ON public.whatsapp_templates
  FOR UPDATE USING (is_authenticated_staff());
CREATE POLICY "Staff can delete whatsapp_templates" ON public.whatsapp_templates
  FOR DELETE USING (is_authenticated_staff());

-- Policies for flows
CREATE POLICY "Staff can read notification_flows" ON public.notification_flows
  FOR SELECT USING (is_authenticated_staff());
CREATE POLICY "Staff can insert notification_flows" ON public.notification_flows
  FOR INSERT WITH CHECK (is_authenticated_staff());
CREATE POLICY "Staff can update notification_flows" ON public.notification_flows
  FOR UPDATE USING (is_authenticated_staff());
CREATE POLICY "Staff can delete notification_flows" ON public.notification_flows
  FOR DELETE USING (is_authenticated_staff());

-- Policies for sent notifications
CREATE POLICY "Staff can read sent_notifications" ON public.sent_notifications
  FOR SELECT USING (is_authenticated_staff());
CREATE POLICY "Service role can insert sent_notifications" ON public.sent_notifications
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can read sent_notifications" ON public.sent_notifications
  FOR SELECT TO service_role USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_whatsapp_templates_updated_at
  BEFORE UPDATE ON public.whatsapp_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_flows_updated_at
  BEFORE UPDATE ON public.notification_flows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();