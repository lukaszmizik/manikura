-- Klientka může smazat z DB vlastní termín, který už byl zrušen na její žádost
-- a manikérka potvrdila (odstranění z výpisu termínů).
CREATE POLICY "Appointments: client can delete own released cancellation"
  ON public.appointments FOR DELETE TO authenticated
  USING (
    client_id = auth.uid()
    AND status = 'cancelled'
    AND cancellation_requested_at IS NOT NULL
    AND cancellation_requested_read_at IS NOT NULL
  );
