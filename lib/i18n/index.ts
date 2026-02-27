"use client"

import { useContext } from "react"
import { LocaleContext } from "@/context/locale-context"
import { en, type TranslationKeys } from "./locales/en"
import { fr } from "./locales/fr"

type Locale = "en" | "fr"

const messages: Record<Locale, TranslationKeys> = { en, fr }

/**
 * Retrieves a translation string by dot-notation key.
 * Falls back to English if the key is missing in the current locale.
 * Returns the raw key if neither locale has the value.
 *
 * @example t("common.save")  → "Enregistrer"
 * @example t("nav.store")    → "Boutique Bmaster"
 */
function resolve(obj: unknown, parts: string[]): string | undefined {
  let current: unknown = obj
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return typeof current === "string" ? current : undefined
}

export function useLocale() {
  const { locale, setLocale } = useContext(LocaleContext)

  function t(key: string): string {
    const parts = key.split(".")
    return (
      resolve(messages[locale], parts) ??
      resolve(messages["en"], parts) ??
      key
    )
  }

  return { t, locale, setLocale }
}

export type { Locale }
