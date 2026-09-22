-- Sistema de suscripciones y cobro recurrente (Wompi) para CharlIA.
-- Facturación de la plataforma a sus propios clientes (organizations), no
-- confundir con sales_entries (ventas de cada salón a SUS clientes).

CREATE TABLE public.subscription_plans (
  code text PRIMARY KEY,
  name text NOT NULL,
  amount_in_cents bigint NOT NULL CHECK (amount_in_cents > 0),
  currency text NOT NULL DEFAULT 'COP',
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0
);

INSERT INTO public.subscription_plans (code, name, amount_in_cents, sort_order) VALUES
  ('emprendedor', 'Emprendedor', 9900000, 1),
  ('negocio', 'Negocio', 19900000, 2),
  ('premium', 'Premium', 34900000, 3);

CREATE TABLE public.organization_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_code text NOT NULL REFERENCES public.subscription_plans(code),
  amount_in_cents bigint NOT NULL,
  status text NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment', 'active', 'past_due', 'canceled')),
  payment_source_type text NOT NULL CHECK (payment_source_type IN ('CARD', 'NEQUI', 'DAVIPLATA', 'BANCOLOMBIA_TRANSFER')),
  wompi_payment_source_id text,
  customer_email text NOT NULL,
  next_charge_date date,
  failed_attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.organization_subscriptions(id) ON DELETE CASCADE,
  wompi_transaction_id text UNIQUE,
  reference text NOT NULL UNIQUE,
  amount_in_cents bigint NOT NULL,
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'APPROVED', 'DECLINED', 'ERROR', 'VOIDED')),
  raw_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX subscription_payments_subscription_id_idx ON public.subscription_payments(subscription_id);
CREATE INDEX organization_subscriptions_next_charge_date_idx ON public.organization_subscriptions(next_charge_date)
  WHERE status IN ('active', 'past_due');

-- subscription_plans es catálogo público de solo lectura (se muestra en /planes
-- sin sesión), el resto queda cerrado por completo: ni siquiera el dueño de la
-- organización puede leer/escribir su propia suscripción desde el cliente.
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cualquiera puede ver los planes activos"
  ON public.subscription_plans FOR SELECT
  USING (active = true);

ALTER TABLE public.organization_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
-- Sin políticas para organization_subscriptions/subscription_payments: solo
-- accesibles vía funciones SECURITY DEFINER de abajo, o vía service_role
-- desde las edge functions (que ignoran RLS).

CREATE OR REPLACE FUNCTION public.get_platform_subscriptions()
RETURNS TABLE (
  subscription_id uuid,
  organization_id uuid,
  organization_name text,
  plan_code text,
  plan_name text,
  amount_in_cents bigint,
  status text,
  payment_source_type text,
  next_charge_date date,
  failed_attempts int,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    os.id, os.organization_id, o.name, os.plan_code, sp.name,
    os.amount_in_cents, os.status, os.payment_source_type,
    os.next_charge_date, os.failed_attempts, os.updated_at
  FROM public.organization_subscriptions os
  JOIN public.organizations o ON o.id = os.organization_id
  JOIN public.subscription_plans sp ON sp.code = os.plan_code
  WHERE public.is_platform_admin()
  ORDER BY os.updated_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_platform_subscriptions() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_subscription()
RETURNS TABLE (
  plan_code text,
  plan_name text,
  amount_in_cents bigint,
  status text,
  next_charge_date date
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT os.plan_code, sp.name, os.amount_in_cents, os.status, os.next_charge_date
  FROM public.organization_subscriptions os
  JOIN public.subscription_plans sp ON sp.code = os.plan_code
  WHERE os.organization_id = public.current_org_id();
$$;
GRANT EXECUTE ON FUNCTION public.get_my_subscription() TO authenticated;

COMMENT ON TABLE public.organization_subscriptions IS 'Suscripción de una organización (cliente de CharlIA) al plan de la plataforma. No confundir con sales_entries, que son las ventas de cada salón a SUS propios clientes.';
COMMENT ON TABLE public.subscription_payments IS 'Historial de intentos de cobro (Wompi) de una organization_subscription. raw_response guarda el payload del webhook para auditoría.';
