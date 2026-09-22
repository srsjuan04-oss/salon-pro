ALTER TABLE public.services
  ADD COLUMN item_type TEXT NOT NULL DEFAULT 'service'
  CHECK (item_type IN ('service', 'product'));

COMMENT ON COLUMN public.services.item_type IS 'service: se agenda con duración/barbero. product: se vende sin cita, duration_minutes se ignora.';
