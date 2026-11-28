import type { CheckinRecord, CheckinSnapshot } from '@/lib/api/checkin'

// On-device storage for the offline check-in page, per celebration:
// - the last snapshot from the server (guests, events, floor plans),
// - the queue of check-ins recorded on this device and not yet synced,
// - the staff link's secret key (so the page still works when reopened
//   offline without the ?key=… in the address).
// localStorage: small, synchronous and survives restarts. Every access is
// wrapped — blocked storage (private mode) just means no offline support.

const k = (kind: string, guid: string) => `checkin:${kind}:${guid}`

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage full or blocked — the page keeps working in memory
  }
}

export interface StoredSnapshot {
  snapshot: CheckinSnapshot
  savedAt: string // when this device last got data from the server
}

export const loadSnapshot = (guid: string) => read<StoredSnapshot>(k('snapshot', guid))
export const saveSnapshot = (guid: string, snapshot: CheckinSnapshot) =>
  write(k('snapshot', guid), { snapshot, savedAt: new Date().toISOString() } satisfies StoredSnapshot)

export const loadQueue = (guid: string) => read<CheckinRecord[]>(k('queue', guid)) ?? []
export const saveQueue = (guid: string, queue: CheckinRecord[]) => write(k('queue', guid), queue)

export const loadKey = (guid: string) => read<string>(k('key', guid))
export const saveKey = (guid: string, key: string) => write(k('key', guid), key)
export function clearKey(guid: string): void {
  try {
    localStorage.removeItem(k('key', guid))
  } catch {
    // ignore
  }
}

// A local check-in on top of the snapshot (shown immediately, before sync).
// Latest attendedAt wins — the same rule the server applies.
export function applyLocally(snapshot: CheckinSnapshot, records: CheckinRecord[]): CheckinSnapshot {
  if (records.length === 0) return snapshot
  const guests = snapshot.guests.map((g) => {
    const mine = records.filter((r) => r.guestId === g.id)
    if (mine.length === 0) return g
    const attendance = { ...g.attendance }
    for (const r of mine) {
      const current = attendance[r.eventId]
      if (!current || current.attendedAt < r.attendedAt) {
        attendance[r.eventId] = { attendedAt: r.attendedAt, actualParticipants: r.actualParticipants }
      }
    }
    return { ...g, attendance }
  })
  return { ...snapshot, guests }
}
