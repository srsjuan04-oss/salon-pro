-- Al crear la primera cita (o cualquier cita nueva) de un cliente, lo mueve automáticamente
-- a la etapa "Cliente activo" del pipeline, sin importar si la cita se creó desde el
-- Calendario o desde el asistente de WhatsApp (cualquier camino que inserte en appointments).

CREATE OR REPLACE FUNCTION public.advance_customer_to_active_on_appointment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE _active_stage uuid;
BEGIN
  SELECT id INTO _active_stage FROM public.pipeline_stages
  WHERE organization_id = NEW.organization_id AND name = 'Cliente activo'
  LIMIT 1;

  IF _active_stage IS NOT NULL THEN
    UPDATE public.customers
    SET pipeline_stage_id = _active_stage
    WHERE id = NEW.customer_id
      AND organization_id = NEW.organization_id
      AND pipeline_stage_id IS DISTINCT FROM _active_stage;
  END IF;

  RETURN NEW;
END $fn$;

CREATE TRIGGER advance_pipeline_on_appointment_trg AFTER INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.advance_customer_to_active_on_appointment();
