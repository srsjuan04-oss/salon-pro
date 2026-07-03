
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  category text NOT NULL,
  expense_date date NOT NULL,
  amount numeric NOT NULL,
  payment_method text,
  type text NOT NULL DEFAULT 'variable',
  source text NOT NULL DEFAULT 'manual',
  import_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff select expenses" ON public.expenses FOR SELECT TO authenticated USING (public.is_authenticated_staff());
CREATE POLICY "staff insert expenses" ON public.expenses FOR INSERT TO authenticated WITH CHECK (public.is_authenticated_staff());
CREATE POLICY "staff update expenses" ON public.expenses FOR UPDATE TO authenticated USING (public.is_authenticated_staff());
CREATE POLICY "staff delete expenses" ON public.expenses FOR DELETE TO authenticated USING (public.is_authenticated_staff());

CREATE TABLE public.sales_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  service_name text NOT NULL,
  amount numeric NOT NULL,
  stylist_name text,
  sale_date date NOT NULL,
  sale_time text,
  payment_method text,
  status text NOT NULL DEFAULT 'paid',
  source text NOT NULL DEFAULT 'manual',
  import_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_entries TO authenticated;
GRANT ALL ON public.sales_entries TO service_role;
ALTER TABLE public.sales_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff select sales_entries" ON public.sales_entries FOR SELECT TO authenticated USING (public.is_authenticated_staff());
CREATE POLICY "staff insert sales_entries" ON public.sales_entries FOR INSERT TO authenticated WITH CHECK (public.is_authenticated_staff());
CREATE POLICY "staff update sales_entries" ON public.sales_entries FOR UPDATE TO authenticated USING (public.is_authenticated_staff());
CREATE POLICY "staff delete sales_entries" ON public.sales_entries FOR DELETE TO authenticated USING (public.is_authenticated_staff());

CREATE TABLE public.financial_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_type text NOT NULL,
  file_name text,
  rows_imported int NOT NULL DEFAULT 0,
  rows_failed int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_imports TO authenticated;
GRANT ALL ON public.financial_imports TO service_role;
ALTER TABLE public.financial_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff select imports" ON public.financial_imports FOR SELECT TO authenticated USING (public.is_authenticated_staff());
CREATE POLICY "staff insert imports" ON public.financial_imports FOR INSERT TO authenticated WITH CHECK (public.is_authenticated_staff());

CREATE INDEX idx_expenses_date ON public.expenses(expense_date DESC);
CREATE INDEX idx_sales_entries_date ON public.sales_entries(sale_date DESC);
CREATE INDEX idx_financial_imports_created ON public.financial_imports(created_at DESC);
