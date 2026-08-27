-- Vincula una ficha de public.barbers con una cuenta de acceso real (auth.users),
-- para que un barbero pueda iniciar sesión y ver únicamente sus propias citas.
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS user_id uuid UNIQUE REFERENCES auth.users(id);

CREATE OR REPLACE FUNCTION public.current_role_name()
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1
$function$;

-- Un barbero solo puede LEER sus propias citas (las de su fila en barbers.user_id).
-- El resto de roles (admin/staff) no se ven afectados: la política existente
-- "org read" sigue permitiéndoles ver todas las citas de la organización.
CREATE POLICY "barber reads only own appointments" ON public.appointments
  AS RESTRICTIVE FOR SELECT
  USING (
    public.current_role_name() IS DISTINCT FROM 'barber'
    OR barber_id IN (SELECT id FROM public.barbers WHERE user_id = auth.uid())
  );

-- Un barbero no puede crear, editar ni cancelar citas: es una vista de solo lectura.
CREATE POLICY "barber cannot insert appointments" ON public.appointments
  AS RESTRICTIVE FOR INSERT
  WITH CHECK (public.current_role_name() IS DISTINCT FROM 'barber');

CREATE POLICY "barber cannot update appointments" ON public.appointments
  AS RESTRICTIVE FOR UPDATE
  USING (public.current_role_name() IS DISTINCT FROM 'barber');

CREATE POLICY "barber cannot delete appointments" ON public.appointments
  AS RESTRICTIVE FOR DELETE
  USING (public.current_role_name() IS DISTINCT FROM 'barber');
