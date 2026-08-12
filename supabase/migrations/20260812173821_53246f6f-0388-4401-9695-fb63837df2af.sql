ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS cancellation_reason text;

CREATE TABLE IF NOT EXISTS public.customer_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  content text NOT NULL,
  note_type text NOT NULL DEFAULT 'chat_summary',
  source text NOT NULL DEFAULT 'ai',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_notes TO authenticated;
GRANT ALL ON public.customer_notes TO service_role;

ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view customer notes" ON public.customer_notes
  FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "org members can insert customer notes" ON public.customer_notes
  FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_org_id());
CREATE POLICY "org members can update customer notes" ON public.customer_notes
  FOR UPDATE TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "org members can delete customer notes" ON public.customer_notes
  FOR DELETE TO authenticated USING (organization_id = public.current_org_id());

CREATE TRIGGER set_org_id_trg BEFORE INSERT ON public.customer_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_org_id();

CREATE INDEX IF NOT EXISTS customer_notes_customer_idx ON public.customer_notes (customer_id, occurred_at DESC);