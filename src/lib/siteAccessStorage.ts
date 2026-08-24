const STORAGE_PREFIX = 'siteAccess:'

// Tracks, per celebration, whether this browser already completed the
// access-code gate (see CLAUDE.md "Celebration gate"). This is a
// convenience so a returning visitor isn't asked to re-verify every visit
// — it is NOT a real session and grants no server-side authorization; the
// underlying celebration data is already fetched into the page regardless
// (see the note on GET /api/public/celebration/{guid} in PUBLIC-API.md).
export function hasSiteAccess(celebrationId: string): boolean {
  try {
    return localStorage.getItem(STORAGE_PREFIX + celebrationId) === 'granted'
  } catch {
    return false
  }
}

export function grantSiteAccess(celebrationId: string): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + celebrationId, 'granted')
  } catch {
    // Ignore — a private-browsing tab or blocked storage just means the
    // visitor has to verify again next time, not a functional failure.
  }
}
