"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AlertTriangle, Ban } from "lucide-react";
import { useTranslations } from "next-intl";
type WarningRow = { id: string; warning_type: string; reason: string | null; created_at: string };

export function ClientActions({
  clientId,
  isBanned,
  warningsCount,
  warnings,
}: {
  clientId: string;
  isBanned: boolean;
  warningsCount: number;
  warnings: WarningRow[];
}) {
  const router = useRouter();
  const t = useTranslations("clients");
  const [loading, setLoading] = useState<"warning" | "ban" | null>(null);
  const [showReason, setShowReason] = useState(false);
  const [reason, setReason] = useState("");

  async function addWarning() {
    setLoading("warning");
    const supabase = createClient();
    await supabase.from("client_warnings").insert({
      client_id: clientId,
      warning_type: "warning",
      reason: reason.trim() || null,
    });
    setLoading(null);
    setShowReason(false);
    setReason("");
    router.refresh();
  }

  async function toggleBan() {
    setLoading("ban");
    const supabase = createClient();
    if (isBanned) {
      const banIds = warnings.filter((w) => w.warning_type === "ban").map((w) => w.id);
      if (banIds.length) {
        await supabase.from("client_warnings").delete().in("id", banIds);
      }
    } else {
      await supabase.from("client_warnings").insert({
        client_id: clientId,
        warning_type: "ban",
        reason: t("banReasonDefault"),
      });
    }
    setLoading(null);
    router.refresh();
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-primary-800">{t("actionsTitle")}</h2>

      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowReason((v) => !v)}
            disabled={loading !== null}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-100 text-amber-800 font-medium hover:bg-amber-200 disabled:opacity-50"
          >
            <AlertTriangle className="w-5 h-5" />
            {t("addWarningButton")}
          </button>
        </div>
        <div className="inline-flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium border-2 transition-colors ${
              isBanned
                ? "bg-red-100 border-red-300 text-red-800"
                : "bg-primary-50 border-primary-200 text-primary-700"
            }`}
          >
            <Ban className="w-5 h-5" />
            {t("banLabel")}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={isBanned}
            aria-label={isBanned ? t("unbanAria") : t("banAria")}
            disabled={loading !== null}
            onClick={toggleBan}
            className={`relative w-11 h-6 rounded-full transition-colors focus:ring-2 focus:ring-primary-400 focus:outline-none disabled:opacity-50 ${
              isBanned ? "bg-red-500" : "bg-primary-200"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                isBanned ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {showReason && (
        <div className="p-4 rounded-xl bg-primary-50 border border-primary-200 space-y-2">
          <label className="block text-sm font-medium text-primary-800">
            {t("warningReasonLabel")}
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("warningReasonPlaceholder")}
            className="w-full px-4 py-2 rounded-lg border border-primary-200"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={addWarning}
              disabled={loading === "warning"}
              className="px-4 py-2 rounded-lg bg-amber-500 text-white font-medium disabled:opacity-50"
            >
              {loading === "warning" ? t("savingWarning") : t("saveWarningButton")}
            </button>
            <button
              type="button"
              onClick={() => setShowReason(false)}
              className="px-4 py-2 rounded-lg border border-primary-300 text-primary-700"
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      )}

      {warningsCount > 0 && (
        <div className="text-sm text-primary-600">
          {t("warningsCountLabel")} <strong>{warningsCount}</strong>
          {warnings.length > 0 && (
            <ul className="mt-1 list-disc list-inside">
              {warnings.slice(0, 5).map((w) => (
                <li key={w.id}>
                  {w.warning_type === "ban" ? t("banLabel") : t("warningItemLabel")}
                  {w.reason && ` – ${w.reason}`}{" "}
                  <span className="text-primary-400">
                    {new Date(w.created_at).toLocaleDateString("cs-CZ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
