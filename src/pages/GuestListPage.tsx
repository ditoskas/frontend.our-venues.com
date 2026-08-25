import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Users } from 'lucide-react'
import { useCelebration } from '@/context/CelebrationContext'
import { pickLocalized } from '@/lib/localized'
import { selectSeatingCandidates } from '@/lib/seatingEvents'
import { getSeatingAssignments, type SeatingTableAssignment } from '@/lib/api/seating'

interface GuestRow {
  tableCode: string
  guestName: string
  attendees: number
}

// Not linked from the Navbar (deliberately — see the conversation this was
// added in): a flat, searchable "table, guest, attendees" list meant to be
// pulled up at a table or on a guest's phone, as opposed to
// ReceptionSeatingPage's floor-plan view. Reachable only via its direct URL
// (/guest-list). Same `showSeating` gate and event-selection/pills as
// ReceptionSeatingPage since it's reading the same underlying data — see
// PUBLIC-API.md's GET /api/public/celebration/{guid}/seating.
export function GuestListPage() {
  const { t, i18n } = useTranslation()
  const { celebrationId, celebration } = useCelebration()
  const { showSeating } = celebration.celebrationInfo

  const seatingEvents = useMemo(
    () => celebration.events.filter((event) => event.hasSeating),
    [celebration.events]
  )

  // Captured once, same rationale as ReceptionSeatingPage's `now` — a
  // multi-hour reception is more naturally handled by a fresh page load
  // than by this auto-advancing while left open.
  const [now] = useState(() => Date.now())
  const candidates = useMemo(() => selectSeatingCandidates(seatingEvents, now), [seatingEvents, now])

  const [selectedId, setSelectedId] = useState<string | null>(candidates[0]?.id ?? null)
  const selected = candidates.find((event) => event.id === selectedId) ?? candidates[0] ?? null

  const [tables, setTables] = useState<SeatingTableAssignment[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!showSeating) return
    getSeatingAssignments(celebrationId)
      .then((data) => setTables(data.tables))
      .catch(() => {
        // Best-effort, same as ReceptionSeatingPage — the page still
        // renders, just with an empty list.
      })
  }, [celebrationId, showSeating])

  // A search query only makes sense within the event it was typed against —
  // drop it when switching which event's list is shown (pills).
  useEffect(() => {
    setSearchQuery('')
  }, [selected?.id])

  const collator = useMemo(() => new Intl.Collator(i18n.resolvedLanguage), [i18n.resolvedLanguage])

  const rows = useMemo<GuestRow[]>(() => {
    if (!selected) return []
    return tables
      .filter((tbl) => tbl.eventId === selected.id)
      .flatMap((tbl) => {
        const tableCode = selected.seatingLayout.find((el) => el.id === tbl.tableId)?.code ?? ''
        return tbl.guests.map((guest) => ({
          tableCode,
          guestName: guest.name,
          attendees: guest.attendees,
        }))
      })
      .sort((a, b) => collator.compare(a.guestName, b.guestName))
  }, [tables, selected, collator])

  const trimmedQuery = searchQuery.trim()
  const filteredRows = useMemo(() => {
    if (!trimmedQuery) return rows
    const needle = trimmedQuery.toLowerCase()
    return rows.filter(
      (row) => row.guestName.toLowerCase().includes(needle) || row.tableCode.toLowerCase().includes(needle)
    )
  }, [rows, trimmedQuery])

  if (!showSeating) {
    return (
      <section className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center animate-fade-in">
        <h1 className="font-serif text-3xl font-semibold text-natural-text">{t('pages.guestList.title')}</h1>
        <p className="font-sans text-natural-muted">{t('pages.comingSoon')}</p>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
      <div className="mb-10 flex flex-col items-center gap-3 text-center">
        <Users className="h-8 w-8 text-natural-accent" aria-hidden="true" />
        <h1 className="font-serif text-3xl font-normal text-natural-text">{t('pages.guestList.title')}</h1>
      </div>

      {seatingEvents.length === 0 ? (
        <p className="text-center font-sans text-sm text-natural-muted">{t('pages.receptionSeating.empty')}</p>
      ) : (
        <>
          {candidates.length > 1 && (
            <div className="mb-8 flex flex-wrap justify-center gap-2">
              {candidates.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => setSelectedId(event.id)}
                  className={`rounded-full border px-4 py-1.5 font-sans text-xs font-medium uppercase tracking-widest transition-colors ${
                    selected?.id === event.id
                      ? 'border-natural-accent bg-natural-accent text-natural-bg'
                      : 'border-natural-border bg-white text-natural-muted hover:border-natural-accent/50 hover:text-natural-text'
                  }`}
                >
                  {pickLocalized(event.title, i18n.resolvedLanguage) ?? event.id}
                </button>
              ))}
            </div>
          )}

          {selected && (
            <div className="rounded-2xl border border-natural-border bg-white p-5">
              <div className="relative mb-5">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-natural-muted"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('pages.guestList.searchPlaceholder')}
                  className="w-full rounded-full border border-natural-border bg-natural-soft py-2 pr-3 pl-9 font-sans text-sm text-natural-text placeholder:text-natural-muted focus:border-natural-accent focus:outline-none"
                />
              </div>

              {rows.length === 0 ? (
                <p className="text-center font-sans text-sm text-natural-muted">
                  {t('pages.receptionSeating.layoutEmpty')}
                </p>
              ) : filteredRows.length === 0 ? (
                <p className="text-center font-sans text-sm text-natural-muted">
                  {t('pages.guestList.searchNoResults')}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] border-collapse">
                    <thead>
                      <tr className="border-b border-natural-border">
                        <th className="px-2 pb-2 text-left font-sans text-xs font-semibold uppercase tracking-widest text-natural-muted">
                          {t('pages.guestList.columnTable')}
                        </th>
                        <th className="px-2 pb-2 text-left font-sans text-xs font-semibold uppercase tracking-widest text-natural-muted">
                          {t('pages.guestList.columnGuest')}
                        </th>
                        <th className="px-2 pb-2 text-right font-sans text-xs font-semibold uppercase tracking-widest text-natural-muted">
                          {t('pages.guestList.columnAttendees')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-natural-border">
                      {filteredRows.map((row, idx) => (
                        <tr key={`${row.tableCode}-${row.guestName}-${idx}`}>
                          <td className="w-px px-2 py-2.5 whitespace-nowrap">
                            <span className="inline-block shrink-0 rounded-full bg-natural-accent/10 px-2 py-0.5 text-center font-sans text-xs font-medium text-natural-accent">
                              {row.tableCode || '—'}
                            </span>
                          </td>
                          <td className="px-2 py-2.5 font-sans text-sm text-natural-text">{row.guestName}</td>
                          <td className="px-2 py-2.5 text-right font-sans text-sm text-natural-muted">
                            {row.attendees}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}
