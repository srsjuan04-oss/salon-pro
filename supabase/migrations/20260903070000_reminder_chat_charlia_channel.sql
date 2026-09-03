-- Permite que un recordatorio use el canal real de WhatsApp (Chat CharlIA /
-- reto-whatsapp, plantillas aprobadas por Meta) en vez de (o además de)
-- Whapify/Chatrace. webhook_url es la URL del endpoint de recordatorios de
-- Chat CharlIA para esa receta específica (contiene su propio id no
-- adivinable, no hace falta un token aparte — mismo modelo que whapify_flow_id).
ALTER TABLE public.reminder_settings
  ADD COLUMN webhook_url text;
