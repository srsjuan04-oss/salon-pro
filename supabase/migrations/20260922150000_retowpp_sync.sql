-- Sincronización con retowpp (Chat CharlIA, módulo de WhatsApp).
--
-- 1) Alta: wompi-create-subscription crea en retowpp la misma cuenta (correo + contraseña
--    del checkout) y deja acá el resultado, para ver en qué organizaciones falló y
--    reintentar o darlas de alta a mano. Valores de retowpp_status: created,
--    already_provisioned, email_exists (el correo ya tenía cuenta allá; no se toca),
--    not_configured, no_password, error.
ALTER TABLE public.organization_subscriptions
  ADD COLUMN retowpp_status text,
  ADD COLUMN retowpp_error text,
  ADD COLUMN retowpp_synced_at timestamptz;

-- 2) Estado: cada vez que cambia el estado de la suscripción (cron de cobro, webhook de
--    Wompi, cancelación desde el panel) se le avisa a retowpp, que suspende la empresa si
--    queda 'canceled' y la reactiva si vuelve a estar vigente. Va en un trigger para cubrir
--    todos los caminos que cambian el estado sin tener que acordarse en cada uno. Mismo
--    patrón que el cron de cobro: pg_net + secreto compartido en Vault
--    ('retowpp_provisioning_secret', creado aparte — nunca en texto plano en el repo).
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
    body := jsonb_build_object('organization_id', NEW.organization_id, 'status', NEW.status)
  );
  RETURN NEW;
END;
$function$;

CREATE TRIGGER organization_subscriptions_notify_retowpp
  AFTER INSERT OR UPDATE OF status ON public.organization_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.notify_retowpp_subscription_status();
