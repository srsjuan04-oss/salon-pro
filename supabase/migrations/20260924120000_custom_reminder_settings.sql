-- Recordatorios personalizados: el salón puede crear los que quiera (24 horas antes,
-- 2 días antes, etc.) en vez de estar limitado a los dos por defecto de 60 y 30 minutos.
-- reminder_type sigue siendo único por organización y se deriva de los minutos
-- ('1440_min'), así que no puede haber dos recordatorios con la misma anticipación.

-- Entre 1 minuto y 30 días.
ALTER TABLE public.reminder_settings
  ADD CONSTRAINT reminder_settings_minutes_before_range CHECK (minutes_before BETWEEN 1 AND 43200);

-- generate_appointment_reminders solo agendaba recordatorios con whapify_flow_id, así que
-- uno configurado únicamente con el webhook de Chat CharlIA nunca se generaba (solo
-- funcionaba en salones que además tenían un flow de Whapify asignado).
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
    WHERE active = true
      AND (NULLIF(whapify_flow_id, '') IS NOT NULL OR NULLIF(webhook_url, '') IS NOT NULL)
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

-- El trigger de regeneración ahora también reacciona a recordatorios creados o borrados
-- (antes solo a UPDATE) y a cambios de webhook_url, que ahora cuenta como destino válido.
CREATE OR REPLACE FUNCTION public.regenerate_reminders_on_settings_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _appt record; _org_id uuid;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.whapify_flow_id IS NOT DISTINCT FROM OLD.whapify_flow_id
     AND NEW.webhook_url IS NOT DISTINCT FROM OLD.webhook_url
     AND NEW.minutes_before IS NOT DISTINCT FROM OLD.minutes_before
     AND NEW.active IS NOT DISTINCT FROM OLD.active THEN
    RETURN NEW;
  END IF;

  _org_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.organization_id ELSE NEW.organization_id END;

  -- Se cancelan TODOS los pendientes de la organización (no solo los del tipo
  -- que cambió) porque generate_appointment_reminders() recrea, por cita, un
  -- recordatorio por cada tipo activo a la vez.
  UPDATE public.appointment_reminders
    SET status = 'cancelled'
    WHERE organization_id = _org_id
      AND status = 'pending';

  FOR _appt IN
    SELECT id FROM public.appointments
    WHERE organization_id = _org_id AND status <> 'cancelled'
  LOOP
    PERFORM public.generate_appointment_reminders(_appt.id);
  END LOOP;

  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_reminder_settings_regenerate ON public.reminder_settings;
CREATE TRIGGER trg_reminder_settings_regenerate
  AFTER INSERT OR UPDATE OR DELETE ON public.reminder_settings
  FOR EACH ROW EXECUTE FUNCTION public.regenerate_reminders_on_settings_change();
