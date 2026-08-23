import { useTranslation } from 'react-i18next'
import { Monogram } from '@/components/Monogram'

export function InvitationPage() {
  const { t } = useTranslation()

  return (
    <section className="flex flex-col items-center gap-10 px-4 py-16 text-center animate-fade-in sm:py-24">
      <Monogram name1="Δημήτρης" name2="Μαρία" date="2026-06-12" type="Marriage" />
      <p className="max-w-md font-sans text-natural-muted">{t('pages.invitation.intro')}</p>
    </section>
  )
}
