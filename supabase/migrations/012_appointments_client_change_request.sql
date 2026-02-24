-- Zdůvodnění změny od klientky po potvrzení návštěvy (admin vidí žluté řádky)
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS client_change_reason TEXT,
  ADD COLUMN IF NOT EXISTS client_change_requested_at TIMESTAMPTZ;

COMMENT ON COLUMN public.appointments.client_change_reason IS 'Zdůvodnění, když klientka edituje již potvrzenou návštěvu.';
COMMENT ON COLUMN public.appointments.client_change_requested_at IS 'Kdy klientka požádala o změnu – admin zobrazí řádek se žlutým podsvícením.';
