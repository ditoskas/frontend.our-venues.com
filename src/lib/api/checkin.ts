import { apiClient } from '@/lib/apiClient'
import type { LocalizedText, SeatingLayoutElement } from '@/lib/api/celebrations'

// Door check-in — mirrors GET /api/public/checkin/{guid} and
// POST /api/public/checkin/{guid}/sync (see PUBLIC-API.md in
// app.our-venues.com). Access: the admin login (session cookie, same host)
// or the staff link's secret key, sent as X-Checkin-Key.

export interface CheckinAttendance {
  attendedAt: string
  actualParticipants: number
}

export interface CheckinGuest {
  id: string
  name: string
  expectedAttendees: number | null
  confirmedAttendees: number | null
  declined: boolean
  tableAssignments: { eventId: string; tableId: string }[]
  /** Keyed by event id. */
  attendance: Record<string, CheckinAttendance>
}

export interface CheckinEvent {
  id: string
  title: LocalizedText
  date: string | null
  hasSeating: boolean
  seatingLayout: SeatingLayoutElement[]
}

export interface CheckinSnapshot {
  guid: string
  title: string
  events: CheckinEvent[]
  guests: CheckinGuest[]
  serverTime: string
}

export interface CheckinRecord {
  guestId: string
  eventId: string
  actualParticipants: number
  attendedAt: string
}

const headers = (key: string | null) => (key ? { 'X-Checkin-Key': key } : undefined)

export async function getCheckinSnapshot(guid: string, key: string | null): Promise<CheckinSnapshot> {
  const { data } = await apiClient.get<CheckinSnapshot>(`/public/checkin/${guid}`, {
    headers: headers(key),
    withCredentials: true,
  })
  return data
}

export async function syncCheckins(
  guid: string,
  key: string | null,
  records: CheckinRecord[]
): Promise<{ applied: number; snapshot: CheckinSnapshot }> {
  const { data } = await apiClient.post<{ applied: number; snapshot: CheckinSnapshot }>(
    `/public/checkin/${guid}/sync`,
    { records },
    { headers: headers(key), withCredentials: true }
  )
  return data
}
