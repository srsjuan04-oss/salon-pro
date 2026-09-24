-- WhatsApp de contacto del negocio, pedido en el checkout de /planes con selector de país.
-- Se guarda en formato internacional (ej. +573001234567).
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS contact_phone text;

CREATE OR REPLACE FUNCTION public.handle_new_user_org()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _org uuid;
BEGIN
  INSERT INTO public.organizations (name, created_by, contact_phone)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'salon_name', 'Mi Salón'),
      NEW.id,
      -- Solo se acepta formato +<dígitos>; cualquier otra cosa se descarta.
      CASE WHEN NEW.raw_user_meta_data->>'contact_phone' ~ '^\+[0-9]{8,15}$'
        THEN NEW.raw_user_meta_data->>'contact_phone' END
    )
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
