-- El pipeline de ventas y el reporte de clientes adquiridos se decidieron mover a
-- reto-whatsapp (donde viven los contactos/conversaciones), para no duplicar el concepto
-- en dos plataformas. Se revierte lo agregado en 20260903000000_crm_pipeline_tags_payments_tasks.sql
-- para ese punto específico (tags/customer_payments/tasks se quedan, esos sí siguen en salon-pro).

ALTER TABLE public.customers DROP COLUMN IF EXISTS pipeline_stage_id;

DROP TRIGGER IF EXISTS seed_pipeline_stages_trg ON public.organizations;
DROP FUNCTION IF EXISTS public.seed_default_pipeline_stages();
DROP TABLE IF EXISTS public.pipeline_stages;
