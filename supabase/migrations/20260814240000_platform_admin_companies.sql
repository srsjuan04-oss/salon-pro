-- Panel de propietario de la plataforma: permite a srsjuan (dueño del SaaS,
-- distinto de un "admin" de organización) crear empresas independientes y
-- ver un listado con estadísticas de todas ellas. Es un nivel por encima de
-- user_roles.role, que solo existe dentro del alcance de una organización.

CREATE TABLE public.platform_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
-- Sin políticas de SELECT/INSERT/etc: solo se lee a través de las funciones
-- SECURITY DEFINER de abajo, nunca directo desde el cliente.

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
$$;

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

INSERT INTO public.platform_admins (user_id)
VALUES ('6d6ce2e1-56c1-4a02-a387-8caf6e0f3455')
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_platform_organizations()
RETURNS TABLE (
  organization_id uuid,
  organization_name text,
  created_at timestamptz,
  admin_name text,
  admin_email text,
  users_count bigint,
  customers_count bigint,
  appointments_count bigint,
  appointments_last_30d bigint,
  sales_total numeric,
  is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.name,
    o.created_at,
    admin.name,
    admin.email,
    (SELECT count(*) FROM public.user_roles ur WHERE ur.organization_id = o.id),
    (SELECT count(*) FROM public.customers c WHERE c.organization_id = o.id),
    (SELECT count(*) FROM public.appointments a WHERE a.organization_id = o.id),
    (SELECT count(*) FROM public.appointments a WHERE a.organization_id = o.id AND a.created_at > now() - interval '30 days'),
    COALESCE((SELECT sum(s.amount) FROM public.sales_entries s WHERE s.organization_id = o.id), 0),
    EXISTS (
      SELECT 1 FROM public.appointments a2 WHERE a2.organization_id = o.id AND a2.created_at > now() - interval '30 days'
      UNION ALL
      SELECT 1 FROM public.sales_entries s2 WHERE s2.organization_id = o.id AND s2.created_at > now() - interval '30 days'
    )
  FROM public.organizations o
  LEFT JOIN LATERAL (
    SELECT p.name, p.email
    FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.organization_id = o.id AND ur.role = 'admin'
    ORDER BY ur.created_at ASC
    LIMIT 1
  ) admin ON true
  ORDER BY o.created_at DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_platform_organizations() TO authenticated;
