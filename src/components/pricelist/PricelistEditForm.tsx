"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { savePricelistItems, type PricelistItemInput, type PricelistItemRow } from "@/app/dashboard/admin/settings/actions";
import { Loader2, Plus, Trash2, Check } from "lucide-react";

type Props = {
  initialItems: PricelistItemRow[];
};

type RowState = PricelistItemInput & { localId?: string };

export function PricelistEditForm({ initialItems }: Props) {
  const t = useTranslations("pricelist");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [rows, setRows] = useState<RowState[]>(() =>
    initialItems.length > 0
      ? initialItems.map((r) => ({ id: r.id, name: r.name, price_czk: r.price_czk, active: r.active }))
      : [{ name: "", price_czk: 0, active: true, localId: "new-0" }]
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  function addRow() {
    setRows((prev) => [...prev, { name: "", price_czk: 0, active: true, localId: `new-${Date.now()}` }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function updateRow(index: number, patch: Partial<RowState>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  async function handleSave() {
    setMessage(null);
    setSaving(true);
    const items: PricelistItemInput[] = rows.map((r) => ({
      id: r.id ?? null,
      name: r.name,
      price_czk: Number(r.price_czk) || 0,
      active: !!r.active,
    }));
    const result = await savePricelistItems(items);
    setSaving(false);
    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "ok", text: t("saved") });
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      {message && (
        <p
          className={`text-sm p-3 rounded-lg ${
            message.type === "ok"
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200"
              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200"
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3">
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto_auto] gap-2 items-center text-sm font-medium text-primary-700 dark:text-primary-300">
          <span>{t("serviceName")}</span>
          <span>{t("price")}</span>
          <span className="w-8 text-center" title={t("active")}>{t("ok")}</span>
          <span className="w-10" aria-hidden />
        </div>
        {rows.map((row, index) => (
          <div
            key={row.id ?? row.localId ?? index}
            className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto_auto] gap-2 items-center"
          >
            <input
              type="text"
              value={row.name}
              onChange={(e) => updateRow(index, { name: e.target.value })}
              placeholder={t("serviceNamePlaceholder")}
              className="rounded-lg border border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-900 px-3 py-2"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={row.price_czk === 0 ? "" : row.price_czk}
              onChange={(e) => updateRow(index, { price_czk: parseFloat(e.target.value) || 0 })}
              placeholder={t("pricePlaceholder")}
              className="rounded-lg border border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-900 px-3 py-2 tabular-nums"
            />
            <div className="flex items-center justify-center w-8">
              <label className="sr-only">{t("active")}</label>
              <input
                type="checkbox"
                checked={row.active}
                onChange={(e) => updateRow(index, { active: e.target.checked })}
                className="rounded border-primary-300 text-primary-600 focus:ring-primary-500"
                title={t("active")}
              />
            </div>
            <button
              type="button"
              onClick={() => removeRow(index)}
              className="p-2 rounded-lg text-primary-500 hover:bg-primary-100 dark:hover:bg-primary-800 hover:text-red-600 dark:hover:text-red-400"
              title={t("deleteRow")}
              aria-label={t("deleteRow")}
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-primary-300 dark:border-primary-600 text-primary-700 dark:text-primary-200 font-medium hover:bg-primary-50 dark:hover:bg-primary-900/50"
        >
          <Plus className="w-4 h-4" />
          {t("addRow")}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 text-white font-medium disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {tCommon("save")}
        </button>
      </div>
    </div>
  );
}
