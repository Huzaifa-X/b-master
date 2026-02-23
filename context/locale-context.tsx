"use client"

import { createContext, useState, useEffect, useContext, type ReactNode } from "react"

export type Locale = "en" | "fr"

interface LocaleContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
}

const STORAGE_KEY = "bmaster_locale"

export const LocaleContext = createContext<LocaleContextType>({
  locale: "en",
  setLocale: () => {},
})

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en")

  // Hydrate from localStorage on first render (client only)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null
      if (saved === "en" || saved === "fr") {
        setLocaleState(saved)
      }
    } catch {
      // localStorage not available (SSR or restricted context)
    }
  }, [])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    try {
      localStorage.setItem(STORAGE_KEY, newLocale)
    } catch {
      // ignore write errors
    }
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  )
}

/** Convenience hook — use this outside of useLocale() when you only need locale control. */
export function useLocaleContext() {
  return useContext(LocaleContext)
}
