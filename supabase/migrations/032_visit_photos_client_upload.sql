-- Povolit klientce nahrávat vlastní fotky do galerie (bez návštěvy).
-- visit_id bude volitelný; klientka vkládá pouze client_id + storage_path.

ALTER TABLE public.visit_photos
  ALTER COLUMN visit_id DROP NOT NULL;

-- Odstranit původní policy "insert jen admin"
DROP POLICY IF EXISTS "Visit photos: insert jen admin" ON public.visit_photos;

-- Povolit INSERT: admin všechny záznamy; klientka jen své a pouze bez návštěvy (galerie)
CREATE POLICY "Visit photos: insert admin or client own gallery"
  ON public.visit_photos FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (client_id = auth.uid() AND visit_id IS NULL)
  );
