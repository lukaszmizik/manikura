"use client";

import { useState, useMemo } from "react";
import { Link } from "@/i18n/navigation";
import { User, Search, Calendar } from "lucide-react";
import { useTranslations } from "next-intl";

type ClientRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
};

export function ClientsList({ clients }: { clients: ClientRow[] }) {
  const t = useTranslations("clients");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return clients;
    const q = query.trim().toLowerCase();
    return clients.filter(
      (c) =>
        (c.display_name?.toLowerCase().includes(q) ?? false) ||
        (c.email?.toLowerCase().includes(q) ?? false) ||
        (c.phone?.replace(/\s/g, "").includes(q) ?? false)
    );
  }, [clients, query]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-primary-200 bg-white text-primary-900 placeholder:text-primary-400"
          aria-label={t("searchAria")}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-primary-500 py-4">
          {query.trim() ? t("noSearchResults") : t("noClientsYet")}
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((c) => (
            <li key={c.id}>
              <div className="p-4 rounded-xl bg-primary-50 border border-primary-100 hover:bg-primary-100/80 transition-colors space-y-3">
                <Link
                  href={`/dashboard/clients/${c.id}`}
                  className="block"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-200 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-primary-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-primary-800 truncate">
                        {c.display_name || "Bez jména"}
                      </p>
                      <p className="text-sm text-primary-500 truncate">{c.email}</p>
                    </div>
                  </div>
                </Link>
                <Link
                  href={`/dashboard/clients/${c.id}#visits`}
                  className="inline-flex items-center gap-1.5 py-2 px-3 rounded-lg border border-primary-200 bg-white text-primary-700 text-sm font-medium hover:bg-primary-50 dark:border-primary-700 dark:bg-primary-900 dark:text-primary-200 dark:hover:bg-primary-800/50 transition-colors"
                >
                  <Calendar className="w-4 h-4" />
                  {t("showVisitHistory")}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
