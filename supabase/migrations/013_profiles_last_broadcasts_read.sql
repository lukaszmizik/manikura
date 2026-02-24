-- Klientka: kdy naposledy otevřela Zprávy (pro badge „nepřečtené hromadné zprávy“)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_broadcasts_read_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.last_broadcasts_read_at IS 'Kdy klientka naposledy otevřela stránku Zprávy – pro počet nepřečtených.';
