import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import el from './locales/el.json'
import en from './locales/en.json'
import ru from './locales/ru.json'

export const supportedLanguages = ['el', 'en', 'ru'] as const
export type SupportedLanguage = (typeof supportedLanguages)[number]

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      el: { translation: el },
      en: { translation: en },
      ru: { translation: ru },
    },
    fallbackLng: 'el',
    supportedLngs: supportedLanguages,
    interpolation: {
      escapeValue: false,
    },
    // Only ever pick up a language the user explicitly chose before
    // (persisted to localStorage by the switcher) — never auto-detect from
    // the browser/OS locale, so the site defaults to Greek for everyone else.
    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
    },
  })

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng
})

export default i18n
