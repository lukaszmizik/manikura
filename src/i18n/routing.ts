import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["cs", "ru"],
  defaultLocale: "cs",
  localePrefix: "always",
});
