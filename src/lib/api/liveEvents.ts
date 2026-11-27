import { apiClient } from '@/lib/apiClient'

// Mirrors GET /api/public/celebration/{guid}/live-events — see
// PUBLIC-API.md in app.our-venues.com. Unlike the admin's Live Events
// table, the public feed doesn't include who posted each item (the guest
// list is never exposed publicly) — title/description are plain free text
// as the guest typed them, not LocalizedText.
export interface PublicLiveEventItem {
  id: string
  /** One of this celebration's `CelebrationEvent.id` — the "location". */
  eventId: string
  title: string
  description: string | null
  uploadedAt: string
  imageUrl: string
  /** "pending" needs a moderator to publish it, "published" is already live — see PUBLIC-API.md. Not filtered by GET below; every item is returned regardless. */
  status?: 'pending' | 'published'
}

interface LiveEventsResponse {
  liveEvents: PublicLiveEventItem[]
}

export async function getLiveEvents(guid: string): Promise<PublicLiveEventItem[]> {
  const { data } = await apiClient.get<LiveEventsResponse>(`/public/celebration/${guid}/live-events`)
  return data.liveEvents
}

interface SubmitLiveEventParams {
  /** Guest session token from GuestLoginForm's verify step (see guestSessionStorage.ts) — required, this endpoint only accepts logged-in guests. */
  token: string
  eventId: string
  title: string
  description?: string
  image: File
}

// POST /api/public/live-events — multipart/form-data, Authorization:
// Bearer <token>, see PUBLIC-API.md. Requires a logged-in guest: no
// guid/contact in the request at all, both come from the token
// server-side. 401s if the token is missing/invalid/expired, or if the
// guest it names is no longer on the celebration's guest list.
export async function submitLiveEvent({
  token,
  eventId,
  title,
  description,
  image,
}: SubmitLiveEventParams): Promise<PublicLiveEventItem> {
  const formData = new FormData()
  formData.append('eventId', eventId)
  formData.append('title', title)
  if (description) formData.append('description', description)
  formData.append('image', image)

  const { data } = await apiClient.post<PublicLiveEventItem>('/public/live-events', formData, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return data
}
