-- Cuando cambia reminder_settings (flow de Whapify, minutos de anticipación o
-- si está activo), los appointment_reminders 'pending' ya generados quedaban
-- congelados con los valores viejos: send-appointment-reminders los enviaba
-- usando el whapify_flow_id que tenían guardado desde que se creó la cita, sin
-- volver a mirar la configuración actual. Aplicamos el mismo patrón que ya usa
-- el trigger de citas al reprogramar: cancelar los recordatorios pendientes y
-- regenerarlos desde cero con generate_appointment_reminders(), que sí lee la
-- configuración vigente.
CREATE OR REPLACE FUNCTION public.regenerate_reminders_on_settings_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _appt record;
BEGIN
  IF NEW.whapify_flow_id IS NOT DISTINCT FROM OLD.whapify_flow_id
     AND NEW.minutes_before IS NOT DISTINCT FROM OLD.minutes_before
     AND NEW.active IS NOT DISTINCT FROM OLD.active THEN
    RETURN NEW;
  END IF;

  -- Se cancelan TODOS los pendientes de la organización (no solo los del tipo
  -- que cambió) porque generate_appointment_reminders() recrea, por cita, un
  -- recordatorio por cada tipo activo a la vez; si solo canceláramos el tipo
  -- modificado terminaríamos con un duplicado pendiente para los tipos que no
  -- cambiaron.
  UPDATE public.appointment_reminders
    SET status = 'cancelled'
    WHERE organization_id = NEW.organization_id
      AND status = 'pending';

  FOR _appt IN
    SELECT id FROM public.appointments
    WHERE organization_id = NEW.organization_id AND status <> 'cancelled'
  LOOP
    PERFORM public.generate_appointment_reminders(_appt.id);
  END LOOP;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_reminder_settings_regenerate ON public.reminder_settings;
CREATE TRIGGER trg_reminder_settings_regenerate
  AFTER UPDATE ON public.reminder_settings
  FOR EACH ROW EXECUTE FUNCTION public.regenerate_reminders_on_settings_change();
