-- Nepřihlášení uživatelé (titulka, /inspirace) mohou číst jen veřejné fotky.
CREATE POLICY "Visit photos: public read for anon"
  ON public.visit_photos FOR SELECT TO anon
  USING (public = true);
