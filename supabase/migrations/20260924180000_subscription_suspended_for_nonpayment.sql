-- Suspensión por falta de pago.
--
-- Si el cobro de una suscripción no se hace efectivo dentro de los días de
-- gracia (ver GRACE_DAYS en wompi-charge-subscriptions), el cron la pasa a
-- 'suspended': se pausa el acceso a la app, pero se sigue intentando cobrar
-- cada día y, si un cobro se aprueba, el webhook la reactiva sola. Es distinto
-- de 'canceled' (el negocio pidió no renovar, o se agotaron los reintentos).

ALTER TABLE public.organization_subscriptions
  DROP CONSTRAINT IF EXISTS organization_subscriptions_status_check;
ALTER TABLE public.organization_subscriptions
  ADD CONSTRAINT organization_subscriptions_status_check
  CHECK (status IN ('trialing', 'pending_payment', 'active', 'past_due', 'suspended', 'canceled'));

-- retowpp solo distingue vigente / 'canceled': una suspensión por falta de
-- pago también debe suspender la empresa allá.
CREATE OR REPLACE FUNCTION public.notify_retowpp_subscription_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://chat.charliacrm.com/api/integrations/salonpro/status',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-provisioning-secret', coalesce(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'retowpp_provisioning_secret'),
        ''
      )
    ),
    body := jsonb_build_object(
      'organization_id', NEW.organization_id,
      'status', CASE WHEN NEW.status = 'suspended' THEN 'canceled' ELSE NEW.status END
    )
  );
  RETURN NEW;
END;
$function$;
