-- Rychlé zprávy admina pro všechny klientky (zobrazení od–do nebo trvale)
CREATE TABLE public.admin_broadcasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  body TEXT NOT NULL,
  show_from TIMESTAMPTZ NOT NULL,
  show_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_admin_broadcasts_visibility ON public.admin_broadcasts (show_from, show_until);

ALTER TABLE public.admin_broadcasts ENABLE ROW LEVEL SECURITY;

-- Admin může vše
CREATE POLICY "Admin broadcasts: admin může vše"
  ON public.admin_broadcasts FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Klientka vidí jen zprávy, které jsou právě v období zobrazení (show_from <= now() AND (show_until IS NULL OR show_until >= now()))
CREATE POLICY "Admin broadcasts: klientka čte viditelné"
  ON public.admin_broadcasts FOR SELECT TO authenticated
  USING (
    NOT public.is_admin()
    AND show_from <= now()
    AND (show_until IS NULL OR show_until >= now())
  );

COMMENT ON TABLE public.admin_broadcasts IS 'Rychlé zprávy admina všem klientkám; show_until NULL = trvale.';
