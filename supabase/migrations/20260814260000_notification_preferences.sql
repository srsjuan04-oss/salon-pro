-- Las preferencias de notificación en Configuración eran puramente visuales
-- (defaultChecked sin estado ni persistencia). Se agrega una fila por
-- organización para guardarlas de verdad. Todavía no disparan ninguna
-- notificación real; es la base para eso.
CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  new_appointments boolean NOT NULL DEFAULT true,
  cancellations boolean NOT NULL DEFAULT true,
  reminders boolean NOT NULL DEFAULT true,
  daily_summary boolean NOT NULL DEFAULT false,
  whatsapp_messages boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_org_id_trg BEFORE INSERT ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_org_id();

CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "org read" ON public.notification_preferences FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());
CREATE POLICY "org insert" ON public.notification_preferences FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_org_id());
CREATE POLICY "org update" ON public.notification_preferences FOR UPDATE TO authenticated
  USING (organization_id = public.current_org_id()) WITH CHECK (organization_id = public.current_org_id());
