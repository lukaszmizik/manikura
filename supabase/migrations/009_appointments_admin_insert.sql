-- Admin může v kalendáři vytvářet rezervace pro libovolnou klientku.
-- Původní policy povolovala INSERT jen když client_id = auth.uid() (vlastní rezervace).
-- Přidáváme policy pro admina: může vložit řádek s libovolným client_id.
CREATE POLICY "Appointments: admin can insert any"
  ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
