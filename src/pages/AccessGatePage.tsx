import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Monogram } from '@/components/Monogram'
import { GuestLoginForm } from '@/components/GuestLoginForm'
import { useCelebration } from '@/context/CelebrationContext'
import { grantSiteAccess } from '@/lib/siteAccessStorage'

export function AccessGatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { celebrationId, celebration } = useCelebration()
  const { husband, wife } = celebration.coupleInfo

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-natural-bg px-4 py-16">
      <div className="flex w-full max-w-sm flex-col items-center gap-8">
        <Monogram
          name1={husband.firstName}
          name2={wife.firstName}
          date={celebration.celebrationInfo.celebrationDate}
          type={celebration.type}
        />

        <div className="w-full text-center">
          <p className="font-sans text-sm text-natural-muted">{t('pages.access.intro')}</p>
        </div>

        <GuestLoginForm
          onVerified={() => {
            grantSiteAccess(celebrationId)
            navigate('/', { replace: true })
          }}
        />
      </div>
    </div>
  )
}
