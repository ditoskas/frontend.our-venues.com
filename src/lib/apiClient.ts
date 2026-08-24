import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api'

export const apiClient = axios.create({
  baseURL,
})

const apiOrigin = new URL(baseURL, window.location.origin).origin

/**
 * Resolves a path the backend returned as absolute-from-its-root (e.g.
 * `heroBackgroundUrl`/`timeline[].imageUrl` on a public celebration —
 * `/api/public/celebration/{guid}/...`) into a fully-qualified URL against
 * the backend's own origin, since those aren't routes this app serves.
 */
export function resolveBackendAssetUrl(path: string): string {
  return `${apiOrigin}${path}`
}
