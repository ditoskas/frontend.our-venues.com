/**
 * Resolves the current celebration id: `window.celebrationId` takes
 * priority (set by whatever embeds/serves this page), falling back to the
 * `?celebrationId=` query param. Returns null if neither is present or
 * both are blank.
 */
export function resolveCelebrationId(search: string): string | null {
  const fromWindow = window.celebrationId
  if (typeof fromWindow === 'string' && fromWindow.trim() !== '') {
    return fromWindow.trim()
  }

  const fromQuery = new URLSearchParams(search).get('celebrationId')
  if (fromQuery && fromQuery.trim() !== '') {
    return fromQuery.trim()
  }

  return null
}

/**
 * Dev convenience: seeds `window.celebrationId` from `VITE_CELEBRATION_ID`
 * (see .env.example) so local development doesn't need a `?celebrationId=`
 * query param on every load. Never overrides a value already set by
 * whatever embeds/serves this page, and is a no-op if the env var is unset
 * — call once, before the app renders (see main.tsx).
 */
export function seedCelebrationIdFromEnv(): void {
  const fallback = import.meta.env.VITE_CELEBRATION_ID
  if (!window.celebrationId && fallback) {
    window.celebrationId = fallback
  }
}

/**
 * The react-router basename. When the backend serves the page it sets
 * `window.celebrationBasePath` ("/celebrations/{guid}" on the permanent link,
 * "/" on a subdomain). Otherwise (standalone dev/preview) the app lives at
 * Vite's `base` ("/site/").
 */
export function routerBasename(): string | undefined {
  const fromWindow = window.celebrationBasePath
  const base =
    typeof fromWindow === 'string' && fromWindow.trim() !== ''
      ? fromWindow.trim()
      : import.meta.env.BASE_URL
  const trimmed = base.replace(/\/+$/, '')
  return trimmed === '' ? undefined : trimmed
}
