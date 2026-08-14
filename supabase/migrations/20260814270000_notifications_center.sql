-- Centro de notificaciones real: cuando se crea o cancela una cita, se
-- inserta una notificación (si la organización tiene esa preferencia
-- activada en notification_preferences) que la campanita del header
-- muestra con contador de no leídas.
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type = ANY (ARRAY['new_appointment', 'cancellation'])),
  title text NOT NULL,
  message text NOT NULL,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_org_created_idx ON public.notifications (organization_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org read" ON public.notifications FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());
CREATE POLICY "org update" ON public.notifications FOR UPDATE TO authenticated
  USING (organization_id = public.current_org_id()) WITH CHECK (organization_id = public.current_org_id());

GRANT ALL ON public.notifications TO service_role;

-- Dispara la notificación desde la propia base de datos (en vez de cada
-- código que crea/cancela una cita) para que funcione sin importar si la
-- cita viene del calendario, del asistente de WhatsApp o de donde sea.
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
BEGIN
  SELECT new_appointments, cancellations INTO _prefs
  FROM public.notification_preferences WHERE organization_id = NEW.organization_id;

  SELECT c.name INTO _customer_name FROM public.customers c WHERE c.id = NEW.customer_id;
  SELECT s.name INTO _service_name FROM public.services s WHERE s.id = NEW.service_id;
  _when := to_char(NEW.appointment_date, 'DD/MM/YYYY') || ' ' || to_char(NEW.start_time, 'HH24:MI');

  IF TG_OP = 'INSERT' THEN
    IF COALESCE(_prefs.new_appointments, true) THEN
      INSERT INTO public.notifications (organization_id, type, title, message, appointment_id)
      VALUES (
        NEW.organization_id,
        'new_appointment',
        'Nueva cita agendada',
        COALESCE(_customer_name, 'Un cliente') || ' agendó ' || COALESCE(_service_name, 'una cita') || ' para el ' || _when,
        NEW.id
      );
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    IF COALESCE(_prefs.cancellations, true) THEN
      INSERT INTO public.notifications (organization_id, type, title, message, appointment_id)
      VALUES (
        NEW.organization_id,
        'cancellation',
        'Cita cancelada',
        COALESCE(_customer_name, 'Un cliente') || ' canceló ' || COALESCE(_service_name, 'su cita') || ' del ' || _when,
        NEW.id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER notify_on_appointment_change_trg
  AFTER INSERT OR UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_appointment_change();
