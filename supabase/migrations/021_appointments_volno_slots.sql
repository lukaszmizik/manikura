-- Volné sloty: manikérka může vložit slot bez přiřazené klientky (client_id NULL).
-- Klientky vidí tyto sloty jako "volno" a mohou se k nim přiřadit (claim).

ALTER TABLE public.appointments
  ALTER COLUMN client_id DROP NOT NULL;

COMMENT ON COLUMN public.appointments.client_id IS 'Klientka; NULL = volný slot (přiřadí se při rezervaci).';

-- Klientka může číst termíny, kde client_id IS NULL (aby viděla volné sloty).
CREATE POLICY "Appointments: client can select volno slots"
  ON public.appointments FOR SELECT TO authenticated
  USING (client_id IS NULL);

-- Klientka může aktualizovat pouze volný slot tak, že nastaví client_id na své id (claim).
CREATE POLICY "Appointments: client can claim volno slot"
  ON public.appointments FOR UPDATE TO authenticated
  USING (client_id IS NULL)
  WITH CHECK (client_id = auth.uid());
