-- Žádost klientky o zrušení termínu: manikérka potvrdí a uvolní místo.
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS cancellation_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_requested_read_at TIMESTAMPTZ;

COMMENT ON COLUMN public.appointments.cancellation_requested_at IS 'Kdy klientka požádala o zrušení termínu; zobrazí se „manikérka zatím vaši zprávu nepřečetla“.';
COMMENT ON COLUMN public.appointments.cancellation_requested_read_at IS 'Kdy manikérka potvrdila žádost a uvolnila slot; klientka vidí „potvrzeno přečtení manikérkou“.';
