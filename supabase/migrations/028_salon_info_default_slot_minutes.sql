-- Výchozí délka slotu (minuty) pro novou rezervaci v admin kalendáři
ALTER TABLE public.salon_info
  ADD COLUMN IF NOT EXISTS default_slot_minutes SMALLINT DEFAULT 120;

COMMENT ON COLUMN public.salon_info.default_slot_minutes IS 'Výchozí délka slotu v minutách (30, 60, 90, 120) při vytváření nové rezervace v admin kalendáři.';
