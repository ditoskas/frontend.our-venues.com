import { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useTranslation } from 'react-i18next'
import { MapPin, Navigation, CalendarClock } from 'lucide-react'
import { useCelebration } from '@/context/CelebrationContext'
import { pickLocalized } from '@/lib/localized'
import { loadGoogleMaps } from '@/lib/googleMaps'
import type { CelebrationEvent } from '@/lib/api/celebrations'

// Athens — a reasonable default center when no event has a map point yet,
// same fallback the admin's own map picker uses (backend
// GoogleMapPicker.tsx), so an empty/unconfigured celebration still centers
// somewhere sensible instead of the middle of the ocean (0,0).
const DEFAULT_CENTER = { lat: 37.9838, lng: 23.7275 }

const PAST_MARKER_COLOR = '#b8b8a8'
const FUTURE_MARKER_COLOR = '#7c7c5c'
const MARKER_SIZE = 30

// A filled map-pin teardrop (the exact outline lucide-react's own MapPin
// icon uses, so the marker on the map echoes the same shape as
// `pages.events.noLocation`'s inline icon below) with a light circle
// "hole" punched near the top, standard classic-pin look — used instead of
// Google's default red pin / a plain flat circle.
function pinIconUrl(color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${MARKER_SIZE}" height="${MARKER_SIZE}" viewBox="0 0 24 24"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" fill="${color}" stroke="#fdfbf7" stroke-width="1"/><circle cx="12" cy="10" r="3.4" fill="#fdfbf7"/></svg>`
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function pinIcon(g: typeof google, past: boolean): google.maps.Icon {
  return {
    url: pinIconUrl(past ? PAST_MARKER_COLOR : FUTURE_MARKER_COLOR),
    scaledSize: new g.maps.Size(MARKER_SIZE, MARKER_SIZE),
    anchor: new g.maps.Point(MARKER_SIZE / 2, MARKER_SIZE - 3),
  }
}

function hasPoint(event: CelebrationEvent): event is CelebrationEvent & { mapLat: number; mapLng: number } {
  return event.mapLat != null && event.mapLng != null
}

function isPastEvent(event: CelebrationEvent): boolean {
  return event.date != null && new Date(event.date).getTime() < Date.now()
}

// Latest date first, per the requested sort order; events with no date at
// all (never geocoded/scheduled by the admin) sort last since there's
// nothing to rank them by.
function sortEventsDesc(events: CelebrationEvent[]): CelebrationEvent[] {
  return [...events].sort((a, b) => {
    if (!a.date && !b.date) return 0
    if (!a.date) return 1
    if (!b.date) return -1
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })
}

function directionsUrl(event: CelebrationEvent): string | null {
  if (hasPoint(event)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${event.mapLat},${event.mapLng}`
  }
  const address = [event.address, event.city, event.postCode, event.country].filter(Boolean).join(', ')
  return address ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}` : null
}

interface EventInfoCardProps {
  title: string
  dateLabel: string | null
  areaLabel: string | null
  addressLabel: string | null
  description: string | null
  directionsHref: string | null
  directionsLabel: string
  pastLabel: string | null
}

// Rendered into a detached container and handed to a native
// google.maps.InfoWindow via setContent() — the InfoWindow itself isn't a
// React tree, so this receives plain, already-localized/formatted strings
// as props rather than calling useTranslation()/pickLocalized() itself.
function EventInfoCard({
  title,
  dateLabel,
  areaLabel,
  addressLabel,
  description,
  directionsHref,
  directionsLabel,
  pastLabel,
}: EventInfoCardProps) {
  return (
    <div className="flex max-w-xs flex-col gap-1.5 py-1 pr-5 font-sans">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-serif text-base leading-snug text-natural-text">{title}</h3>
        {pastLabel && (
          <span className="shrink-0 rounded-full bg-natural-soft px-2 py-0.5 text-[10px] font-medium tracking-wide text-natural-muted uppercase">
            {pastLabel}
          </span>
        )}
      </div>
      {dateLabel && <p className="text-xs text-natural-accent">{dateLabel}</p>}
      {areaLabel && (
        <p className="text-[11px] font-medium tracking-wide text-natural-muted uppercase">{areaLabel}</p>
      )}
      {addressLabel && <p className="text-xs text-natural-muted">{addressLabel}</p>}
      {description && <p className="text-xs leading-relaxed text-natural-text">{description}</p>}
      {directionsHref && (
        <a
          href={directionsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-natural-accent hover:underline"
        >
          {directionsLabel}
        </a>
      )}
    </div>
  )
}

export function EventsPage() {
  const { t, i18n } = useTranslation()
  const { celebration } = useCelebration()

  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapObjRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map())
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)
  const infoRootRef = useRef<Root | null>(null)
  const infoContainerRef = useRef<HTMLDivElement | null>(null)

  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'no-key'>('loading')
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  const events = useMemo(() => sortEventsDesc(celebration.events), [celebration.events])
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(iso)
    )

  const openInfoFor = (event: CelebrationEvent) => {
    if (!hasPoint(event)) return
    const g = window.google
    const map = mapObjRef.current
    if (!g || !map) return

    if (!infoWindowRef.current) {
      infoWindowRef.current = new g.maps.InfoWindow()
    }
    if (!infoContainerRef.current) {
      infoContainerRef.current = document.createElement('div')
      infoRootRef.current = createRoot(infoContainerRef.current)
    }

    infoRootRef.current!.render(
      <EventInfoCard
        title={pickLocalized(event.title, i18n.resolvedLanguage) ?? ''}
        dateLabel={event.date ? formatDate(event.date) : null}
        areaLabel={event.area}
        addressLabel={[event.address, event.city, event.postCode, event.country].filter(Boolean).join(', ') || null}
        description={pickLocalized(event.description, i18n.resolvedLanguage)}
        directionsHref={directionsUrl(event)}
        directionsLabel={t('pages.events.directions')}
        pastLabel={isPastEvent(event) ? t('pages.events.past') : null}
      />
    )

    infoWindowRef.current.setPosition({ lat: event.mapLat, lng: event.mapLng })
    infoWindowRef.current.setContent(infoContainerRef.current)
    infoWindowRef.current.open(map)
    map.panTo({ lat: event.mapLat, lng: event.mapLng })
    setSelectedEventId(event.id)
  }

  useEffect(() => {
    if (!apiKey) {
      setStatus('no-key')
      return
    }
    if (!mapDivRef.current) return

    let cancelled = false
    const markers = markersRef.current

    loadGoogleMaps(apiKey)
      .then((g) => {
        if (cancelled || !mapDivRef.current) return

        const map = new g.maps.Map(mapDivRef.current, {
          center: DEFAULT_CENTER,
          zoom: 6,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        })
        mapObjRef.current = map

        const points = events.filter(hasPoint)
        if (points.length === 1) {
          map.setCenter({ lat: points[0].mapLat, lng: points[0].mapLng })
          map.setZoom(15)
        } else if (points.length > 1) {
          const bounds = new g.maps.LatLngBounds()
          points.forEach((p) => bounds.extend({ lat: p.mapLat, lng: p.mapLng }))
          map.fitBounds(bounds, 64)
        }

        for (const event of points) {
          const marker = new g.maps.Marker({
            position: { lat: event.mapLat, lng: event.mapLng },
            map,
            title: pickLocalized(event.title, i18n.resolvedLanguage) ?? undefined,
            icon: pinIcon(g, isPastEvent(event)),
          })
          marker.addListener('click', () => openInfoFor(event))
          markers.set(event.id, marker)
        }

        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
      markers.forEach((marker) => marker.setMap(null))
      markers.clear()
    }
    // Mount-only, same reasoning as backend's GoogleMapPicker — celebration
    // data is fetched once and doesn't change during this page's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey])

  const handleListItemClick = (event: CelebrationEvent) => {
    if (hasPoint(event)) openInfoFor(event)
  }

  return (
    <div className="flex h-[calc(100vh-4.5rem)] flex-col md:h-[calc(100vh-5rem)] md:flex-row">
      <aside className="order-2 flex h-64 shrink-0 flex-col overflow-y-auto border-t border-natural-border bg-white md:order-1 md:h-full md:w-96 md:border-t-0 md:border-r">
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-natural-border bg-white px-5 py-4">
          <CalendarClock className="h-4 w-4 text-natural-accent" aria-hidden="true" />
          <h1 className="font-serif text-lg text-natural-text">{t('nav.events')}</h1>
        </div>

        {events.length === 0 ? (
          <p className="px-5 py-6 text-center font-sans text-sm text-natural-muted">
            {t('pages.events.empty')}
          </p>
        ) : (
          <ul className="divide-y divide-natural-border">
            {events.map((event) => {
              const clickable = hasPoint(event)
              const past = isPastEvent(event)
              const selected = selectedEventId === event.id
              return (
                <li key={event.id}>
                  <button
                    type="button"
                    onClick={() => handleListItemClick(event)}
                    disabled={!clickable}
                    className={`flex w-full flex-col gap-1 px-5 py-4 text-left transition-colors ${
                      clickable ? 'cursor-pointer hover:bg-natural-soft' : 'cursor-default'
                    } ${selected ? 'bg-natural-soft' : ''} ${past ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-serif text-sm text-natural-text">
                        {pickLocalized(event.title, i18n.resolvedLanguage)}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase ${
                          past ? 'bg-natural-soft text-natural-muted' : 'bg-natural-accent/15 text-natural-accent'
                        }`}
                      >
                        {past ? t('pages.events.past') : t('pages.events.upcoming')}
                      </span>
                    </div>
                    {event.date && (
                      <span className="text-xs text-natural-muted">{formatDate(event.date)}</span>
                    )}
                    {event.area && (
                      <span className="text-[11px] font-medium tracking-wide text-natural-accent uppercase">
                        {event.area}
                      </span>
                    )}
                    {!clickable && (
                      <span className="flex items-center gap-1 text-[11px] text-natural-muted italic">
                        <MapPin className="h-3 w-3" aria-hidden="true" />
                        {t('pages.events.noLocation')}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </aside>

      <div className="relative order-1 flex-1 md:order-2">
        <div ref={mapDivRef} className="absolute inset-0" />

        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-natural-bg">
            <p className="font-sans text-sm text-natural-muted">{t('pages.events.loading')}</p>
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-natural-bg">
            <p className="font-sans text-sm text-red-600">{t('pages.events.loadError')}</p>
          </div>
        )}
        {status === 'no-key' && (
          <div className="absolute inset-0 flex items-center justify-center bg-natural-bg px-4 text-center">
            <p className="font-sans text-sm text-natural-muted">
              <Navigation className="mx-auto mb-2 h-6 w-6 text-natural-muted" aria-hidden="true" />
              {t('pages.events.noKey')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
