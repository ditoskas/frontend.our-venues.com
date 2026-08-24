import { Heart } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useCelebration } from '@/context/CelebrationContext'
import { resolveBackendAssetUrl } from '@/lib/apiClient'
import { pickLocalized } from '@/lib/localized'

export function StorySection() {
  const { t, i18n } = useTranslation()
  const { celebration } = useCelebration()
  const { story, timeline } = celebration
  const storyTitle = pickLocalized(story.title, i18n.resolvedLanguage)
  const storySubtitle = pickLocalized(story.subtitle, i18n.resolvedLanguage)
  const storyParagraph = pickLocalized(story.paragraph, i18n.resolvedLanguage)

  if (timeline.length === 0) return null

  return (
    <section className="py-12 md:py-16">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-12 text-center">
          <Heart className="mx-auto mb-3 h-6 w-6 animate-pulse text-natural-accent" aria-hidden="true" />
          <h2 className="font-serif text-3xl font-normal tracking-tight text-natural-text md:text-4xl">
            {storyTitle ?? t('pages.invitation.storyTitleFallback')}
          </h2>
          {storySubtitle && (
            <p className="mt-2 font-sans text-xs uppercase tracking-widest text-natural-muted">
              {storySubtitle}
            </p>
          )}
          <div className="mx-auto mt-4 h-px w-12 bg-natural-border" />
        </div>

        {storyParagraph && (
          <p className="mx-auto mb-12 max-w-2xl text-center font-sans text-sm font-light leading-relaxed text-natural-muted">
            {storyParagraph}
          </p>
        )}

        <div className="relative ml-4 border-l border-natural-border md:ml-0 md:border-l-0 md:before:absolute md:before:top-0 md:before:bottom-0 md:before:left-1/2 md:before:w-px md:before:bg-natural-border">
          {timeline.map((item, idx) => {
            const isEven = idx % 2 === 0
            const year = item.date ? new Date(item.date).getFullYear() : null
            const imageUrl = item.imageUrl ? resolveBackendAssetUrl(item.imageUrl) : null
            const title = pickLocalized(item.title, i18n.resolvedLanguage)
            const description = pickLocalized(item.description, i18n.resolvedLanguage)

            return (
              <div
                key={item.id}
                className={`relative mb-12 last:mb-0 md:grid md:grid-cols-2 md:items-center md:gap-16 ${
                  isEven ? 'md:grid-flow-row' : 'md:grid-flow-row-dense'
                }`}
              >
                {year && (
                  <div className="absolute left-[-17px] top-6 z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-natural-accent/60 bg-white font-sans text-[9px] font-semibold text-natural-accent shadow-sm md:left-1/2 md:translate-x-[-16px]">
                    {String(year).slice(2)}
                  </div>
                )}

                <div className={`pl-8 md:pl-0 ${isEven ? 'md:pr-10 md:text-right' : 'md:col-start-2 md:pl-10'}`}>
                  {year && (
                    <span className="mb-3 inline-block rounded-full border border-natural-border bg-natural-soft px-2.5 py-0.5 font-sans text-xs font-medium uppercase tracking-widest text-natural-accent">
                      {year}
                    </span>
                  )}
                  <h3 className="mb-3 font-serif text-xl font-normal text-natural-text md:text-2xl">
                    {title}
                  </h3>
                  {description && (
                    <p className="font-sans text-sm font-light leading-relaxed text-natural-muted">
                      {description}
                    </p>
                  )}
                </div>

                {imageUrl && (
                  <div
                    className={`mt-4 pl-8 md:mt-0 md:pl-0 ${isEven ? 'md:col-start-2 md:pl-10' : 'md:col-start-1 md:pr-10'}`}
                  >
                    <div className="group overflow-hidden rounded-[32px] border border-natural-border bg-white p-2 shadow-xs">
                      <div className="relative aspect-[4/3] overflow-hidden rounded-[24px] bg-natural-soft">
                        <img
                          src={imageUrl}
                          alt={title ?? ''}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
