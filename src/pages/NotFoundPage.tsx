import { useTranslation } from 'react-i18next'

export function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <section className="flex min-h-screen flex-col items-center justify-center gap-3 bg-natural-bg px-4 text-center">
      <p className="font-serif text-6xl text-natural-accent">404</p>
      <h1 className="font-serif text-2xl font-semibold text-natural-text">{t('notFound.title')}</h1>
      <p className="font-sans text-natural-muted">{t('notFound.message')}</p>
    </section>
  )
}
