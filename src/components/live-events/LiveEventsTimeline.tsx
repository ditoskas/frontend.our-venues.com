import { useTranslation } from 'react-i18next'
import { Camera } from 'lucide-react'
import { resolveBackendAssetUrl } from '@/lib/apiClient'
import type { PublicLiveEventItem } from '@/lib/api/liveEvents'

interface LiveEventsTimelineProps {
  items: PublicLiveEventItem[]
  locationLabel: (eventId: string) => string | null
}

/**
 * The vertical timeline used to display the Live Events / "Happening Now"
 * feed — shared by HappeningNowPage (the guest-facing page, with its own
 * "Add Photo" button and loading/empty/error copy around this) and
 * LiveDisplayPage (the navbar-less `/live` projector view, which renders
 * just this). Mirrors StorySection.tsx's timeline treatment (the couple's
 * story on the Invitation page) so the two "timeline" surfaces in this app
 * read as one consistent visual language. `items` is expected pre-sorted
 * (newest first, as GET /api/public/celebration/{guid}/live-events already
 * returns it) — this component doesn't re-sort.
 */
export function LiveEventsTimeline({ items, locationLabel }: LiveEventsTimelineProps) {
  const { i18n } = useTranslation()

  return (
    <div className="relative ml-4 border-l border-natural-border md:ml-0 md:border-l-0 md:before:absolute md:before:top-0 md:before:bottom-0 md:before:left-1/2 md:before:w-px md:before:bg-natural-border">
      {items.map((item, idx) => {
        const isEven = idx % 2 === 0
        const location = locationLabel(item.eventId)
        const postedAt = new Intl.DateTimeFormat(i18n.resolvedLanguage, {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date(item.uploadedAt))

        return (
          <div
            key={item.id}
            className={`relative mb-12 last:mb-0 md:grid md:grid-cols-2 md:items-center md:gap-16 ${
              isEven ? 'md:grid-flow-row' : 'md:grid-flow-row-dense'
            }`}
          >
            <div className="absolute left-[-17px] top-6 z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-natural-accent/60 bg-white text-natural-accent shadow-sm md:left-1/2 md:translate-x-[-16px]">
              <Camera className="h-3.5 w-3.5" aria-hidden="true" />
            </div>

            <div className={`pl-8 md:pl-0 ${isEven ? 'md:pr-10 md:text-right' : 'md:col-start-2 md:pl-10'}`}>
              <div
                className={`mb-3 flex flex-wrap items-center gap-2 font-sans text-xs uppercase tracking-widest ${
                  isEven ? 'md:justify-end' : ''
                }`}
              >
                {location && (
                  <span className="rounded-full border border-natural-border bg-natural-soft px-2.5 py-0.5 font-medium text-natural-accent">
                    {location}
                  </span>
                )}
                <span className="text-natural-muted normal-case tracking-normal">{postedAt}</span>
              </div>
              <h2 className="mb-3 font-serif text-xl font-normal text-natural-text md:text-2xl">
                {item.title}
              </h2>
              {item.description && (
                <p className="font-sans text-sm font-light leading-relaxed text-natural-muted">
                  {item.description}
                </p>
              )}
            </div>

            <div
              className={`mt-4 pl-8 md:mt-0 md:pl-0 ${isEven ? 'md:col-start-2 md:pl-10' : 'md:col-start-1 md:pr-10'}`}
            >
              <div className="group overflow-hidden rounded-[32px] border border-natural-border bg-white p-2 shadow-xs">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[24px] bg-natural-soft">
                  {/* eslint-disable-next-line jsx-a11y/alt-text -- alt is set below from item.title */}
                  <img
                    src={resolveBackendAssetUrl(item.imageUrl)}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
