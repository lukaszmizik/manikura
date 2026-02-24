-- Žádosti klientky o úpravu nebo zrušení termínu – čekají na potvrzení admina
CREATE TABLE public.appointment_change_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('edit', 'delete')),
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_appointment_change_requests_status ON public.appointment_change_requests(status);
CREATE INDEX idx_appointment_change_requests_appointment ON public.appointment_change_requests(appointment_id);

ALTER TABLE public.appointment_change_requests ENABLE ROW LEVEL SECURITY;

-- Klientka může vložit vlastní žádost a číst své
CREATE POLICY "Change requests: klientka insert/select vlastní"
  ON public.appointment_change_requests FOR INSERT TO authenticated
  WITH CHECK (client_id = auth.uid());
CREATE POLICY "Change requests: klientka select vlastní"
  ON public.appointment_change_requests FOR SELECT TO authenticated
  USING (client_id = auth.uid());

-- Admin může číst vše a updatovat (schválení/odmítnutí)
CREATE POLICY "Change requests: admin select a update"
  ON public.appointment_change_requests FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

COMMENT ON TABLE public.appointment_change_requests IS 'Žádosti klientek o úpravu nebo zrušení termínu; admin potvrdí nebo odmítne v notifikacích.';
