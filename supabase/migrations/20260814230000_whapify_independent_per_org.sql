-- Hace que la conexión de Whapify ("Gestor de WPP") sea independiente por
-- organización en vez de una sola cuenta global para toda la plataforma.
-- Antes: whapify_settings tenía una fila única (singleton), compartida por
-- todas las empresas. Ahora cada organización tiene su propia fila.
ALTER TABLE public.whapify_settings DROP CONSTRAINT whapify_settings_singleton_key;
ALTER TABLE public.whapify_settings DROP COLUMN singleton;
ALTER TABLE public.whapify_settings ADD CONSTRAINT whapify_settings_organization_id_key UNIQUE (organization_id);

-- reminder_settings tenía reminder_type como único global, lo que impedía
-- que dos organizaciones configuraran, por ejemplo, ambas un recordatorio
-- "confirmation". Ahora es único por organización.
ALTER TABLE public.reminder_settings DROP CONSTRAINT reminder_settings_reminder_type_key;
ALTER TABLE public.reminder_settings ADD CONSTRAINT reminder_settings_org_reminder_type_key UNIQUE (organization_id, reminder_type);
