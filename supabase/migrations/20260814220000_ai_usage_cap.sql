-- Registra el uso del asistente de IA (Claude) por organización para poder
-- limitar el gasto mensual de cada empresa a un tope fijo (ver ai-assistant).
CREATE TABLE public.ai_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  input_tokens integer NOT NULL,
  output_tokens integer NOT NULL,
  cost_usd numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_usage_log_org_created_idx ON public.ai_usage_log (organization_id, created_at);

ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org read" ON public.ai_usage_log FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());

GRANT SELECT ON public.ai_usage_log TO authenticated;
GRANT ALL ON public.ai_usage_log TO service_role;
