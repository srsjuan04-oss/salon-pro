-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE public.profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    name text NOT NULL,
    email text,
    avatar_url text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user is authenticated admin or staff
CREATE OR REPLACE FUNCTION public.is_authenticated_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'staff')
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- User roles policies (only admins can manage roles)
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Update existing table policies to require authentication

-- Appointments: staff can CRUD
DROP POLICY IF EXISTS "Allow public delete for appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow public insert for appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow public read for appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow public update for appointments" ON public.appointments;

CREATE POLICY "Staff can read appointments"
ON public.appointments FOR SELECT
TO authenticated
USING (public.is_authenticated_staff());

CREATE POLICY "Staff can insert appointments"
ON public.appointments FOR INSERT
TO authenticated
WITH CHECK (public.is_authenticated_staff());

CREATE POLICY "Staff can update appointments"
ON public.appointments FOR UPDATE
TO authenticated
USING (public.is_authenticated_staff());

CREATE POLICY "Staff can delete appointments"
ON public.appointments FOR DELETE
TO authenticated
USING (public.is_authenticated_staff());

-- Barbers: staff can CRUD
DROP POLICY IF EXISTS "Allow public delete for barbers" ON public.barbers;
DROP POLICY IF EXISTS "Allow public insert for barbers" ON public.barbers;
DROP POLICY IF EXISTS "Allow public read for barbers" ON public.barbers;
DROP POLICY IF EXISTS "Allow public update for barbers" ON public.barbers;

CREATE POLICY "Staff can read barbers"
ON public.barbers FOR SELECT
TO authenticated
USING (public.is_authenticated_staff());

CREATE POLICY "Staff can insert barbers"
ON public.barbers FOR INSERT
TO authenticated
WITH CHECK (public.is_authenticated_staff());

CREATE POLICY "Staff can update barbers"
ON public.barbers FOR UPDATE
TO authenticated
USING (public.is_authenticated_staff());

CREATE POLICY "Staff can delete barbers"
ON public.barbers FOR DELETE
TO authenticated
USING (public.is_authenticated_staff());

-- Barber schedules: staff can CRUD
DROP POLICY IF EXISTS "Allow public delete for barber_schedules" ON public.barber_schedules;
DROP POLICY IF EXISTS "Allow public insert for barber_schedules" ON public.barber_schedules;
DROP POLICY IF EXISTS "Allow public read for barber_schedules" ON public.barber_schedules;
DROP POLICY IF EXISTS "Allow public update for barber_schedules" ON public.barber_schedules;

CREATE POLICY "Staff can read barber_schedules"
ON public.barber_schedules FOR SELECT
TO authenticated
USING (public.is_authenticated_staff());

CREATE POLICY "Staff can insert barber_schedules"
ON public.barber_schedules FOR INSERT
TO authenticated
WITH CHECK (public.is_authenticated_staff());

CREATE POLICY "Staff can update barber_schedules"
ON public.barber_schedules FOR UPDATE
TO authenticated
USING (public.is_authenticated_staff());

CREATE POLICY "Staff can delete barber_schedules"
ON public.barber_schedules FOR DELETE
TO authenticated
USING (public.is_authenticated_staff());

-- Customers: staff can CRUD
DROP POLICY IF EXISTS "Allow public delete for customers" ON public.customers;
DROP POLICY IF EXISTS "Allow public insert for customers" ON public.customers;
DROP POLICY IF EXISTS "Allow public read for customers" ON public.customers;
DROP POLICY IF EXISTS "Allow public update for customers" ON public.customers;

CREATE POLICY "Staff can read customers"
ON public.customers FOR SELECT
TO authenticated
USING (public.is_authenticated_staff());

CREATE POLICY "Staff can insert customers"
ON public.customers FOR INSERT
TO authenticated
WITH CHECK (public.is_authenticated_staff());

CREATE POLICY "Staff can update customers"
ON public.customers FOR UPDATE
TO authenticated
USING (public.is_authenticated_staff());

CREATE POLICY "Staff can delete customers"
ON public.customers FOR DELETE
TO authenticated
USING (public.is_authenticated_staff());

-- Services: staff can CRUD
DROP POLICY IF EXISTS "Allow public delete for services" ON public.services;
DROP POLICY IF EXISTS "Allow public insert for services" ON public.services;
DROP POLICY IF EXISTS "Allow public read for services" ON public.services;
DROP POLICY IF EXISTS "Allow public update for services" ON public.services;

CREATE POLICY "Staff can read services"
ON public.services FOR SELECT
TO authenticated
USING (public.is_authenticated_staff());

CREATE POLICY "Staff can insert services"
ON public.services FOR INSERT
TO authenticated
WITH CHECK (public.is_authenticated_staff());

CREATE POLICY "Staff can update services"
ON public.services FOR UPDATE
TO authenticated
USING (public.is_authenticated_staff());

CREATE POLICY "Staff can delete services"
ON public.services FOR DELETE
TO authenticated
USING (public.is_authenticated_staff());

-- WhatsApp conversations: staff can CRUD
DROP POLICY IF EXISTS "Allow public delete for whatsapp_conversations" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "Allow public insert for whatsapp_conversations" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "Allow public read for whatsapp_conversations" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "Allow public update for whatsapp_conversations" ON public.whatsapp_conversations;

CREATE POLICY "Staff can read whatsapp_conversations"
ON public.whatsapp_conversations FOR SELECT
TO authenticated
USING (public.is_authenticated_staff());

CREATE POLICY "Staff can insert whatsapp_conversations"
ON public.whatsapp_conversations FOR INSERT
TO authenticated
WITH CHECK (public.is_authenticated_staff());

CREATE POLICY "Staff can update whatsapp_conversations"
ON public.whatsapp_conversations FOR UPDATE
TO authenticated
USING (public.is_authenticated_staff());

CREATE POLICY "Staff can delete whatsapp_conversations"
ON public.whatsapp_conversations FOR DELETE
TO authenticated
USING (public.is_authenticated_staff());

-- WhatsApp messages: staff can CRUD
DROP POLICY IF EXISTS "Allow public delete for whatsapp_messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Allow public insert for whatsapp_messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Allow public read for whatsapp_messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Allow public update for whatsapp_messages" ON public.whatsapp_messages;

CREATE POLICY "Staff can read whatsapp_messages"
ON public.whatsapp_messages FOR SELECT
TO authenticated
USING (public.is_authenticated_staff());

CREATE POLICY "Staff can insert whatsapp_messages"
ON public.whatsapp_messages FOR INSERT
TO authenticated
WITH CHECK (public.is_authenticated_staff());

CREATE POLICY "Staff can update whatsapp_messages"
ON public.whatsapp_messages FOR UPDATE
TO authenticated
USING (public.is_authenticated_staff());

CREATE POLICY "Staff can delete whatsapp_messages"
ON public.whatsapp_messages FOR DELETE
TO authenticated
USING (public.is_authenticated_staff());

-- Add policy for service role to bypass RLS (for edge functions)
CREATE POLICY "Service role can read all appointments"
ON public.appointments FOR SELECT
TO service_role
USING (true);

CREATE POLICY "Service role can insert appointments"
ON public.appointments FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can read all barbers"
ON public.barbers FOR SELECT
TO service_role
USING (true);

CREATE POLICY "Service role can read all services"
ON public.services FOR SELECT
TO service_role
USING (true);

CREATE POLICY "Service role can read all customers"
ON public.customers FOR SELECT
TO service_role
USING (true);

CREATE POLICY "Service role can insert customers"
ON public.customers FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can read whatsapp_conversations"
ON public.whatsapp_conversations FOR SELECT
TO service_role
USING (true);

CREATE POLICY "Service role can insert whatsapp_conversations"
ON public.whatsapp_conversations FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update whatsapp_conversations"
ON public.whatsapp_conversations FOR UPDATE
TO service_role
USING (true);

CREATE POLICY "Service role can read whatsapp_messages"
ON public.whatsapp_messages FOR SELECT
TO service_role
USING (true);

CREATE POLICY "Service role can insert whatsapp_messages"
ON public.whatsapp_messages FOR INSERT
TO service_role
WITH CHECK (true);

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();