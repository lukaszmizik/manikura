-- ===================== POLOŽKY CENÍKU (název úkonu + cena) =====================
CREATE TABLE public.pricelist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_info_id UUID NOT NULL REFERENCES public.salon_info(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  price_czk DECIMAL(10,2) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pricelist_items_salon ON public.pricelist_items(salon_info_id);
CREATE INDEX idx_pricelist_items_sort ON public.pricelist_items(salon_info_id, sort_order);

ALTER TABLE public.pricelist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pricelist items: čtení pro přihlášené"
  ON public.pricelist_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Pricelist items: zápis jen admin"
  ON public.pricelist_items FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

COMMENT ON TABLE public.pricelist_items IS 'Položky ceníku – název úkonu a cena v Kč.';
