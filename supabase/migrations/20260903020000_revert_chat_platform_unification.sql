-- Revierte la migración 20260903010000_chat_platform_unification.sql.
-- Decisión: CRM (salon-pro) y Chat (reto-whatsapp) siguen siendo dos plataformas con bases de
-- datos separadas. Lo que se necesita no es fusionar los datos de negocio, sino que ambas
-- compartan identidad de usuario (login único) — eso se resuelve aparte, sin tocar estas tablas.
-- reto-whatsapp nunca fue modificado por la migración original, así que no hay nada que revertir allá.

DROP TABLE IF EXISTS public.chat_hotmart_webhook_events CASCADE;
DROP TABLE IF EXISTS public.chat_hotmart_webhooks CASCADE;
DROP TABLE IF EXISTS public.chat_contact_imports CASCADE;
DROP TABLE IF EXISTS public.chat_custom_field_definitions CASCADE;
DROP TABLE IF EXISTS public.chat_flow_runs CASCADE;
DROP TABLE IF EXISTS public.chat_flow_branches CASCADE;
DROP TABLE IF EXISTS public.chat_flow_steps CASCADE;
DROP TABLE IF EXISTS public.chat_flows CASCADE;
DROP TABLE IF EXISTS public.chat_campaign_batches CASCADE;
DROP TABLE IF EXISTS public.chat_campaign_recipients CASCADE;
DROP TABLE IF EXISTS public.chat_campaigns CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.chat_conversations CASCADE;
DROP TABLE IF EXISTS public.chat_templates CASCADE;
DROP TABLE IF EXISTS public.chat_phone_numbers CASCADE;
DROP TABLE IF EXISTS public.chat_waba_accounts CASCADE;

DELETE FROM public.tags WHERE id IN ('ab80cda6-2434-4a5b-9fae-9cae3d136279','e456cd54-435b-4033-81ef-7ddae3a6e381');

DELETE FROM public.customers WHERE wa_id IN (
  '573009998877','573001112233','573004445566','573001112299','573009911223',
  '573000000199','573001234567','573152333333','573000000399','573000000488',
  '573000000599','573162708405'
);

ALTER TABLE public.customers
  DROP COLUMN IF EXISTS wa_id,
  DROP COLUMN IF EXISTS consent_status,
  DROP COLUMN IF EXISTS consent_source;
