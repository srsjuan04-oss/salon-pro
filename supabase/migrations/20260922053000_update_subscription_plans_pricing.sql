-- Actualiza precios y agrega contenido descriptivo a los planes para el
-- rediseño del checkout público (/planes). Las suscripciones ya activas no
-- se ven afectadas: organization_subscriptions.amount_in_cents es un
-- snapshot tomado al momento del pago, no una referencia viva a esta tabla.
ALTER TABLE public.subscription_plans
  ADD COLUMN target_audience text,
  ADD COLUMN features text[] NOT NULL DEFAULT '{}',
  ADD COLUMN included_bookings int;

UPDATE public.subscription_plans SET
  amount_in_cents = 9900000,
  target_audience = 'Profesional independiente',
  features = ARRAY['IA por WhatsApp', 'Un calendario', 'Respuestas automáticas', 'Agenda básica y recordatorios', 'CRM y varios servicios'],
  included_bookings = 300
WHERE code = 'emprendedor';

UPDATE public.subscription_plans SET
  amount_in_cents = 14900000,
  target_audience = 'Salón pequeño o mediano',
  features = ARRAY['IA por WhatsApp', 'Agenda y recordatorios', 'CRM y varios servicios', 'Servicio al cliente premium', 'Reportes'],
  included_bookings = 600
WHERE code = 'negocio';

UPDATE public.subscription_plans SET
  amount_in_cents = 19700000,
  target_audience = 'Salón con varios profesionales',
  features = ARRAY['IA por WhatsApp', 'Agenda y recordatorios', 'CRM y varios servicios', 'Servicio al cliente premium', 'Reportes'],
  included_bookings = 900
WHERE code = 'premium';
