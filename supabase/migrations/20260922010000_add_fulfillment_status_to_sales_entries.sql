ALTER TABLE public.sales_entries
  ADD COLUMN customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN fulfillment_status text CHECK (fulfillment_status IN ('preparing', 'out_for_delivery', 'delivered'));

CREATE INDEX sales_entries_customer_id_idx ON public.sales_entries(customer_id);

COMMENT ON COLUMN public.sales_entries.fulfillment_status IS 'Solo aplica a pedidos de producto (source=whatsapp vía request_product). NULL para servicios agendados y ventas manuales.';
