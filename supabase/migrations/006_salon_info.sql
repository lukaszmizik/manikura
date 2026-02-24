-- ===================== INFORMACE O SALONU (singleton) =====================
-- Vždy jen jeden řádek. Admin mění, klientky čtou.

CREATE TABLE public.salon_info (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  bank_account TEXT,
  iban TEXT,
  qr_code_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.salon_info ENABLE ROW LEVEL SECURITY;

-- Klientky i admin mohou číst
CREATE POLICY "Salon info: čtení pro přihlášené"
  ON public.salon_info FOR SELECT
  TO authenticated
  USING (true);

-- Pouze admin může vkládat a měnit
CREATE POLICY "Salon info: zápis jen admin"
  ON public.salon_info FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Vložit výchozí řádek (singleton)
INSERT INTO public.salon_info (id, name, address, phone, email, bank_account, iban, qr_code_url)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL
)
ON CONFLICT (id) DO NOTHING;

-- Trigger pro updated_at
CREATE OR REPLACE FUNCTION public.salon_info_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER salon_info_updated_at
  BEFORE UPDATE ON public.salon_info
  FOR EACH ROW EXECUTE FUNCTION public.salon_info_updated_at();

COMMENT ON TABLE public.salon_info IS 'Údaje o salonu (název, adresa, kontakt, platební údaje, QR kód). Singleton.';

-- ===================== STORAGE: salon-assets (QR kód) =====================
INSERT INTO storage.buckets (id, name, public)
VALUES ('salon-assets', 'salon-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Salon assets: authenticated upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'salon-assets');

CREATE POLICY "Salon assets: public read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'salon-assets');

CREATE POLICY "Salon assets: authenticated update/delete"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'salon-assets')
  WITH CHECK (bucket_id = 'salon-assets');
