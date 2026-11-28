import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { Check, ClipboardCheck, LogIn, RefreshCw, Search, Users, Wifi, WifiOff, X } from 'lucide-react'
import { resolveCelebrationId, routerBasename } from '@/lib/celebrationId'
import { pickLocalized } from '@/lib/localized'
import {
  getCheckinSnapshot,
  syncCheckins,
  type CheckinGuest,
  type CheckinRecord,
  type CheckinSnapshot,
} from '@/lib/api/checkin'
import {
  applyLocally,
  loadKey,
  loadQueue,
  loadSnapshot,
  saveKey,
  saveQueue,
  saveSnapshot,
} from '@/lib/checkinStore'
import { SeatingLayoutViewer } from '@/components/reception-seating/SeatingLayoutViewer'
import { LoadingScreen } from '@/components/LoadingScreen'

// Door check-in (route "checkin", outside CelebrationGate/PrivacySiteGate:
// it has its own access rule and must start with no network). Opened from
// the admin's Events tab (logged-in users) or a staff link (?key=…).
// Works offline after one online visit: the service worker keeps the page,
// localStorage keeps the data and the check-ins waiting to be synced.
// See CLAUDE.md "Door check-in".

type Access = 'ok' | 'needLogin' | 'invalidLink'

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

// Registers the check-in service worker for this page and asks it to keep
// the page and the files this first visit already loaded.
function useOfflineShell(): void {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const scope = `${routerBasename() ?? ''}/checkin`
    navigator.serviceWorker
      .register('/api/site/checkin-sw', { scope })
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => {
        const files = performance
          .getEntriesByType('resource')
          .map((entry) => entry.name)
          .filter((url) => {
            try {
              const u = new URL(url)
              return u.origin === location.origin && u.pathname.startsWith('/site/')
            } catch {
              return false
            }
          })
        registration.active?.postMessage({ type: 'precache', urls: [location.pathname, ...files] })
      })
      .catch(() => {
        // no offline support (e.g. not https) — the page still works online
      })
  }, [])
}

export function CheckinPage() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const online = useOnline()
  useOfflineShell()

  const guid = resolveCelebrationId(location.search)
  const params = new URLSearchParams(location.search)
  const urlKey = params.get('key')
  const requestedEvent = params.get('event')

  const [key] = useState<string | null>(() => {
    if (!guid) return null
    if (urlKey) {
      saveKey(guid, urlKey)
      return urlKey
    }
    return loadKey(guid)
  })
  const [stored, setStored] = useState(() => (guid ? loadSnapshot(guid) : null))
  const [queue, setQueue] = useState<CheckinRecord[]>(() => (guid ? loadQueue(guid) : []))
  // The queue as of now (state lags a render; storage may be blocked).
  const queueRef = useRef(queue)
  const syncingRef = useRef(false)
  const [access, setAccess] = useState<Access>('ok')
  const [loading, setLoading] = useState(() => !stored)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState(false)
  const [eventId, setEventId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [hideList, setHideList] = useState(false)
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null)
  const [dialogGuest, setDialogGuest] = useState<CheckinGuest | null>(null)
  const [participants, setParticipants] = useState(1)

  const keepSnapshot = useCallback(
    (snapshot: CheckinSnapshot) => {
      if (!guid) return
      saveSnapshot(guid, snapshot)
      setStored(loadSnapshot(guid))
    },
    [guid]
  )

  const handleAuthError = useCallback(
    (err: unknown) => {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setAccess(key ? 'invalidLink' : 'needLogin')
        return true
      }
      return false
    },
    [key]
  )

  // Fresh data whenever we're online (stored data is used meanwhile).
  useEffect(() => {
    if (!guid || !online) {
      setLoading(false)
      return
    }
    let cancelled = false
    getCheckinSnapshot(guid, key)
      .then((snapshot) => {
        if (cancelled) return
        keepSnapshot(snapshot)
        setAccess('ok')
      })
      .catch((err) => {
        if (!cancelled) handleAuthError(err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [guid, key, online, keepSnapshot, handleAuthError])

  const snapshot = useMemo(
    () => (stored ? applyLocally(stored.snapshot, queue) : null),
    [stored, queue]
  )

  // The event shown: ?event=…, else the first with seating, else the first.
  const events = snapshot?.events ?? []
  const activeEvent =
    events.find((e) => e.id === eventId) ??
    events.find((e) => e.id === requestedEvent) ??
    events.find((e) => e.hasSeating) ??
    events[0] ??
    null

  const lang = i18n.resolvedLanguage ?? 'el'
  const guests = useMemo(() => {
    const list = [...(snapshot?.guests ?? [])].sort((a, b) =>
      a.name.localeCompare(b.name, lang, { sensitivity: 'base' })
    )
    const q = normalize(query.trim())
    return q ? list.filter((g) => normalize(g.name).includes(q)) : list
  }, [snapshot, query, lang])

  const stats = useMemo(() => {
    if (!snapshot || !activeEvent) return { guests: 0, people: 0, total: 0 }
    let checked = 0
    let people = 0
    for (const g of snapshot.guests) {
      const a = g.attendance[activeEvent.id]
      if (a) {
        checked += 1
        people += a.actualParticipants
      }
    }
    return { guests: checked, people, total: snapshot.guests.length }
  }, [snapshot, activeEvent])

  const expectedOf = (g: CheckinGuest) => g.confirmedAttendees ?? g.expectedAttendees ?? 1

  const openDialog = (g: CheckinGuest) => {
    setSelectedGuestId(g.id)
    setDialogGuest(g)
    const current = activeEvent ? g.attendance[activeEvent.id] : undefined
    setParticipants(current?.actualParticipants ?? expectedOf(g))
  }

  const confirmCheckin = () => {
    if (!guid || !dialogGuest || !activeEvent) return
    const record: CheckinRecord = {
      guestId: dialogGuest.id,
      eventId: activeEvent.id,
      actualParticipants: Math.max(0, Math.min(100, Math.round(participants))),
      attendedAt: new Date().toISOString(),
    }
    const next = [...queueRef.current, record]
    queueRef.current = next
    saveQueue(guid, next)
    setQueue(next)
    setSyncError(false) // a new check-in retries a failed auto-sync
    setDialogGuest(null)
  }

  const sync = useCallback(async () => {
    if (!guid || syncingRef.current) return
    syncingRef.current = true
    setSyncing(true)
    setSyncError(false)
    const sending = queueRef.current
    try {
      const result = sending.length
        ? await syncCheckins(guid, key, sending)
        : { snapshot: await getCheckinSnapshot(guid, key) }
      keepSnapshot(result.snapshot)
      // Keep anything recorded while the request was in flight.
      const rest = queueRef.current.slice(sending.length)
      queueRef.current = rest
      saveQueue(guid, rest)
      setQueue(rest)
      setAccess('ok')
    } catch (err) {
      if (!handleAuthError(err)) setSyncError(true)
    } finally {
      syncingRef.current = false
      setSyncing(false)
    }
  }, [guid, key, keepSnapshot, handleAuthError])

  // Auto-sync: whenever we're online and check-ins are waiting — right after
  // a check-in, when the connection comes back, when the page reopens with
  // a queue, and again for anything recorded during a sync. A failed sync
  // isn't retried in a loop: the next check-in, reconnect or Sync tap does.
  useEffect(() => {
    if (online) setSyncError(false)
  }, [online])
  useEffect(() => {
    if (online && queue.length > 0 && !syncing && !syncError && access === 'ok' && stored) {
      void sync()
    }
  }, [online, queue, syncing, syncError, access, stored, sync])

  if (!guid) return <Message title={t('pages.checkin.notFound')} />
  if (loading) return <LoadingScreen />

  if (!snapshot) {
    if (access === 'needLogin') {
      const loginUrl = `/${lang}/login?redirect=${encodeURIComponent(location.pathname + location.search)}`
      return (
        <Message title={t('pages.checkin.loginTitle')} text={t('pages.checkin.loginText')}>
          <a
            href={loginUrl}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-natural-accent px-5 py-2 text-sm font-medium text-white"
          >
            <LogIn className="h-4 w-4" /> {t('pages.checkin.login')}
          </a>
        </Message>
      )
    }
    if (access === 'invalidLink') return <Message title={t('pages.checkin.invalidLink')} />
    return <Message title={t('pages.checkin.needsOnlineOnce')} />
  }

  const selectedGuest = snapshot.guests.find((g) => g.id === selectedGuestId) ?? null
  const myTableId =
    selectedGuest && activeEvent
      ? (selectedGuest.tableAssignments.find((a) => a.eventId === activeEvent.id)?.tableId ?? null)
      : null
  // The list can be hidden to see the floor plan on its own (only offered
  // when there is one, so the page is never left empty).
  const hasLayout = !!activeEvent?.hasSeating && activeEvent.seatingLayout.length > 0
  const timeFormat = new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 bg-natural-bg px-4 py-5 text-natural-text">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-serif text-2xl font-semibold">
            <ClipboardCheck className="h-6 w-6 text-natural-accent" /> {t('pages.checkin.title')}
          </h1>
          <p className="font-sans text-sm text-natural-muted">{snapshot.title}</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`flex items-center gap-1 text-xs ${online ? 'text-emerald-700' : 'text-red-600'}`}
            title={online ? t('pages.checkin.online') : t('pages.checkin.offline')}
          >
            {online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            {online ? t('pages.checkin.online') : t('pages.checkin.offline')}
          </span>
          <button
            type="button"
            onClick={sync}
            disabled={!online || syncing}
            className="inline-flex items-center gap-2 rounded-md bg-natural-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {t('pages.checkin.sync')}
            {queue.length > 0 && (
              <span className="rounded-full bg-white/25 px-2 text-xs">{queue.length}</span>
            )}
          </button>
        </div>
      </header>

      {access !== 'ok' && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {access === 'invalidLink' ? t('pages.checkin.invalidLink') : t('pages.checkin.loginExpired')}
        </p>
      )}
      {syncError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{t('pages.checkin.syncFailed')}</p>
      )}
      <p className="text-xs text-natural-muted">
        {t('pages.checkin.lastUpdated', { time: timeFormat.format(new Date(stored!.savedAt)) })}
        {queue.length > 0 && ` · ${t('pages.checkin.pending', { count: queue.length })}`}
      </p>

      {events.length > 1 && (
        <select
          value={activeEvent?.id ?? ''}
          onChange={(e) => setEventId(e.target.value)}
          className="rounded-md border border-natural-border bg-white px-3 py-2 text-sm"
          aria-label={t('pages.checkin.event')}
        >
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {pickLocalized(e.title, lang) ?? ''}
            </option>
          ))}
        </select>
      )}

      {!(hideList && hasLayout) && (
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-natural-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('pages.checkin.search')}
          className="w-full rounded-md border border-natural-border bg-white py-2 pr-3 pl-9 text-sm"
        />
      </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm text-natural-muted">
        <p className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          {t('pages.checkin.stats', { checked: stats.guests, total: stats.total, people: stats.people })}
        </p>
        {hasLayout && (
          <label className="flex cursor-pointer items-center gap-2 select-none">
            <input
              type="checkbox"
              checked={hideList}
              onChange={(e) => setHideList(e.target.checked)}
              className="h-4 w-4 accent-natural-accent"
            />
            {t('pages.checkin.hideList')}
          </label>
        )}
      </div>

      {!(hideList && hasLayout) && (
      <ul className="divide-y divide-natural-border overflow-hidden rounded-lg border border-natural-border bg-white">
        {guests.length === 0 && <li className="px-4 py-6 text-center text-sm text-natural-muted">{t('pages.checkin.noGuests')}</li>}
        {guests.map((g) => {
          const a = activeEvent ? g.attendance[activeEvent.id] : undefined
          return (
            <li key={g.id}>
              <button
                type="button"
                onClick={() => openDialog(g)}
                className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-natural-soft ${
                  a ? 'bg-emerald-50' : ''
                } ${selectedGuestId === g.id ? 'ring-2 ring-natural-accent ring-inset' : ''}`}
              >
                <span className="flex flex-col">
                  <span className="font-medium">{g.name}</span>
                  <span className="text-xs text-natural-muted">
                    {t('pages.checkin.expected', { count: expectedOf(g) })}
                    {g.declined && ` · ${t('pages.checkin.declined')}`}
                  </span>
                </span>
                {a ? (
                  <span className="flex items-center gap-1 text-sm whitespace-nowrap text-emerald-700">
                    <Check className="h-4 w-4" />
                    {t('pages.checkin.arrived', {
                      count: a.actualParticipants,
                      time: timeFormat.format(new Date(a.attendedAt)),
                    })}
                  </span>
                ) : (
                  <span className="text-xs text-natural-muted">{t('pages.checkin.notArrived')}</span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
      )}

      {hasLayout && activeEvent && (
        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-lg">{t('pages.checkin.layout')}</h2>
          <SeatingLayoutViewer elements={activeEvent.seatingLayout} myTableId={myTableId} />
        </section>
      )}

      {dialogGuest && activeEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setDialogGuest(null)}
        >
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-serif text-xl">{dialogGuest.name}</h3>
                <p className="text-sm text-natural-muted">
                  {pickLocalized(activeEvent.title, lang)} · {t('pages.checkin.expected', { count: expectedOf(dialogGuest) })}
                </p>
              </div>
              <button type="button" onClick={() => setDialogGuest(null)} aria-label={t('pages.checkin.cancel')}>
                <X className="h-5 w-5 text-natural-muted" />
              </button>
            </div>
            <label className="flex flex-col gap-1 text-sm">
              {t('pages.checkin.participants')}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setParticipants((n) => Math.max(0, n - 1))}
                  className="h-10 w-10 rounded-md border border-natural-border text-lg"
                >
                  −
                </button>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={participants}
                  onChange={(e) => setParticipants(Number(e.target.value) || 0)}
                  className="w-20 rounded-md border border-natural-border px-3 py-2 text-center text-lg"
                />
                <button
                  type="button"
                  onClick={() => setParticipants((n) => Math.min(100, n + 1))}
                  className="h-10 w-10 rounded-md border border-natural-border text-lg"
                >
                  +
                </button>
              </div>
            </label>
            <button
              type="button"
              onClick={confirmCheckin}
              className="mt-5 w-full rounded-md bg-natural-accent py-3 text-base font-medium text-white"
            >
              {t('pages.checkin.confirm')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Message({ title, text, children }: { title: string; text?: string; children?: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-natural-bg px-6 text-center text-natural-text">
      <ClipboardCheck className="mb-3 h-8 w-8 text-natural-accent" />
      <h1 className="font-serif text-2xl">{title}</h1>
      {text && <p className="mt-2 max-w-sm text-sm text-natural-muted">{text}</p>}
      {children}
    </div>
  )
}
