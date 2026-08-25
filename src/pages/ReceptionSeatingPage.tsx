import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Users, X } from 'lucide-react'
import { useCelebration } from '@/context/CelebrationContext'
import { pickLocalized } from '@/lib/localized'
import { selectSeatingCandidates } from '@/lib/seatingEvents'
import { SeatingLayoutViewer } from '@/components/reception-seating/SeatingLayoutViewer'
import {
  getSeatingAssignments,
  type SeatingTableAssignment,
  type MySeatingAssignment,
} from '@/lib/api/seating'
import { getVerifiedGuestSession } from '@/lib/guestSessionStorage'

// `celebrationInfo.showSeating` gates this whole page, same pattern as
// HappeningNowPage's showLive — see PUBLIC-API.md's celebration route.
export function ReceptionSeatingPage() {
  const { t, i18n } = useTranslation()
  const { celebrationId, celebration } = useCelebration()
  const { showSeating } = celebration.celebrationInfo

  const seatingEvents = useMemo(
    () => celebration.events.filter((event) => event.hasSeating),
    [celebration.events]
  )

  // Captured once via a lazy initializer (not called fresh on every render
  // — that would be an impure render) rather than re-evaluated on a timer:
  // a guest reopens/refreshes the page across a multi-hour reception far
  // more naturally than this needing to auto-advance while left open.
  const [now] = useState(() => Date.now())
  const candidates = useMemo(() => selectSeatingCandidates(seatingEvents, now), [seatingEvents, now])

  const [selectedId, setSelectedId] = useState<string | null>(candidates[0]?.id ?? null)
  const selected = candidates.find((event) => event.id === selectedId) ?? candidates[0] ?? null

  // Who's assigned where (guest names) and, if this browser has a verified
  // guest session (guestSessionStorage.ts — set by GuestLoginForm elsewhere
  // in the app), that guest's own table(s) — see PUBLIC-API.md's
  // GET /api/public/celebration/{guid}/seating. Best-effort: if it fails,
  // the page still works, just without the names panel/"your table" mark.
  const [tables, setTables] = useState<SeatingTableAssignment[]>([])
  const [myAssignments, setMyAssignments] = useState<MySeatingAssignment[]>([])
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!showSeating) return
    const token = getVerifiedGuestSession(celebrationId)?.token ?? null
    getSeatingAssignments(celebrationId, token)
      .then((data) => {
        setTables(data.tables)
        setMyAssignments(data.myAssignments)
      })
      .catch(() => {
        // Silent — see comment above.
      })
  }, [celebrationId, showSeating])

  // A tableId/search query only makes sense within the event they belong
  // to — drop the open names panel and any in-progress search when
  // switching which event's layout is shown (pills).
  useEffect(() => {
    setSelectedTableId(null)
    setSearchQuery('')
  }, [selected?.id])

  // Every (table, guest) pair for the selected event, flattened so the name
  // search below can filter across tables in one pass instead of nesting a
  // second .find() per keystroke.
  const searchableGuests = useMemo(() => {
    if (!selected) return []
    return tables
      .filter((tbl) => tbl.eventId === selected.id)
      .flatMap((tbl) =>
        tbl.guests.map((guest) => ({
          tableId: tbl.tableId,
          code: selected.seatingLayout.find((el) => el.id === tbl.tableId)?.code ?? '',
          name: guest.name,
        }))
      )
  }, [tables, selected])

  const trimmedQuery = searchQuery.trim()
  const searchResults = useMemo(() => {
    if (!trimmedQuery) return []
    const needle = trimmedQuery.toLowerCase()
    return searchableGuests.filter((guest) => guest.name.toLowerCase().includes(needle))
  }, [searchableGuests, trimmedQuery])

  if (!showSeating) {
    return (
      <section className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center animate-fade-in">
        <h1 className="font-serif text-3xl font-semibold text-natural-text">{t('nav.receptionSeating')}</h1>
        <p className="font-sans text-natural-muted">{t('pages.comingSoon')}</p>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
      <div className="mb-10 flex flex-col items-center gap-3 text-center">
        <Users className="h-8 w-8 text-natural-accent" aria-hidden="true" />
        <h1 className="font-serif text-3xl font-normal text-natural-text">{t('nav.receptionSeating')}</h1>
      </div>

      {seatingEvents.length === 0 ? (
        <p className="text-center font-sans text-sm text-natural-muted">
          {t('pages.receptionSeating.empty')}
        </p>
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
            <>
              <div className="mb-6 text-center">
                <h2 className="font-serif text-xl text-natural-text">
                  {pickLocalized(selected.title, i18n.resolvedLanguage)}
                </h2>
                {selected.date && (
                  <p className="mt-1 font-sans text-xs uppercase tracking-widest text-natural-muted">
                    {new Intl.DateTimeFormat(i18n.resolvedLanguage, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(selected.date))}
                  </p>
                )}
              </div>

              {selected.seatingLayout.length === 0 ? (
                <p className="text-center font-sans text-sm text-natural-muted">
                  {t('pages.receptionSeating.layoutEmpty')}
                </p>
              ) : (
                <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">
                  <div className="min-w-0 flex-1">
                    <SeatingLayoutViewer
                      elements={selected.seatingLayout}
                      myTableId={myAssignments.find((a) => a.eventId === selected.id)?.tableId ?? null}
                      selectedTableId={selectedTableId}
                      onSelectTable={(element) =>
                        setSelectedTableId((prev) => (prev === element.id ? null : element.id))
                      }
                    />
                  </div>

                  {/* Always visible (not just once a table's clicked) — a
                      persistent column next to the layout, stretched via
                      lg:items-stretch above to match the canvas's own
                      (dynamically scaled) height, own inner scroll for a
                      guest list taller than that. */}
                  <div className="flex w-full shrink-0 flex-col rounded-2xl border border-natural-border bg-white p-5 lg:w-72">
                    <div className="relative mb-4 shrink-0">
                      <Search
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-natural-muted"
                        aria-hidden="true"
                      />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('pages.receptionSeating.searchPlaceholder')}
                        className="w-full rounded-full border border-natural-border bg-natural-soft py-2 pr-3 pl-9 font-sans text-sm text-natural-text placeholder:text-natural-muted focus:border-natural-accent focus:outline-none"
                      />
                    </div>

                    {trimmedQuery ? (
                      <div className="flex-1 overflow-y-auto">
                        {searchResults.length > 0 ? (
                          <ul className="flex flex-col gap-1">
                            {searchResults.map((result, idx) => (
                              <li key={`${result.tableId}-${result.name}-${idx}`}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedTableId(result.tableId)
                                    setSearchQuery('')
                                  }}
                                  className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left font-sans text-sm text-natural-text transition-colors hover:bg-natural-soft"
                                >
                                  <span>{result.name}</span>
                                  {result.code && (
                                    <span className="shrink-0 rounded-full bg-natural-accent/10 px-2 py-0.5 text-xs font-medium text-natural-accent">
                                      {result.code}
                                    </span>
                                  )}
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="font-sans text-sm text-natural-muted">
                            {t('pages.receptionSeating.searchNoResults')}
                          </p>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="mb-3 flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-serif text-base text-natural-text">
                              {selectedTableId
                                ? t('pages.receptionSeating.tableGuestsTitle', {
                                    code:
                                      selected.seatingLayout.find((el) => el.id === selectedTableId)?.code ?? '',
                                  })
                                : t('pages.receptionSeating.tableGuestsDefaultTitle')}
                            </h3>
                            {selectedTableId &&
                              (() => {
                                const maxPeople = selected.seatingLayout.find(
                                  (el) => el.id === selectedTableId
                                )?.maxPeople
                                return maxPeople != null ? (
                                  <p className="mt-0.5 font-sans text-xs text-natural-muted">
                                    {t('pages.receptionSeating.tableMaxPeople', { count: maxPeople })}
                                  </p>
                                ) : null
                              })()}
                          </div>
                          {selectedTableId && (
                            <button
                              type="button"
                              onClick={() => setSelectedTableId(null)}
                              aria-label={t('pages.receptionSeating.closePanel')}
                              className="shrink-0 rounded-full p-1 text-natural-muted transition hover:bg-natural-soft hover:text-natural-text"
                            >
                              <X className="h-4 w-4" aria-hidden="true" />
                            </button>
                          )}
                        </div>

                        <div className="flex-1 overflow-y-auto">
                          {!selectedTableId ? (
                            <p className="font-sans text-sm text-natural-muted">
                              {t('pages.receptionSeating.selectTablePrompt')}
                            </p>
                          ) : (
                            (() => {
                              const tableGuests =
                                tables.find(
                                  (tbl) => tbl.eventId === selected.id && tbl.tableId === selectedTableId
                                )?.guests ?? []

                              return tableGuests.length > 0 ? (
                                <ul className="flex flex-col gap-1.5">
                                  {tableGuests.map((guest, idx) => (
                                    <li
                                      key={`${guest.name}-${idx}`}
                                      className="flex items-baseline justify-between gap-2 font-sans text-sm text-natural-text"
                                    >
                                      <span>{guest.name}</span>
                                      <span className="shrink-0 text-xs text-natural-muted">
                                        {t('pages.receptionSeating.guestAttendees', { count: guest.attendees })}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="font-sans text-sm text-natural-muted">
                                  {t('pages.receptionSeating.noGuestsAtTable')}
                                </p>
                              )
                            })()
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  )
}
