import { useTranslation } from 'react-i18next'

interface PlaceholderPageProps {
  title: string
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  const { t } = useTranslation()

  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center animate-fade-in">
      <h1 className="font-serif text-3xl font-semibold text-natural-text">{title}</h1>
      <p className="font-sans text-natural-muted">{t('pages.comingSoon')}</p>
    </section>
  )
}
