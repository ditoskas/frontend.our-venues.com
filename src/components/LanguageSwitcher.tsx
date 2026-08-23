import { useTranslation } from 'react-i18next'
import { Languages } from 'lucide-react'
import { supportedLanguages, type SupportedLanguage } from '@/i18n'

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation()

  return (
    <div className="flex items-center gap-1.5 font-sans text-xs text-natural-muted">
      <Languages className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <div className="flex gap-1">
        {supportedLanguages.map((lng) => (
          <button
            key={lng}
            type="button"
            onClick={() => i18n.changeLanguage(lng)}
            aria-current={i18n.resolvedLanguage === lng}
            title={t(`language.${lng satisfies SupportedLanguage}`)}
            className={`rounded px-1.5 py-1 uppercase tracking-wide transition ${
              i18n.resolvedLanguage === lng
                ? 'bg-natural-accent text-natural-bg'
                : 'hover:bg-natural-soft'
            }`}
          >
            {lng}
          </button>
        ))}
      </div>
    </div>
  )
}
