-- Zajistí, že quick_booking_requests má sloupce requested_start_at a requested_end_at
-- (např. pokud byla tabulka vytvořena starší verzí migrace nebo bez nich).
ALTER TABLE public.quick_booking_requests
  ADD COLUMN IF NOT EXISTS requested_start_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS requested_end_at TIMESTAMPTZ;

-- Doplnit hodnoty z date + time sloupců, pokud jsou _at sloupce NULL
UPDATE public.quick_booking_requests
SET
  requested_start_at = COALESCE(requested_start_at, (requested_date + requested_start_time)::timestamptz),
  requested_end_at   = COALESCE(requested_end_at, (requested_date + requested_end_time)::timestamptz)
WHERE requested_start_at IS NULL OR requested_end_at IS NULL;
