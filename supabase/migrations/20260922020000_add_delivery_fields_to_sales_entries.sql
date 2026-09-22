ALTER TABLE public.sales_entries
  ADD COLUMN delivery_address text,
  ADD COLUMN estimated_delivery text;

COMMENT ON COLUMN public.sales_entries.delivery_address IS 'Dirección de envío para pedidos de producto (source=whatsapp vía request_product).';
COMMENT ON COLUMN public.sales_entries.estimated_delivery IS 'Tiempo/fecha estimada de entrega en texto libre (ej: "30-45 min", "mañana antes de las 5pm"), editable por el negocio desde Ventas.';
