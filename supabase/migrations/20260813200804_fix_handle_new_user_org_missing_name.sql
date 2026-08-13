-- El trigger handle_new_user_org insertaba en public.profiles sin la columna
-- "name" (NOT NULL), lo que hacía fallar el registro de cualquier usuario nuevo
-- aunque el formulario de registro sí envía el nombre en raw_user_meta_data.
CREATE OR REPLACE FUNCTION public.handle_new_user_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _org uuid;
BEGIN
  INSERT INTO public.organizations (name, created_by)
    VALUES (COALESCE(NEW.raw_user_meta_data->>'salon_name', 'Mi Salón'), NEW.id)
    RETURNING id INTO _org;
  INSERT INTO public.user_roles (user_id, role, organization_id)
    VALUES (NEW.id, 'admin', _org)
    ON CONFLICT (user_id) DO UPDATE SET organization_id = EXCLUDED.organization_id, role = 'admin';
  INSERT INTO public.profiles (user_id, email, name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)))
    ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END
$function$;
