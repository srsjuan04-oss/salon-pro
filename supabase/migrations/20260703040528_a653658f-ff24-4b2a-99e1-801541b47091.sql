
-- 1. ORGANIZATIONS
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Mi Salón',
  created_by uuid,
  mcp_token text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex') UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_roles ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

DO $seed$
DECLARE
  _admin uuid := 'bff552b2-678a-4fa1-bc14-4d0c2a86f182';
  _org uuid;
BEGIN
  INSERT INTO public.organizations (name, created_by) VALUES ('Salón Principal', _admin) RETURNING id INTO _org;
  UPDATE public.user_roles SET organization_id = _org WHERE user_id = _admin;
END $seed$;

ALTER TABLE public.user_roles ALTER COLUMN organization_id SET NOT NULL;
CREATE UNIQUE INDEX user_roles_user_unique ON public.user_roles(user_id);

CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE POLICY "members read own org" ON public.organizations FOR SELECT TO authenticated
  USING (id = public.current_org_id());
CREATE POLICY "admin updates own org" ON public.organizations FOR UPDATE TO authenticated
  USING (id = public.current_org_id() AND public.has_role(auth.uid(), 'admin'));

-- 2. Auto-create org for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE _org uuid;
BEGIN
  INSERT INTO public.organizations (name, created_by)
    VALUES (COALESCE(NEW.raw_user_meta_data->>'salon_name', 'Mi Salón'), NEW.id)
    RETURNING id INTO _org;
  INSERT INTO public.user_roles (user_id, role, organization_id)
    VALUES (NEW.id, 'admin', _org)
    ON CONFLICT (user_id) DO UPDATE SET organization_id = EXCLUDED.organization_id, role = 'admin';
  INSERT INTO public.profiles (user_id, email)
    VALUES (NEW.id, NEW.email)
    ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS on_auth_user_created_org ON auth.users;
CREATE TRIGGER on_auth_user_created_org AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_org();

-- 3. Auto-fill organization_id on insert
CREATE OR REPLACE FUNCTION public.set_org_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := public.current_org_id();
  END IF;
  IF NEW.organization_id IS NULL THEN
    RAISE EXCEPTION 'organization_id required';
  END IF;
  RETURN NEW;
END $fn$;

-- 4. Add organization_id + backfill + NOT NULL + index for every domain table
DO $bf$
DECLARE
  _org uuid;
  _t text;
  _tables text[] := ARRAY[
    'barbers','customers','services','appointments','expenses','sales_entries',
    'financial_imports','schedule_settings','reminder_settings','whapify_settings',
    'whapify_flows','whatsapp_templates','whatsapp_conversations','whatsapp_messages',
    'notification_flows','sent_notifications','appointment_reminders','barber_schedules'
  ];
BEGIN
  SELECT id INTO _org FROM public.organizations WHERE created_by = 'bff552b2-678a-4fa1-bc14-4d0c2a86f182' LIMIT 1;
  FOREACH _t IN ARRAY _tables LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE', _t);
    EXECUTE format('UPDATE public.%I SET organization_id = %L WHERE organization_id IS NULL', _t, _org);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN organization_id SET NOT NULL', _t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(organization_id)', _t || '_org_idx', _t);
  END LOOP;
END $bf$;

-- 5. Drop all existing policies on affected tables
DO $dp$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname='public' AND tablename IN (
      'barbers','customers','services','appointments','expenses','sales_entries',
      'financial_imports','schedule_settings','reminder_settings','whapify_settings',
      'whapify_flows','whatsapp_templates','whatsapp_conversations','whatsapp_messages',
      'notification_flows','sent_notifications','appointment_reminders','barber_schedules',
      'profiles','user_roles'
    )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $dp$;

-- 6. Attach set_org_id trigger + create org-scoped policies
DO $pol$
DECLARE
  _t text;
  _tables text[] := ARRAY[
    'barbers','customers','services','appointments','expenses','sales_entries',
    'financial_imports','schedule_settings','reminder_settings','whapify_settings',
    'whapify_flows','whatsapp_templates','whatsapp_conversations','whatsapp_messages',
    'notification_flows','sent_notifications','appointment_reminders','barber_schedules'
  ];
BEGIN
  FOREACH _t IN ARRAY _tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_org_id_trg ON public.%I', _t);
    EXECUTE format('CREATE TRIGGER set_org_id_trg BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_org_id()', _t);
    EXECUTE format('CREATE POLICY "org read" ON public.%I FOR SELECT TO authenticated USING (organization_id = public.current_org_id())', _t);
    EXECUTE format('CREATE POLICY "org insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_org_id())', _t);
    EXECUTE format('CREATE POLICY "org update" ON public.%I FOR UPDATE TO authenticated USING (organization_id = public.current_org_id()) WITH CHECK (organization_id = public.current_org_id())', _t);
    EXECUTE format('CREATE POLICY "org delete" ON public.%I FOR DELETE TO authenticated USING (organization_id = public.current_org_id())', _t);
  END LOOP;
END $pol$;

-- 7. profiles + user_roles policies
CREATE POLICY "profiles self read" ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "profiles self insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_roles read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR organization_id = public.current_org_id());
CREATE POLICY "user_roles admin manage" ON public.user_roles FOR ALL TO authenticated
  USING (organization_id = public.current_org_id() AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (organization_id = public.current_org_id() AND public.has_role(auth.uid(), 'admin'));

-- 8. Update reminders function to scope by org
CREATE OR REPLACE FUNCTION public.generate_appointment_reminders(_appointment_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  _appt record; _customer record; _settings record; _scheduled_at timestamptz;
BEGIN
  SELECT * INTO _appt FROM public.appointments WHERE id = _appointment_id;
  IF NOT FOUND OR _appt.status = 'cancelled' THEN RETURN; END IF;
  SELECT * INTO _customer FROM public.customers WHERE id = _appt.customer_id;
  IF NOT FOUND OR _customer.phone IS NULL OR _customer.phone = '' THEN RETURN; END IF;
  FOR _settings IN
    SELECT * FROM public.reminder_settings
    WHERE active = true AND whapify_flow_id IS NOT NULL AND whapify_flow_id <> ''
      AND organization_id = _appt.organization_id
  LOOP
    _scheduled_at := ((_appt.appointment_date::timestamp + _appt.start_time::time) AT TIME ZONE 'America/Bogota')
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
END $fn$;
