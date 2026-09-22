ALTER TABLE public.services
  ADD COLUMN image_url TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('catalog-images', 'catalog-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read catalog images" ON storage.objects FOR SELECT
  USING (bucket_id = 'catalog-images');

CREATE POLICY "Org members upload own catalog images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'catalog-images'
    AND EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND s.organization_id = public.current_org_id()
    )
  );

CREATE POLICY "Org members update own catalog images" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'catalog-images'
    AND EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND s.organization_id = public.current_org_id()
    )
  );

CREATE POLICY "Org members delete own catalog images" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'catalog-images'
    AND EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND s.organization_id = public.current_org_id()
    )
  );
