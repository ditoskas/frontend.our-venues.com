import { Heart, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useCelebration } from '@/context/CelebrationContext'
import { resolveBackendAssetUrl } from '@/lib/apiClient'
import { pickLocalized } from '@/lib/localized'

const FALLBACK_HERO_IMAGE =
  'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1920&q=80'

export function Hero() {
  const { t, i18n } = useTranslation()
  const { celebration } = useCelebration()
  const { husband, wife } = celebration.coupleInfo
  const { celebrationDate, headline, quote, heroBackgroundUrl } = celebration.celebrationInfo
  const isMarriage = celebration.type === 'Marriage'

  const localizedHeadline = pickLocalized(headline, i18n.resolvedLanguage)
  const localizedQuote = pickLocalized(quote, i18n.resolvedLanguage)

  const backgroundImage = heroBackgroundUrl
    ? resolveBackendAssetUrl(heroBackgroundUrl)
    : FALLBACK_HERO_IMAGE

  const formattedDate = celebrationDate
    ? new Intl.DateTimeFormat(i18n.resolvedLanguage, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date(celebrationDate))
    : null

  return (
    <section className="relative flex h-[85vh] min-h-[500px] w-full items-center justify-center overflow-hidden bg-stone-900">
      <div className="absolute inset-0 z-0">
        <img
          src={backgroundImage}
          alt=""
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-900/40 to-stone-950/70" />
      </div>

      <div className="relative z-10 flex max-w-4xl flex-col items-center px-6 text-center text-white">
        <Heart className="mb-4 h-10 w-10 animate-pulse text-natural-accent opacity-90" aria-hidden="true" />

        {formattedDate && (
          <div className="mb-4 flex items-center gap-3">
            <span className="h-px w-6 bg-natural-accent/60 sm:w-12" />
            <span className="font-sans text-[10px] font-semibold uppercase tracking-widest text-natural-accent sm:text-xs">
              {t('pages.invitation.saveTheDate')} • {formattedDate}
            </span>
            <span className="h-px w-6 bg-natural-accent/60 sm:w-12" />
          </div>
        )}

        <h1 className="mb-6 font-serif text-4xl font-light leading-none tracking-tight text-stone-100 drop-shadow-md sm:text-6xl md:text-7xl">
          {husband.firstName} {husband.lastName}
          {isMarriage ? (
            <>
              {' '}
              <br className="sm:hidden" />
              <span className="mx-2 font-serif text-2xl font-normal italic text-natural-accent sm:mx-3 sm:text-4xl">
                &amp;
              </span>
              <br className="sm:hidden" />
            </>
          ) : (
            <br />
          )}
          {wife.firstName} {wife.lastName}
        </h1>

        {localizedHeadline && (
          <p className="mb-8 max-w-xl font-serif text-sm font-light uppercase leading-relaxed tracking-widest text-stone-200 sm:text-lg">
            {localizedHeadline}
          </p>
        )}

        {localizedQuote && (
          <p className="max-w-lg font-sans text-xs font-light italic leading-relaxed text-stone-300 sm:text-sm">
            &ldquo;{localizedQuote}&rdquo;
          </p>
        )}

        <button
          type="button"
          onClick={() => document.getElementById('countdown')?.scrollIntoView({ behavior: 'smooth' })}
          className="mt-10 flex flex-col items-center gap-1.5 text-stone-400 transition-colors hover:text-natural-accent focus:outline-none"
        >
          <span className="font-sans text-[10px] uppercase tracking-widest">
            {t('pages.invitation.scrollHint')}
          </span>
          <ChevronDown className="h-4 w-4 animate-bounce" aria-hidden="true" />
        </button>
      </div>
    </section>
  )
}
