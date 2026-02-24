-- Nastavení: schvalovat klientkám termíny automaticky (bez výstrahy vždy vyžadovat potvrzení admina)
ALTER TABLE public.salon_info
  ADD COLUMN IF NOT EXISTS auto_approve_bookings BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.salon_info.auto_approve_bookings IS 'Pokud true, rezervace z volného slotu i od admina se u klientek bez výstrahy ukládají rovnou jako potvrzené. U klientek s výstrahou (client_warnings) se vždy vyžaduje potvrzení admina.';
