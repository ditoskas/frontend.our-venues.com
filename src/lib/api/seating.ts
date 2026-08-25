import { apiClient } from '@/lib/apiClient'

/** One assigned guest at a table — `attendees` is that guest's confirmed party size (falling back to expected, or 1), same as the backend's `guestSeatCount()`. */
export interface SeatingTableGuest {
  name: string
  attendees: number
}

// Mirrors GET /api/public/celebration/{guid}/seating — see PUBLIC-API.md
// in backend.o-gamos-mas.com. Table capacity/position/code themselves come
// from CelebrationEvent.seatingLayout (already fetched by CelebrationGate);
// this only adds guests (name + attendee count) on top, for the "who's at
// this table" panel.
export interface SeatingTableAssignment {
  eventId: string
  tableId: string
  guests: SeatingTableGuest[]
}

/** One entry of the authenticated guest's own table assignment(s) — same shape as SeatingTableAssignment minus guests, since it's already "you". */
export interface MySeatingAssignment {
  eventId: string
  tableId: string
}

interface SeatingResponse {
  tables: SeatingTableAssignment[]
  myAssignments: MySeatingAssignment[]
}

/**
 * `token` is the guest session token from guestSessionStorage.ts —
 * optional. When given (and still valid), the response's `myAssignments`
 * names that guest's own table(s); omitted or invalid, it just comes back
 * empty rather than the request failing.
 */
export async function getSeatingAssignments(guid: string, token?: string | null): Promise<SeatingResponse> {
  const { data } = await apiClient.get<SeatingResponse>(`/public/celebration/${guid}/seating`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  return data
}
