
-- 1) Whapify connection settings (singleton)
CREATE TABLE public.whapify_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  whapify_token text,
  is_active boolean NOT NULL DEFAULT false,
  last_validated_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.whapify_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read whapify_settings" ON public.whapify_settings FOR SELECT TO authenticated USING (is_authenticated_staff());
CREATE POLICY "Staff insert whapify_settings" ON public.whapify_settings FOR INSERT TO authenticated WITH CHECK (is_authenticated_staff());
CREATE POLICY "Staff update whapify_settings" ON public.whapify_settings FOR UPDATE TO authenticated USING (is_authenticated_staff());
CREATE POLICY "Service read whapify_settings" ON public.whapify_settings FOR SELECT TO service_role USING (true);
CREATE POLICY "Service update whapify_settings" ON public.whapify_settings FOR UPDATE TO service_role USING (true);
CREATE TRIGGER trg_whapify_settings_updated BEFORE UPDATE ON public.whapify_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Whapify flows catalog
CREATE TABLE public.whapify_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id text NOT NULL UNIQUE,
  flow_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  raw_data jsonb,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.whapify_flows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read whapify_flows" ON public.whapify_flows FOR SELECT TO authenticated USING (is_authenticated_staff());
CREATE POLICY "Staff write whapify_flows" ON public.whapify_flows FOR ALL TO authenticated USING (is_authenticated_staff()) WITH CHECK (is_authenticated_staff());
CREATE POLICY "Service read whapify_flows" ON public.whapify_flows FOR SELECT TO service_role USING (true);
CREATE POLICY "Service write whapify_flows" ON public.whapify_flows FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE TRIGGER trg_whapify_flows_updated BEFORE UPDATE ON public.whapify_flows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Reminder settings (one row per reminder_type)
CREATE TABLE public.reminder_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_type text NOT NULL UNIQUE,
  minutes_before integer NOT NULL,
  channel text NOT NULL DEFAULT 'whapify',
  whapify_flow_id text,
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reminder_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read reminder_settings" ON public.reminder_settings FOR SELECT TO authenticated USING (is_authenticated_staff());
CREATE POLICY "Staff write reminder_settings" ON public.reminder_settings FOR ALL TO authenticated USING (is_authenticated_staff()) WITH CHECK (is_authenticated_staff());
CREATE POLICY "Service read reminder_settings" ON public.reminder_settings FOR SELECT TO service_role USING (true);
CREATE TRIGGER trg_reminder_settings_updated BEFORE UPDATE ON public.reminder_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.reminder_settings (reminder_type, minutes_before, channel, active) VALUES
  ('60_min', 60, 'whapify', false),
  ('30_min', 30, 'whapify', false);

-- 4) Appointment reminders queue
CREATE TABLE public.appointment_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  customer_phone text NOT NULL,
  customer_name text,
  reminder_type text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  whapify_flow_id text,
  sent_at timestamptz,
  error_message text,
  whapify_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_app_rem_status_sched ON public.appointment_reminders (status, scheduled_at);
CREATE INDEX idx_app_rem_appointment ON public.appointment_reminders (appointment_id);

ALTER TABLE public.appointment_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read appointment_reminders" ON public.appointment_reminders FOR SELECT TO authenticated USING (is_authenticated_staff());
CREATE POLICY "Staff write appointment_reminders" ON public.appointment_reminders FOR ALL TO authenticated USING (is_authenticated_staff()) WITH CHECK (is_authenticated_staff());
CREATE POLICY "Service all appointment_reminders" ON public.appointment_reminders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE TRIGGER trg_app_rem_updated BEFORE UPDATE ON public.appointment_reminders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
