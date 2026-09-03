-- Fase A del CRM: pipeline de clientes, tags manuales, pagos persistidos y tareas de seguimiento.

-- 1) Pipeline de etapas por organización
CREATE TABLE public.pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pipeline_stages TO authenticated;
GRANT ALL ON public.pipeline_stages TO service_role;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_org_id_trg BEFORE INSERT ON public.pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION public.set_org_id();
CREATE POLICY "org read" ON public.pipeline_stages FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "org insert" ON public.pipeline_stages FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_org_id());
CREATE POLICY "org update" ON public.pipeline_stages FOR UPDATE TO authenticated USING (organization_id = public.current_org_id()) WITH CHECK (organization_id = public.current_org_id());
CREATE POLICY "org delete" ON public.pipeline_stages FOR DELETE TO authenticated USING (organization_id = public.current_org_id());
CREATE INDEX pipeline_stages_org_idx ON public.pipeline_stages(organization_id, position);

-- Sembrar etapas por defecto para organizaciones ya existentes
INSERT INTO public.pipeline_stages (organization_id, name, position)
SELECT o.id, s.name, s.position
FROM public.organizations o
CROSS JOIN (VALUES
  ('Prospecto', 0),
  ('Contactado', 1),
  ('Cliente activo', 2),
  ('Inactivo', 3)
) AS s(name, position);

-- Sembrar etapas por defecto para organizaciones futuras
CREATE OR REPLACE FUNCTION public.seed_default_pipeline_stages()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  INSERT INTO public.pipeline_stages (organization_id, name, position) VALUES
    (NEW.id, 'Prospecto', 0),
    (NEW.id, 'Contactado', 1),
    (NEW.id, 'Cliente activo', 2),
    (NEW.id, 'Inactivo', 3);
  RETURN NEW;
END $fn$;

CREATE TRIGGER seed_pipeline_stages_trg AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.seed_default_pipeline_stages();

-- 2) Columnas nuevas en customers (hoy identification_number/balance/vip se inventaban en el cliente)
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS identification_number text,
  ADD COLUMN IF NOT EXISTS balance numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_due_date date,
  ADD COLUMN IF NOT EXISTS pipeline_stage_id uuid REFERENCES public.pipeline_stages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source text;

CREATE INDEX customers_pipeline_stage_idx ON public.customers(pipeline_stage_id);

-- Ubicar a los clientes existentes en la etapa "Cliente activo" de su organización
UPDATE public.customers c
SET pipeline_stage_id = ps.id
FROM public.pipeline_stages ps
WHERE ps.organization_id = c.organization_id
  AND ps.name = 'Cliente activo'
  AND c.pipeline_stage_id IS NULL;

-- 3) Tags manuales (independientes de los que hoy se autogeneran desde servicios comprados)
CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6b7280',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tags TO authenticated;
GRANT ALL ON public.tags TO service_role;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_org_id_trg BEFORE INSERT ON public.tags
  FOR EACH ROW EXECUTE FUNCTION public.set_org_id();
CREATE POLICY "org read" ON public.tags FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "org insert" ON public.tags FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_org_id());
CREATE POLICY "org update" ON public.tags FOR UPDATE TO authenticated USING (organization_id = public.current_org_id()) WITH CHECK (organization_id = public.current_org_id());
CREATE POLICY "org delete" ON public.tags FOR DELETE TO authenticated USING (organization_id = public.current_org_id());

CREATE TABLE public.customer_tags (
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_id, tag_id)
);
GRANT SELECT, INSERT, DELETE ON public.customer_tags TO authenticated;
GRANT ALL ON public.customer_tags TO service_role;
ALTER TABLE public.customer_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org read" ON public.customer_tags FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.organization_id = public.current_org_id()));
CREATE POLICY "org insert" ON public.customer_tags FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.organization_id = public.current_org_id()));
CREATE POLICY "org delete" ON public.customer_tags FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.organization_id = public.current_org_id()));

-- 4) Pagos de clientes: reemplaza el "Registrar Pago" que hoy solo vive en el estado de React
CREATE TABLE public.customer_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  method text NOT NULL DEFAULT 'efectivo',
  note text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.customer_payments TO authenticated;
GRANT ALL ON public.customer_payments TO service_role;
ALTER TABLE public.customer_payments ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_org_id_trg BEFORE INSERT ON public.customer_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_org_id();
CREATE POLICY "org read" ON public.customer_payments FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "org insert" ON public.customer_payments FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_org_id());
CREATE INDEX customer_payments_customer_idx ON public.customer_payments(customer_id, created_at DESC);

-- Inserta el pago y descuenta el saldo en una sola transacción (evita condiciones de carrera)
CREATE OR REPLACE FUNCTION public.register_customer_payment(
  p_customer_id uuid, p_amount numeric, p_method text, p_note text DEFAULT NULL
)
RETURNS public.customer_payments
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $fn$
DECLARE _payment public.customer_payments; _new_balance numeric;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor a cero';
  END IF;

  INSERT INTO public.customer_payments (customer_id, amount, method, note, created_by)
  VALUES (p_customer_id, p_amount, p_method, p_note, auth.uid())
  RETURNING * INTO _payment;

  UPDATE public.customers
  SET balance = GREATEST(0, balance - p_amount)
  WHERE id = p_customer_id
  RETURNING balance INTO _new_balance;

  IF _new_balance = 0 THEN
    UPDATE public.customers SET balance_due_date = NULL WHERE id = p_customer_id;
  END IF;

  RETURN _payment;
END $fn$;

GRANT EXECUTE ON FUNCTION public.register_customer_payment(uuid, numeric, text, text) TO authenticated;

-- 5) Tareas / seguimientos
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  due_at timestamptz,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'cancelled')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_org_id_trg BEFORE INSERT ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_org_id();
CREATE POLICY "org read" ON public.tasks FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "org insert" ON public.tasks FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_org_id());
CREATE POLICY "org update" ON public.tasks FOR UPDATE TO authenticated USING (organization_id = public.current_org_id()) WITH CHECK (organization_id = public.current_org_id());
CREATE POLICY "org delete" ON public.tasks FOR DELETE TO authenticated USING (organization_id = public.current_org_id());
CREATE INDEX tasks_org_idx ON public.tasks(organization_id, status, due_at);
CREATE INDEX tasks_customer_idx ON public.tasks(customer_id);
