-- Prueba gratis de 15 días + cancelación diferida al fin del periodo pagado.
--
-- Flujo: /planes ya no cobra nada al registrarse — solo tokeniza el medio de
-- pago y crea la suscripción en estado 'trialing' con next_charge_date = hoy
-- + 15 días. El cron diario (wompi-charge-subscriptions) es quien hace el
-- primer cobro real ese día (mensualidad + implementación juntas). Si el
-- negocio cancela antes, cancel_at_period_end queda en true y ese mismo día,
-- en vez de cobrar, el cron suspende la suscripción (status='canceled') sin
-- mover dinero.

ALTER TABLE public.organization_subscriptions
  DROP CONSTRAINT IF EXISTS organization_subscriptions_status_check;
ALTER TABLE public.organization_subscriptions
  ADD CONSTRAINT organization_subscriptions_status_check
  CHECK (status IN ('trialing', 'pending_payment', 'active', 'past_due', 'canceled'));

ALTER TABLE public.organization_subscriptions
  ADD COLUMN cancel_at_period_end boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.organization_subscriptions.cancel_at_period_end IS 'true = no renovar. El negocio conserva acceso hasta next_charge_date; ese día el cron suspende (status=canceled) en vez de cobrar.';

-- Cancela (o marca para no renovar) la suscripción de una organización.
-- Autorizado para el admin de plataforma, o para un admin de ESA organización.
CREATE OR REPLACE FUNCTION public.cancel_organization_subscription(p_organization_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (
    public.is_platform_admin()
    OR (
      p_organization_id = public.current_org_id()
      AND EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin' AND organization_id = p_organization_id
      )
    )
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  UPDATE public.organization_subscriptions
  SET cancel_at_period_end = true, updated_at = now()
  WHERE organization_id = p_organization_id;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.cancel_organization_subscription(uuid) TO authenticated;

-- Revierte una cancelación pendiente (antes de que se haga efectiva).
CREATE OR REPLACE FUNCTION public.reactivate_organization_subscription(p_organization_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (
    public.is_platform_admin()
    OR (
      p_organization_id = public.current_org_id()
      AND EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin' AND organization_id = p_organization_id
      )
    )
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  UPDATE public.organization_subscriptions
  SET cancel_at_period_end = false, updated_at = now()
  WHERE organization_id = p_organization_id AND status <> 'canceled';
END;
$function$;
GRANT EXECUTE ON FUNCTION public.reactivate_organization_subscription(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.get_my_subscription();
CREATE OR REPLACE FUNCTION public.get_my_subscription()
RETURNS TABLE (
  plan_code text,
  plan_name text,
  amount_in_cents bigint,
  status text,
  next_charge_date date,
  cancel_at_period_end boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT os.plan_code, sp.name, os.amount_in_cents, os.status, os.next_charge_date, os.cancel_at_period_end
  FROM public.organization_subscriptions os
  JOIN public.subscription_plans sp ON sp.code = os.plan_code
  WHERE os.organization_id = public.current_org_id();
$function$;

DROP FUNCTION IF EXISTS public.get_platform_subscriptions();
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
  cancel_at_period_end boolean,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    os.id, os.organization_id, o.name, os.plan_code, sp.name,
    os.amount_in_cents, os.status, os.payment_source_type,
    os.next_charge_date, os.failed_attempts, os.cancel_at_period_end, os.updated_at
  FROM public.organization_subscriptions os
  JOIN public.organizations o ON o.id = os.organization_id
  JOIN public.subscription_plans sp ON sp.code = os.plan_code
  WHERE public.is_platform_admin()
  ORDER BY os.updated_at DESC;
$function$;
