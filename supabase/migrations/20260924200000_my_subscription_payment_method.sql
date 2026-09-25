-- "Mi plan" muestra con qué medio de pago se cobra la suscripción, para que el
-- negocio sepa cuál está actualizando (wompi-update-payment-method).
DROP FUNCTION IF EXISTS public.get_my_subscription();
CREATE OR REPLACE FUNCTION public.get_my_subscription()
RETURNS TABLE (
  plan_code text,
  plan_name text,
  amount_in_cents bigint,
  status text,
  next_charge_date date,
  cancel_at_period_end boolean,
  payment_source_type text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT os.plan_code, sp.name, os.amount_in_cents, os.status, os.next_charge_date, os.cancel_at_period_end,
    os.payment_source_type
  FROM public.organization_subscriptions os
  JOIN public.subscription_plans sp ON sp.code = os.plan_code
  WHERE os.organization_id = public.current_org_id();
$function$;
GRANT EXECUTE ON FUNCTION public.get_my_subscription() TO authenticated;
