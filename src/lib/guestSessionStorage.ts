const STORAGE_PREFIX = 'guestSession:'

interface StoredGuestSession {
  contact: string
  token: string
  expiresAt: string
}

export interface VerifiedGuestSession {
  contact: string
  token: string
}

// Remembers, per celebration, the last guest identity a visitor
// successfully verified via GuestLoginForm's 2FA flow (GET
// /api/public/access/confirm, see PUBLIC-API.md in
// backend.our-venues.com) — both the plain `contact` string and the
// signed guest session `token` it returns — so a returning visitor (or a
// guest moving between the access gate, the reservation page, and the
// "add a Live Events photo" modal within the same browser session) isn't
// asked to re-enter their contact + code every single time, and so
// POST /api/public/live-events (the logged-in-guest endpoint, see
// PUBLIC-API.md) has a token to send as `Authorization: Bearer <token>`.
//
// Same "client-side-only convenience, NOT a real session" caveat as
// siteAccessStorage.ts's hasSiteAccess/grantSiteAccess: `contact` is still
// independently re-validated by the guid+contact endpoints regardless of
// what's stored here, and `token` is a real signed credential the backend
// verifies on its own — this storage is just where the browser keeps it
// between page loads, not a trust boundary in itself.
//
// Expires alongside the guest session token the backend issues
// (ConfirmAccessResult.expiresAt — celebrationDate + 1 day) so a stale
// entry past that point doesn't linger forever; getVerifiedGuestSession()
// checks that expiry itself rather than relying on localStorage TTL
// (which doesn't exist).
export function getVerifiedGuestSession(celebrationId: string): VerifiedGuestSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + celebrationId)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredGuestSession>
    if (!parsed.contact || !parsed.token || !parsed.expiresAt) return null
    if (new Date(parsed.expiresAt).getTime() <= Date.now()) return null
    return { contact: parsed.contact, token: parsed.token }
  } catch {
    return null
  }
}

export function setVerifiedGuestSession(
  celebrationId: string,
  session: VerifiedGuestSession & { expiresAt: string }
): void {
  try {
    const value: StoredGuestSession = session
    localStorage.setItem(STORAGE_PREFIX + celebrationId, JSON.stringify(value))
  } catch {
    // Ignore — a private-browsing tab or blocked storage just means the
    // visitor has to verify again next time, not a functional failure.
  }
}
