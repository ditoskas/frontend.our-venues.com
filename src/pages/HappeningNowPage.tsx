import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Sparkles } from 'lucide-react'
import { useCelebration } from '@/context/CelebrationContext'
import { pickLocalized } from '@/lib/localized'
import { getLiveEvents, type PublicLiveEventItem } from '@/lib/api/liveEvents'
import { AddLiveEventModal } from '@/components/live-events/AddLiveEventModal'
import { LiveEventsTimeline } from '@/components/live-events/LiveEventsTimeline'

// `celebrationInfo.showLive` gates this whole page — see CLAUDE.md
// "Talking to the backend" / PUBLIC-API.md's celebration route: the admin
// hasn't turned "Happening Now" on for this celebration, same
// comingSoon fallback PlaceholderPage renders for other not-yet-built pages.
export function HappeningNowPage() {
  const { t, i18n } = useTranslation()
  const { celebrationId, celebration } = useCelebration()
  const { showLive } = celebration.celebrationInfo

  const [items, setItems] = useState<PublicLiveEventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (!showLive) return
    let cancelled = false
    setLoading(true)
    setError(false)
    getLiveEvents(celebrationId)
      .then((data) => {
        if (!cancelled) setItems(data)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [celebrationId, showLive])

  if (!showLive) {
    return (
      <section className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center animate-fade-in">
        <h1 className="font-serif text-3xl font-semibold text-natural-text">{t('nav.happeningNow')}</h1>
        <p className="font-sans text-natural-muted">{t('pages.comingSoon')}</p>
      </section>
    )
  }

  const locationLabel = (eventId: string) => {
    const event = celebration.events.find((e) => e.id === eventId)
    return event ? pickLocalized(event.title, i18n.resolvedLanguage) : null
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
      <div className="mb-10 flex flex-col items-center gap-3 text-center">
        <Sparkles className="h-8 w-8 text-natural-accent" aria-hidden="true" />
        <h1 className="font-serif text-3xl font-normal text-natural-text">{t('nav.happeningNow')}</h1>
      </div>

      {celebration.events.length > 0 && (
        <div className="mb-10 flex justify-center">
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-full bg-natural-accent px-6 py-3 font-sans text-sm font-medium text-natural-bg transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t('pages.happeningNow.addButton')}
          </button>
        </div>
      )}

      {loading && (
        <p className="text-center font-sans text-sm text-natural-muted">{t('pages.happeningNow.loading')}</p>
      )}
      {!loading && error && (
        <p className="text-center font-sans text-sm text-red-600">{t('pages.happeningNow.loadError')}</p>
      )}
      {!loading && !error && items.length === 0 && (
        <p className="text-center font-sans text-sm text-natural-muted">{t('pages.happeningNow.empty')}</p>
      )}

      {!loading && !error && items.length > 0 && (
        <LiveEventsTimeline items={items} locationLabel={locationLabel} />
      )}

      {showModal && (
        <AddLiveEventModal
          onClose={() => setShowModal(false)}
          onCreated={(item) => setItems((prev) => [item, ...prev])}
        />
      )}
    </section>
  )
}
