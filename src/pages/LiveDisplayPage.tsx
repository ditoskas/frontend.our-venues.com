import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCelebration } from '@/context/CelebrationContext'
import { Monogram } from '@/components/Monogram'
import { resolveBackendAssetUrl } from '@/lib/apiClient'
import { pickLocalized } from '@/lib/localized'
import { getLiveEvents, type PublicLiveEventItem } from '@/lib/api/liveEvents'
import { LiveEventsTimeline } from '@/components/live-events/LiveEventsTimeline'
import { FALLBACK_HERO_IMAGE } from '@/components/invitation/Hero'

const POLL_INTERVAL_MS = 5000

/** Same ids in the same order — used to skip a state update (and the resulting re-render) when a poll comes back with nothing new. */
function sameIds(a: PublicLiveEventItem[], b: PublicLiveEventItem[]): boolean {
  if (a.length !== b.length) return false
  return a.every((item, idx) => item.id === b[idx].id)
}

/**
 * The navbar-less `/live` route — meant to run unattended on a projector or
 * TV at the venue, not for guest navigation (see App.tsx: it sits under
 * CelebrationGate but outside PrivacySiteGate/MainLayout, so there's no
 * access gate and no nav chrome). Centered monogram/couple-names/date up
 * top, the Live Events feed below as a read-only timeline (see
 * LiveEventsTimeline) — no "Add Photo" button, no loading/empty/error copy.
 *
 * Polls GET /api/public/celebration/{guid}/live-events every 5s in the
 * background and only swaps in the fresh list when the set of ids actually
 * changed, so most ticks are a no-op render-wise — new photos simply
 * appear at the top (the feed is already sorted newest-first server-side)
 * with no visible loading state or flicker on items that were already
 * showing.
 *
 * While there are no live-event photos yet (nothing posted, or `showLive`
 * off), the timeline is replaced by the same hero banner image the
 * Invitation page's Hero section uses (`celebrationInfo.heroBackgroundUrl`,
 * same fallback), so the screen never sits on blank space, plus a fixed
 * "share your memories" prompt above it.
 */
export function LiveDisplayPage() {
  const { t, i18n } = useTranslation()
  const { celebrationId, celebration } = useCelebration()
  const { husband, wife } = celebration.coupleInfo
  const { showLive, heroBackgroundUrl } = celebration.celebrationInfo

  const [items, setItems] = useState<PublicLiveEventItem[]>([])
  const itemsRef = useRef(items)
  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    if (!showLive) return
    let cancelled = false

    const poll = () => {
      getLiveEvents(celebrationId)
        .then((data) => {
          if (cancelled) return
          if (!sameIds(data, itemsRef.current)) setItems(data)
        })
        .catch(() => {
          // Silent by design — this page has no error UI, it just tries again next tick.
        })
    }

    poll()
    const interval = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [celebrationId, showLive])

  const locationLabel = (eventId: string) => {
    const event = celebration.events.find((e) => e.id === eventId)
    return event ? pickLocalized(event.title, i18n.resolvedLanguage) : null
  }

  return (
    <div className="min-h-screen bg-natural-bg">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
        <div className="mb-14 flex justify-center">
          <Monogram
            name1={husband.firstName}
            name2={wife.firstName}
            date={celebration.celebrationInfo.celebrationDate}
            type={celebration.type}
          />
        </div>

        {showLive && items.length > 0 ? (
          <LiveEventsTimeline items={items} locationLabel={locationLabel} />
        ) : (
          <div className="flex flex-col items-center gap-6">
            <p className="text-center font-serif text-xl text-natural-text">
              {t('pages.live.shareMemories')}
            </p>
            <div className="w-full overflow-hidden rounded-[32px] border border-natural-border bg-white p-2 shadow-xs">
              <div className="relative aspect-[21/9] overflow-hidden rounded-[24px] bg-stone-900">
                <img
                  src={heroBackgroundUrl ? resolveBackendAssetUrl(heroBackgroundUrl) : FALLBACK_HERO_IMAGE}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover opacity-90"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
