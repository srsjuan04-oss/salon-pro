-- generate_appointment_reminders tenía America/Bogota fijo para TODAS las
-- organizaciones, sin importar en qué país esté el negocio. Ahora cada
-- organización guarda su propia zona horaria (por defecto Bogotá, para no
-- cambiar el comportamiento de las empresas ya existentes) y la función la
-- usa para calcular correctamente cuándo enviar el recordatorio.
ALTER TABLE public.organizations
  ADD COLUMN timezone text NOT NULL DEFAULT 'America/Bogota';

CREATE OR REPLACE FUNCTION public.generate_appointment_reminders(_appointment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _appt record; _customer record; _settings record; _org record; _scheduled_at timestamptz;
BEGIN
  SELECT * INTO _appt FROM public.appointments WHERE id = _appointment_id;
  IF NOT FOUND OR _appt.status = 'cancelled' THEN RETURN; END IF;
  SELECT * INTO _customer FROM public.customers WHERE id = _appt.customer_id;
  IF NOT FOUND OR _customer.phone IS NULL OR _customer.phone = '' THEN RETURN; END IF;
  SELECT * INTO _org FROM public.organizations WHERE id = _appt.organization_id;
  FOR _settings IN
    SELECT * FROM public.reminder_settings
    WHERE active = true AND whapify_flow_id IS NOT NULL AND whapify_flow_id <> ''
      AND organization_id = _appt.organization_id
  LOOP
    _scheduled_at := ((_appt.appointment_date::timestamp + _appt.start_time::time) AT TIME ZONE COALESCE(_org.timezone, 'America/Bogota'))
                     - make_interval(mins => _settings.minutes_before);
    IF _scheduled_at <= now() THEN CONTINUE; END IF;
    INSERT INTO public.appointment_reminders (
      appointment_id, customer_phone, customer_name,
      reminder_type, scheduled_at, status, whapify_flow_id, organization_id
    ) VALUES (
      _appt.id, _customer.phone, _customer.name,
      _settings.reminder_type, _scheduled_at, 'pending', _settings.whapify_flow_id, _appt.organization_id
    );
  END LOOP;
END $function$;
