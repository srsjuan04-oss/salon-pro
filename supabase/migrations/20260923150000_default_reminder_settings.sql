-- Las organizaciones nuevas no recibían filas en reminder_settings (el seed original solo
-- creó las de la primera organización), así que en Configuración → Gestor de WhatsApp el
-- apartado de recordatorios salía vacío y no había dónde asignar un webhook o un flow.
-- Se crean los dos recordatorios por defecto (1 hora y 30 minutos antes), INACTIVOS: no se
-- envía nada hasta que el salón les asigne un destino y los encienda.
CREATE OR REPLACE FUNCTION public.seed_default_reminder_settings()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.reminder_settings (organization_id, reminder_type, minutes_before, active)
    VALUES (NEW.id, '60_min', 60, false), (NEW.id, '30_min', 30, false)
    ON CONFLICT (organization_id, reminder_type) DO NOTHING;
  RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS organizations_seed_reminder_settings ON public.organizations;
CREATE TRIGGER organizations_seed_reminder_settings
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.seed_default_reminder_settings();

-- Organizaciones existentes que se quedaron sin ellos.
INSERT INTO public.reminder_settings (organization_id, reminder_type, minutes_before, active)
SELECT o.id, d.reminder_type, d.minutes_before, false
FROM public.organizations o
CROSS JOIN (VALUES ('60_min', 60), ('30_min', 30)) AS d(reminder_type, minutes_before)
ON CONFLICT (organization_id, reminder_type) DO NOTHING;
