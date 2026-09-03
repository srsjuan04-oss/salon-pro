-- Fase B: unificación con la plataforma de Chat (proyecto Supabase "reto-whatsapp").
-- Trae hacia salon-pro (destino final) los datos de WhatsApp Business de la organización
-- de esta barbería (allá "Empresa 1"), fusionando sus contactos con customers existentes.
-- Solo se migran datos de esa organización; cualquier otro tenant del proyecto de origen
-- queda fuera y no se toca.

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS wa_id text,
  ADD COLUMN IF NOT EXISTS consent_status text,
  ADD COLUMN IF NOT EXISTS consent_source text;

CREATE INDEX IF NOT EXISTS customers_wa_id_idx ON public.customers(wa_id);

CREATE TABLE public.chat_waba_accounts (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  waba_id text NOT NULL,
  business_name text,
  access_token_encrypted text,
  app_secret_ref text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_phone_numbers (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  waba_account_id uuid REFERENCES public.chat_waba_accounts(id) ON DELETE CASCADE,
  phone_number_id text NOT NULL,
  display_phone_number text,
  label text,
  quality_rating text,
  messaging_tier text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_templates (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  waba_account_id uuid REFERENCES public.chat_waba_accounts(id) ON DELETE CASCADE,
  meta_template_id text,
  name text NOT NULL,
  language text,
  category text,
  status text,
  components jsonb DEFAULT '[]',
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_conversations (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  phone_number_id uuid REFERENCES public.chat_phone_numbers(id) ON DELETE SET NULL,
  status text,
  assigned_to uuid,
  last_inbound_at timestamptz,
  last_outbound_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  wamid text,
  direction text,
  sender_type text,
  sender_id uuid,
  message_type text,
  content jsonb DEFAULT '{}',
  status text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX chat_messages_conversation_idx ON public.chat_messages(conversation_id, created_at);

CREATE TABLE public.chat_campaigns (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  template_id uuid REFERENCES public.chat_templates(id) ON DELETE SET NULL,
  phone_number_id uuid REFERENCES public.chat_phone_numbers(id) ON DELETE SET NULL,
  variable_mapping jsonb DEFAULT '{}',
  audience_filter jsonb DEFAULT '{}',
  status text,
  created_by uuid,
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  stats jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_campaign_recipients (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.chat_campaigns(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  phone_number_snapshot text,
  variables jsonb DEFAULT '{}',
  status text,
  skip_reason text,
  message_id uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_campaign_batches (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.chat_campaigns(id) ON DELETE CASCADE,
  batch_index integer,
  contact_count integer,
  status text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_flows (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  waba_account_id uuid REFERENCES public.chat_waba_accounts(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.chat_templates(id) ON DELETE SET NULL,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_flow_steps (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  flow_id uuid REFERENCES public.chat_flows(id) ON DELETE CASCADE,
  step_order integer,
  content_type text,
  text_body text,
  media_path text,
  media_mime_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_flow_branches (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  from_step_id uuid REFERENCES public.chat_flow_steps(id) ON DELETE CASCADE,
  match_type text,
  match_value text,
  to_step_id uuid REFERENCES public.chat_flow_steps(id) ON DELETE SET NULL,
  priority integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_flow_runs (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  flow_id uuid REFERENCES public.chat_flows(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES public.chat_conversations(id) ON DELETE SET NULL,
  current_step_id uuid REFERENCES public.chat_flow_steps(id) ON DELETE SET NULL,
  status text,
  trigger_wamid text,
  started_at timestamptz,
  completed_at timestamptz
);

CREATE TABLE public.chat_custom_field_definitions (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text,
  field_type text,
  options jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_contact_imports (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  uploaded_by uuid,
  file_path text,
  status text,
  total_rows integer DEFAULT 0,
  success_count integer DEFAULT 0,
  error_count integer DEFAULT 0,
  error_report_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_hotmart_webhooks (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text,
  event text,
  template_id uuid REFERENCES public.chat_templates(id) ON DELETE SET NULL,
  phone_number_id uuid REFERENCES public.chat_phone_numbers(id) ON DELETE SET NULL,
  variable_mapping jsonb DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_hotmart_webhook_events (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  hotmart_webhook_id uuid REFERENCES public.chat_hotmart_webhooks(id) ON DELETE SET NULL,
  event text,
  payload jsonb,
  message_id uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  received_at timestamptz,
  processed_at timestamptz,
  processing_error text
);

-- RLS: mismo patrón "org read/insert/update/delete" usado en el resto del esquema.
DO $pol$
DECLARE
  _t text;
  _tables text[] := ARRAY[
    'chat_waba_accounts','chat_phone_numbers','chat_templates','chat_conversations',
    'chat_messages','chat_campaigns','chat_campaign_recipients','chat_campaign_batches',
    'chat_flows','chat_flow_steps','chat_flow_branches','chat_flow_runs',
    'chat_custom_field_definitions','chat_contact_imports',
    'chat_hotmart_webhooks','chat_hotmart_webhook_events'
  ];
BEGIN
  FOREACH _t IN ARRAY _tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', _t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', _t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', _t);
    EXECUTE format('CREATE POLICY "org read" ON public.%I FOR SELECT TO authenticated USING (organization_id = public.current_org_id())', _t);
    EXECUTE format('CREATE POLICY "org insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_org_id())', _t);
    EXECUTE format('CREATE POLICY "org update" ON public.%I FOR UPDATE TO authenticated USING (organization_id = public.current_org_id()) WITH CHECK (organization_id = public.current_org_id())', _t);
    EXECUTE format('CREATE POLICY "org delete" ON public.%I FOR DELETE TO authenticated USING (organization_id = public.current_org_id())', _t);
  END LOOP;
END $pol$;
