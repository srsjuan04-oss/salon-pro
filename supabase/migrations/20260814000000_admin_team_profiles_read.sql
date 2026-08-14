-- Permite a los administradores ver el nombre/email de todos los miembros
-- de su propia organización (no solo su propio perfil), para poder
-- gestionar el equipo desde Configuración > Cuentas.
CREATE POLICY "profiles org admin read" ON public.profiles FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = profiles.user_id
        AND ur.organization_id = public.current_org_id()
    )
  );
