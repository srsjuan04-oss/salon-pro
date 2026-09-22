-- Cobro diario de suscripciones vía Wompi. Mismo patrón que el cron de
-- recordatorios de citas (send-appointment-reminders-every-minute, aplicado
-- directo a la DB sin migración local — pg_cron/pg_net ya estaban
-- habilitados en el proyecto). A diferencia de ese, este job mueve dinero,
-- así que protege la invocación con un secreto compartido guardado en
-- Supabase Vault (vault.create_secret, aplicado aparte por seguridad — el
-- valor nunca queda en texto plano en esta migración ni en el repo).
SELECT cron.schedule(
  'wompi-daily-billing',
  '0 13 * * *', -- 13:00 UTC = 08:00 America/Bogota
  $$
  SELECT net.http_post(
    url := 'https://fswubvlwfihldajtmqky.supabase.co/functions/v1/wompi-charge-subscriptions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'wompi_cron_secret')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
