-- Las tablas tags/customer_tags (Fase A) quedaron vacías y sin ninguna pantalla que las
-- use. Se eliminan como parte de la depuración; se pueden recrear fácilmente cuando se
-- construya la funcionalidad real de tags manuales.

DROP TABLE IF EXISTS public.customer_tags CASCADE;
DROP TABLE IF EXISTS public.tags CASCADE;
