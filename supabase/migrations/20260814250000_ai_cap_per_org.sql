-- Permite que el propietario de la plataforma ajuste manualmente el tope
-- mensual de gasto en IA (Claude) de cada empresa, por ejemplo cuando un
-- cliente paga un plan más alto. Antes era un valor fijo ($10) igual para
-- todas las organizaciones.
ALTER TABLE public.organizations
  ADD COLUMN ai_monthly_cap_usd numeric NOT NULL DEFAULT 10 CHECK (ai_monthly_cap_usd >= 0);

CREATE OR REPLACE FUNCTION public.set_organization_ai_cap(org_id uuid, new_cap numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF new_cap < 0 THEN
    RAISE EXCEPTION 'new_cap must be >= 0';
  END IF;

  UPDATE public.organizations SET ai_monthly_cap_usd = new_cap WHERE id = org_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.set_organization_ai_cap(uuid, numeric) TO authenticated;

-- get_platform_organizations ahora también expone el tope de cada empresa
-- y cuánto ha gastado en IA en el mes en curso, para que el panel pueda
-- mostrarlo y permitir ajustarlo. El tipo de retorno cambió (columnas
-- nuevas), así que hay que recrear la función en vez de solo reemplazarla.
DROP FUNCTION public.get_platform_organizations();

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
  is_active boolean,
  ai_monthly_cap_usd numeric,
  ai_usage_this_month_usd numeric
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
    ),
    o.ai_monthly_cap_usd,
    COALESCE((
      SELECT sum(l.cost_usd) FROM public.ai_usage_log l
      WHERE l.organization_id = o.id AND l.created_at >= date_trunc('month', now())
    ), 0)
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
