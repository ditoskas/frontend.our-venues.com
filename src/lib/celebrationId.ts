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
