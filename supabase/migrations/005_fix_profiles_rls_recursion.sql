-- Oprava: infinite recursion v RLS na profiles
-- Politika "Admin může..." četla z profiles, což znovu spustilo RLS = rekurze.
-- Nahradíme použitím funkce is_admin() (SECURITY DEFINER), která RLS nevyvolá.

DROP POLICY IF EXISTS "Admin může číst a měnit role (pro správu)" ON public.profiles;

CREATE POLICY "Admin může číst a měnit role (pro správu)"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
