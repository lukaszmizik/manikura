"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { useTranslations } from "next-intl";

type Toast = { id: string; message: string; type?: "success" | "error" | "info" };

const ToastContext = createContext<{
  toasts: Toast[];
  addToast: (message: string, type?: Toast["type"]) => void;
  removeToast: (id: string) => void;
} | null>(null);

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4000);
  }, []);
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);
  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return { addToast: () => {}, toasts: [], removeToast: () => {} };
  return ctx;
}

export function Toaster() {
  const ctx = useContext(ToastContext);
  const t = useTranslations("common");
  if (!ctx || ctx.toasts.length === 0) return null;
  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 flex flex-col gap-2 safe-bottom pointer-events-none">
      {ctx.toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto py-2 px-4 rounded-lg bg-primary-800 text-white text-sm shadow-lg flex justify-between items-center"
        >
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => ctx.removeToast(toast.id)}
            className="text-white/80 hover:text-white"
            aria-label={t("close")}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
