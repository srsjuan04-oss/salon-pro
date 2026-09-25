-- Notificaciones push (Web Push) al celular del dueño y de cada barbero.
--
-- 1) La campanita deja de ser compartida por toda la organización:
--    - recipient_user_id NULL  -> aviso para admin/staff (ven todas las citas).
--    - recipient_user_id = uid -> aviso solo para ese barbero (sus citas).
--    Así un barbero no ve clientes de otros barberos y marcar como leído no
--    afecta a los demás.
-- 2) push_subscriptions guarda cada dispositivo que activó las notificaciones.
-- 3) Cada fila nueva en notifications llama a la función send-push vía pg_net.
--
-- Los secretos (push_webhook_secret, vapid_public_key, vapid_private_key) se
-- crean aparte con vault.create_secret para que nunca queden en el repo.

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS recipient_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS notifications_recipient_created_idx
  ON public.notifications (recipient_user_id, created_at DESC);

DROP POLICY IF EXISTS "org read" ON public.notifications;
DROP POLICY IF EXISTS "org update" ON public.notifications;

CREATE POLICY "org read" ON public.notifications FOR SELECT TO authenticated
  USING (
    organization_id = public.current_org_id()
    AND CASE WHEN public.current_role_name() = 'barber'
      THEN recipient_user_id = auth.uid()
      ELSE recipient_user_id IS NULL
    END
  );

CREATE POLICY "org update" ON public.notifications FOR UPDATE TO authenticated
  USING (
    organization_id = public.current_org_id()
    AND CASE WHEN public.current_role_name() = 'barber'
      THEN recipient_user_id = auth.uid()
      ELSE recipient_user_id IS NULL
    END
  )
  WITH CHECK (organization_id = public.current_org_id());

CREATE OR REPLACE FUNCTION public.notify_on_appointment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _prefs record;
  _customer_name text;
  _service_name text;
  _when text;
  _barber_user_id uuid;
  _type text;
  _title text;
  _message text;
BEGIN
  SELECT new_appointments, cancellations INTO _prefs
  FROM public.notification_preferences WHERE organization_id = NEW.organization_id;

  SELECT c.name INTO _customer_name FROM public.customers c WHERE c.id = NEW.customer_id;
  SELECT s.name INTO _service_name FROM public.services s WHERE s.id = NEW.service_id;
  SELECT b.user_id INTO _barber_user_id FROM public.barbers b WHERE b.id = NEW.barber_id;
  _when := to_char(NEW.appointment_date, 'DD/MM/YYYY') || ' ' || to_char(NEW.start_time, 'HH24:MI');

  IF TG_OP = 'INSERT' AND COALESCE(_prefs.new_appointments, true) THEN
    _type := 'new_appointment';
    _title := 'Nueva cita agendada';
    _message := COALESCE(_customer_name, 'Un cliente') || ' agendó ' || COALESCE(_service_name, 'una cita') || ' para el ' || _when;
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled'
    AND COALESCE(_prefs.cancellations, true) THEN
    _type := 'cancellation';
    _title := 'Cita cancelada';
    _message := COALESCE(_customer_name, 'Un cliente') || ' canceló ' || COALESCE(_service_name, 'su cita') || ' del ' || _when;
  ELSE
    RETURN NEW;
  END IF;

  -- Aviso para admin/staff.
  INSERT INTO public.notifications (organization_id, type, title, message, appointment_id)
  VALUES (NEW.organization_id, _type, _title, _message, NEW.id);

  -- Aviso propio para el barbero de la cita, si tiene cuenta de acceso.
  IF _barber_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (organization_id, type, title, message, appointment_id, recipient_user_id)
    VALUES (NEW.organization_id, _type, _title, _message, NEW.id, _barber_user_id);
  END IF;

  RETURN NEW;
END;
$function$;

-- Dispositivos suscritos a push.
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own read" ON public.push_subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

GRANT ALL ON public.push_subscriptions TO service_role;

-- Registrar/quitar el dispositivo actual. Va por RPC porque el mismo
-- navegador puede pasar de una cuenta a otra y el endpoint es único.
CREATE OR REPLACE FUNCTION public.register_push_subscription(
  _endpoint text, _p256dh text, _auth text, _user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _org uuid := public.current_org_id();
BEGIN
  IF auth.uid() IS NULL OR _org IS NULL THEN
    RAISE EXCEPTION 'Sesión inválida';
  END IF;

  INSERT INTO public.push_subscriptions (user_id, organization_id, endpoint, p256dh, auth, user_agent)
  VALUES (auth.uid(), _org, _endpoint, _p256dh, _auth, _user_agent)
  ON CONFLICT (endpoint) DO UPDATE
    SET user_id = EXCLUDED.user_id,
        organization_id = EXCLUDED.organization_id,
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        user_agent = EXCLUDED.user_agent,
        created_at = now();
END;
$function$;

CREATE OR REPLACE FUNCTION public.unregister_push_subscription(_endpoint text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  DELETE FROM public.push_subscriptions WHERE endpoint = _endpoint AND user_id = auth.uid();
$function$;

REVOKE ALL ON FUNCTION public.register_push_subscription(text, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.unregister_push_subscription(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_push_subscription(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unregister_push_subscription(text) TO authenticated;

-- Configuración de envío para la función send-push (solo service_role).
CREATE OR REPLACE FUNCTION public.get_push_config()
RETURNS TABLE (webhook_secret text, vapid_public_key text, vapid_private_key text)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'push_webhook_secret'),
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'vapid_public_key'),
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'vapid_private_key')
$function$;

REVOKE ALL ON FUNCTION public.get_push_config() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_push_config() TO service_role;

-- Cada aviso nuevo dispara el envío push (asíncrono, no bloquea la cita).
CREATE OR REPLACE FUNCTION public.dispatch_push_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM net.http_post(
    url := 'https://fswubvlwfihldajtmqky.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', coalesce(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'push_webhook_secret'),
        ''
      )
    ),
    body := jsonb_build_object('notification_id', NEW.id)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Un fallo del push nunca debe impedir que se guarde la cita.
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS dispatch_push_notification_trg ON public.notifications;
CREATE TRIGGER dispatch_push_notification_trg
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.dispatch_push_notification();
