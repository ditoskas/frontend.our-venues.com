import { apiClient } from '@/lib/apiClient'

interface ConfirmAccessParams {
  guid: string
  contact: string
  code?: string
}

export interface ConfirmAccessResult {
  success: boolean
  /** Only present on the request-code call (no `code` sent) — see PUBLIC-API.md. There's no email/SMS delivery wired up on the backend yet, so the code comes back directly here. */
  code?: string
  /** Only present once `code` was verified — see PUBLIC-API.md. */
  displayName?: string
  /** Only present once `code` was verified — see PUBLIC-API.md. */
  maxAttendees?: number
  /** Only present once `code` was verified — signed guest session token, not yet consumed by any route in this app. See PUBLIC-API.md. */
  token?: string
  /** Only present once `code` was verified — ISO date, celebrationDate + 1 day, same as `token`'s own expiry. */
  expiresAt?: string
}

export interface RedeemInviteResult extends ConfirmAccessResult {
  /** The guest's own email or phone — what the RSVP endpoint matches on. */
  contact?: string
}

// GET /api/public/access/invite — see PUBLIC-API.md in app.our-venues.com.
// A guest's personal invitation link (…?invite=<code>) signs them in
// directly: same result as access/confirm's verified step, plus `contact`.
export async function redeemInvite(guid: string, invite: string): Promise<RedeemInviteResult> {
  const { data } = await apiClient.get<RedeemInviteResult>('/public/access/invite', {
    params: { guid, invite },
  })
  return data
}

// GET /api/public/access/confirm — see PUBLIC-API.md in
// app.our-venues.com. Shared by AccessGatePage (site-wide access
// gate) and GuestLoginForm (reservation page) — called once without
// `code` to request one, then again with it to verify.
export async function confirmAccess({ guid, contact, code }: ConfirmAccessParams): Promise<ConfirmAccessResult> {
  const { data } = await apiClient.get<ConfirmAccessResult>('/public/access/confirm', {
    params: code ? { guid, contact, code } : { guid, contact },
  })
  return data
}
