-- Bucket "visit-photos" vytvořte v Supabase Dashboard (Storage) jako veřejný (public),
-- nebo spusťte v SQL Editoru (bucket se vytvoří přes API/Dashboard):
--
-- Politiky pro bucket visit-photos (předpokládá, že bucket už existuje):
-- 1) Přihlášení (admin) mohou nahrávat soubory
-- 2) Veřejné čtení (pro zobrazení fotek v galerii a v kartě návštěvy)

INSERT INTO storage.buckets (id, name, public)
VALUES ('visit-photos', 'visit-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Povolit nahrávání pouze přihlášeným (RLS u storage.objects vyžaduje policy)
CREATE POLICY "Authenticated upload visit-photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'visit-photos');

CREATE POLICY "Public read visit-photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'visit-photos');

CREATE POLICY "Authenticated update/delete visit-photos"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'visit-photos')
WITH CHECK (bucket_id = 'visit-photos');
