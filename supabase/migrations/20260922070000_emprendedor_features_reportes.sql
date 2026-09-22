-- Reemplaza "Respuestas automáticas" por "Reportes" en el plan Emprendedor.
UPDATE public.subscription_plans
SET features = array_replace(features, 'Respuestas automáticas', 'Reportes')
WHERE code = 'emprendedor';
