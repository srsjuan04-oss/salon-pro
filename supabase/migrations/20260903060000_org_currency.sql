-- El asistente de IA tenía "MXN" fijo en el prompt para todas las organizaciones,
-- sin importar en qué país esté el negocio (mismo problema que timezone antes de
-- 20260814280000_org_timezone.sql). Ahora cada organización guarda su propia
-- moneda (por defecto COP, para no cambiar el comportamiento de las empresas ya
-- existentes) y es configurable desde Configuración.
ALTER TABLE public.organizations
  ADD COLUMN currency text NOT NULL DEFAULT 'COP';
