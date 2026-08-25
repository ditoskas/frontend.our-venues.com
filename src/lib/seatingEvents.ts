import type { CelebrationEvent } from '@/lib/api/celebrations'

// Shared between ReceptionSeatingPage (the floor-plan view) and GuestListPage
// (the flat, searchable table) — both need to pick which seating-enabled
// event to show and, when there's more than one, offer the same event pills.

// Events don't have an end time, only a single start `date` — an event is
// treated as "currently running" for this many hours after it starts, a
// fixed assumed duration rather than a real per-event field (deliberate
// choice, see the conversation this was implemented in). Tune here if a
// real duration/end-time field is ever added to EventItem instead.
const ACTIVE_WINDOW_HOURS = 4

function isActive(event: CelebrationEvent, now: number): boolean {
  if (!event.date) return false
  const start = new Date(event.date).getTime()
  return now >= start && now < start + ACTIVE_WINDOW_HOURS * 60 * 60 * 1000
}

/**
 * Which of `events` (already filtered to `hasSeating`) to show, in order of
 * preference: any currently "active" ones (plural — see `isActive` above,
 * multiple can share a start time), else the single soonest upcoming one,
 * else the single most recent past one, else (no event has a date at all)
 * just the first configured one so the page still shows something.
 */
export function selectSeatingCandidates(events: CelebrationEvent[], now: number): CelebrationEvent[] {
  const active = events.filter((event) => isActive(event, now))
  if (active.length > 0) return active

  const dated = events.filter((event): event is CelebrationEvent & { date: string } => event.date != null)

  const upcoming = dated
    .filter((event) => new Date(event.date).getTime() > now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  if (upcoming.length > 0) return [upcoming[0]]

  const past = dated
    .filter((event) => new Date(event.date).getTime() <= now)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  if (past.length > 0) return [past[0]]

  return events.length > 0 ? [events[0]] : []
}
