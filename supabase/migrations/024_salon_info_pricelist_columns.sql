-- Ceník: základní cena a sleva Last minute (admin nastavuje v Nastavení salonu).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'salon_info' AND column_name = 'default_price_czk') THEN
    ALTER TABLE public.salon_info ADD COLUMN default_price_czk DECIMAL(10,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'salon_info' AND column_name = 'last_minute_discount_percent') THEN
    ALTER TABLE public.salon_info ADD COLUMN last_minute_discount_percent SMALLINT;
  END IF;
END $$;

COMMENT ON COLUMN public.salon_info.default_price_czk IS 'Základní cena v Kč (pro výpočet Last minute).';
COMMENT ON COLUMN public.salon_info.last_minute_discount_percent IS 'Sleva v % u Last minute nabídek.';
