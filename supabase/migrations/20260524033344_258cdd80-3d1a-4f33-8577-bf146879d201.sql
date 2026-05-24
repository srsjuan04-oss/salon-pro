CREATE TABLE public.schedule_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  day_start TIME NOT NULL DEFAULT '10:00',
  day_end TIME NOT NULL DEFAULT '20:00',
  slot_minutes INTEGER NOT NULL DEFAULT 40 CHECK (slot_minutes > 0 AND slot_minutes <= 240),
  singleton BOOLEAN NOT NULL DEFAULT true UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.schedule_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read schedule_settings"
  ON public.schedule_settings FOR SELECT TO authenticated
  USING (public.is_authenticated_staff());

CREATE POLICY "Staff can insert schedule_settings"
  ON public.schedule_settings FOR INSERT TO authenticated
  WITH CHECK (public.is_authenticated_staff());

CREATE POLICY "Staff can update schedule_settings"
  ON public.schedule_settings FOR UPDATE TO authenticated
  USING (public.is_authenticated_staff());

CREATE POLICY "Service role can read schedule_settings"
  ON public.schedule_settings FOR SELECT TO service_role
  USING (true);

CREATE TRIGGER update_schedule_settings_updated_at
  BEFORE UPDATE ON public.schedule_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.schedule_settings (day_start, day_end, slot_minutes) VALUES ('10:00', '20:00', 40);