"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { SALON_INFO_ID } from "@/lib/salon";

export type SalonInfoRow = {
  id: string;
  name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  bank_account: string | null;
  iban: string | null;
  qr_code_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  default_price_czk: number | null;
  last_minute_discount_percent: number | null;
  updated_at: string;
};

export async function getSalonInfo(): Promise<SalonInfoRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("salon_info")
    .select("*")
    .eq("id", SALON_INFO_ID)
    .single();
  if (error || !data) return null;
  return data as SalonInfoRow;
}

export async function updateSalonInfo(formData: FormData): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const name = (formData.get("name") as string)?.trim() || null;
  const address = (formData.get("address") as string)?.trim() || null;
  const phone = (formData.get("phone") as string)?.trim() || null;
  const email = (formData.get("email") as string)?.trim() || null;
  const bank_account = (formData.get("bank_account") as string)?.trim() || null;
  const iban = (formData.get("iban") as string)?.trim() || null;
  const instagram_raw = (formData.get("instagram") as string | null)?.trim() || "";
  const facebook_raw = (formData.get("facebook") as string | null)?.trim() || "";
  const tiktok_raw = (formData.get("tiktok") as string | null)?.trim() || "";
  const instagram_url = instagram_raw || null;
  const facebook_url = facebook_raw || null;
  const tiktok_url = tiktok_raw || null;
  const defaultPriceRaw = (formData.get("default_price_czk") as string)?.trim();
  const default_price_czk = defaultPriceRaw ? (parseFloat(defaultPriceRaw) >= 0 ? parseFloat(defaultPriceRaw) : null) : null;
  const discountRaw = (formData.get("last_minute_discount_percent") as string)?.trim();
  const last_minute_discount_percent = discountRaw ? (parseFloat(discountRaw) >= 0 && parseFloat(discountRaw) <= 100 ? parseFloat(discountRaw) : null) : null;

  const { error } = await supabase
    .from("salon_info")
    .update({
      name,
      address,
      phone,
      email,
      bank_account,
      iban,
      instagram_url,
      facebook_url,
      tiktok_url,
      default_price_czk: default_price_czk ?? null,
      last_minute_discount_percent: last_minute_discount_percent ?? null,
    })
    .eq("id", SALON_INFO_ID);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/admin/settings");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function setSalonQrUrl(qrCodeUrl: string | null): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("salon_info")
    .update({ qr_code_url: qrCodeUrl })
    .eq("id", SALON_INFO_ID);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/admin/settings");
  revalidatePath("/dashboard");
  return { error: null };
}

/** Aktualizuje jen položky ceníku (základní cena, sleva Last minute). Pro stránku Ceník. */
export async function updatePricelistOnly(formData: FormData): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const defaultPriceRaw = (formData.get("default_price_czk") as string)?.trim();
  const default_price_czk = defaultPriceRaw ? (parseFloat(defaultPriceRaw) >= 0 ? parseFloat(defaultPriceRaw) : null) : null;
  const discountRaw = (formData.get("last_minute_discount_percent") as string)?.trim();
  const last_minute_discount_percent = discountRaw ? (parseFloat(discountRaw) >= 0 && parseFloat(discountRaw) <= 100 ? parseFloat(discountRaw) : null) : null;

  const { error } = await supabase
    .from("salon_info")
    .update({
      default_price_czk: default_price_czk ?? null,
      last_minute_discount_percent: last_minute_discount_percent ?? null,
    })
    .eq("id", SALON_INFO_ID);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/pricelist");
  revalidatePath("/dashboard");
  return { error: null };
}

export type PricelistItemRow = {
  id: string;
  salon_info_id: string;
  name: string;
  price_czk: number;
  sort_order: number;
  active: boolean;
  created_at: string;
};

export type PricelistItemInput = {
  id?: string | null;
  name: string;
  price_czk: number;
  active: boolean;
};

/** Uloží položky ceníku: nové bez id vloží, existující aktualizuje, chybějící smaže. */
export async function savePricelistItems(items: PricelistItemInput[]): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const keptIds: string[] = [];

  for (let i = 0; i < items.length; i++) {
    const { id, name, price_czk, active } = items[i];
    const safeName = String(name ?? "").trim();
    const safePrice = Math.max(0, Number(price_czk) || 0);

    if (id) {
      const { error } = await supabase
        .from("pricelist_items")
        .update({ name: safeName, price_czk: safePrice, active: !!active, sort_order: i })
        .eq("id", id)
        .eq("salon_info_id", SALON_INFO_ID);
      if (error) return { error: error.message };
      keptIds.push(id);
    } else {
      const { data, error } = await supabase
        .from("pricelist_items")
        .insert({
          salon_info_id: SALON_INFO_ID,
          name: safeName,
          price_czk: safePrice,
          active: !!active,
          sort_order: i,
        })
        .select("id")
        .single();
      if (error) return { error: error.message };
      if (data?.id) keptIds.push(data.id);
    }
  }

  const { data: existing } = await supabase
    .from("pricelist_items")
    .select("id")
    .eq("salon_info_id", SALON_INFO_ID);
  const toDelete = (existing ?? []).filter((r: { id: string }) => !keptIds.includes(r.id)).map((r: { id: string }) => r.id);
  if (toDelete.length > 0) {
    const { error } = await supabase.from("pricelist_items").delete().in("id", toDelete);
    if (error) return { error: error.message };
  }

  revalidatePath("/dashboard/pricelist");
  revalidatePath("/dashboard");
  return { error: null };
}
