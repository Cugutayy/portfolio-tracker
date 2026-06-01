"use client";

import { createContext, useContext } from "react";
import { SessionProvider } from "next-auth/react";
import { getDict, type Dict, type Locale } from "@/lib/i18n";
import type { Currency } from "@/lib/currency";

const LocaleCtx = createContext<Locale>("tr");
const CurrencyCtx = createContext<Currency>("try");

export function useLocale(): Locale {
  return useContext(LocaleCtx);
}
export function useT(): Dict {
  return getDict(useContext(LocaleCtx));
}
export function useCurrency(): Currency {
  return useContext(CurrencyCtx);
}

export function Providers({
  locale = "tr",
  currency = "try",
  children,
}: {
  locale?: Locale;
  currency?: Currency;
  children: React.ReactNode;
}) {
  return (
    <LocaleCtx.Provider value={locale}>
      <CurrencyCtx.Provider value={currency}>
        <SessionProvider>{children}</SessionProvider>
      </CurrencyCtx.Provider>
    </LocaleCtx.Provider>
  );
}
