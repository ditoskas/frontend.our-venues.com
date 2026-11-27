import { apiClient } from '@/lib/apiClient'

interface SubmitReservationParams {
  guid: string
  /** Email or phone, whichever the guest logged in with — matched against the right field automatically. */
  contact: string
  action: 'confirm' | 'denied'
  /** Only applied when action is 'confirm' — see PUBLIC-API.md. */
  attendees?: number
}

interface ReservationResponse {
  success: boolean
  action: 'confirm' | 'denied'
}

const isEmail = (value: string) => value.includes('@')

// GET /api/public/reservations/confirm — see PUBLIC-API.md in
// backend.our-venues.com. Real (non-stub) endpoint: matches `contact`
// against a guest's phone (exact) or email (case-insensitive) on the
// celebration and records their RSVP.
export async function submitReservation({
  guid,
  contact,
  action,
  attendees,
}: SubmitReservationParams): Promise<ReservationResponse> {
  const { data } = await apiClient.get<ReservationResponse>('/public/reservations/confirm', {
    params: {
      guid,
      ...(isEmail(contact) ? { email: contact } : { phone: contact }),
      action,
      ...(action === 'confirm' && attendees ? { confirmationAttendies: attendees } : {}),
    },
  })
  return data
}
