-- Kód pro propojení: klientka s kódem od manikérky převede host účet na svůj.
CREATE TABLE public.guest_claim_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (code)
);

CREATE UNIQUE INDEX idx_guest_claim_codes_user ON public.guest_claim_codes(user_id);
CREATE INDEX idx_guest_claim_codes_code ON public.guest_claim_codes(code);

ALTER TABLE public.guest_claim_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guest claim codes: admin může číst"
  ON public.guest_claim_codes FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Guest claim codes: insert/update/delete jen přes service role (server)"
  ON public.guest_claim_codes FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

COMMENT ON TABLE public.guest_claim_codes IS 'Jednorázové kódy pro propojení host účtu s reálným účtem klientky. Vytvoří se při „Uložit jméno“, zobrazí manikérce, klientka zadá v aplikaci.';
