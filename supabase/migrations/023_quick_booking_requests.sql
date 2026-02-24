-- Žádost klientky o termín: navrhne čas a poznámku, manikérka schválí (vytvoří termín) nebo odmítne.

CREATE TABLE public.quick_booking_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_date DATE NOT NULL,
  requested_start_time TIME NOT NULL,
  requested_end_time TIME NOT NULL,
  requested_start_at TIMESTAMPTZ NOT NULL,
  requested_end_at TIMESTAMPTZ NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_quick_booking_requests_client ON public.quick_booking_requests(client_id);
CREATE INDEX idx_quick_booking_requests_status ON public.quick_booking_requests(status);
CREATE INDEX idx_quick_booking_requests_created ON public.quick_booking_requests(created_at DESC);

ALTER TABLE public.quick_booking_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Quick booking: client can insert own"
  ON public.quick_booking_requests FOR INSERT TO authenticated
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Quick booking: client can select own"
  ON public.quick_booking_requests FOR SELECT TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Quick booking: admin can select and update all"
  ON public.quick_booking_requests FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Quick booking: admin can update"
  ON public.quick_booking_requests FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

COMMENT ON TABLE public.quick_booking_requests IS 'Žádosti klientek o termín (čas + poznámka); manikérka schválí nebo odmítne.';
