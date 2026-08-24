import { apiClient } from '@/lib/apiClient'

interface ConfirmAccessParams {
  guid: string
  contact: string
  code?: string
}

export interface ConfirmAccessResult {
  success: boolean
  /** Only meaningful once `code` was verified — see PUBLIC-API.md. */
  displayName?: string
  /** Only meaningful once `code` was verified — see PUBLIC-API.md. */
  maxAttendees?: number
}

// GET /api/public/access/confirm — see PUBLIC-API.md in
// backend.o-gamos-mas.com: currently a STUB that always returns success
// with fixed placeholder displayName/maxAttendees, no real lookup/code
// verification yet. Shared by AccessGatePage (site-wide access gate) and
// GuestLoginForm (reservation page) — called once without `code` to
// request one, then again with it to verify.
export async function confirmAccess({ guid, contact, code }: ConfirmAccessParams): Promise<ConfirmAccessResult> {
  const { data } = await apiClient.get<ConfirmAccessResult>('/public/access/confirm', {
    params: code ? { guid, contact, code } : { guid, contact },
  })
  return data
}
