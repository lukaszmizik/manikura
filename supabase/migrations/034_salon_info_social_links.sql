-- Sociální odkazy salonu: Instagram, Facebook, TikTok
ALTER TABLE public.salon_info
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_url TEXT;

COMMENT ON COLUMN public.salon_info.instagram_url IS 'Odkaz na Instagram salonu (URL nebo uživatelské jméno).';
COMMENT ON COLUMN public.salon_info.facebook_url IS 'Odkaz na Facebook salonu (URL nebo uživatelské jméno).';
COMMENT ON COLUMN public.salon_info.tiktok_url IS 'Odkaz na TikTok salonu (URL nebo uživatelské jméno).';

