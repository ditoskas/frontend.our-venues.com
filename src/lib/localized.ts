import type { LocalizedText } from '@/lib/api/celebrations'

/**
 * Picks a translatable field's value for the given (resolved) UI language,
 * falling back to `el` (the primary language admins fill in first — see
 * PUBLIC-API.md) then any other set language, then null if nothing is set
 * at all.
 */
export function pickLocalized(value: LocalizedText, language?: string): string | null {
  if (language && language in value) {
    const exact = value[language as keyof LocalizedText]
    if (exact) return exact
  }
  return value.el ?? value.en ?? value.ru ?? null
}
