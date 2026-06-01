"use client";

import { createContext, useContext } from "react";
import { SessionProvider } from "next-auth/react";
import { getDict, type Dict, type Locale } from "@/lib/i18n";

const LocaleCtx = createContext<Locale>("tr");

export function useLocale(): Locale {
  return useContext(LocaleCtx);
}
export function useT(): Dict {
  return getDict(useContext(LocaleCtx));
}

export function Providers({
  locale = "tr",
  children,
}: {
  locale?: Locale;
  children: React.ReactNode;
}) {
  return (
    <LocaleCtx.Provider value={locale}>
      <SessionProvider>{children}</SessionProvider>
    </LocaleCtx.Provider>
  );
}
