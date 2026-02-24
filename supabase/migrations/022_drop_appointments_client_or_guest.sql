-- Odstranění check constraintu, který vyžadoval buď client_id nebo guest_client_name.
-- Volné sloty (volno) mají oba NULL – klientka se přiřadí při rezervaci.

ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_client_or_guest;
