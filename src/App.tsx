import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CelebrationGate } from '@/components/CelebrationGate'
import { PrivacySiteGate } from '@/components/PrivacySiteGate'
import { MainLayout } from '@/layouts/MainLayout'
import { InvitationPage } from '@/pages/InvitationPage'
import { AccessGatePage } from '@/pages/AccessGatePage'
import { ReservationPage } from '@/pages/ReservationPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PlaceholderPage } from '@/components/PlaceholderPage'

function App() {
  const { t } = useTranslation()

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<CelebrationGate />}>
          <Route path="access" element={<AccessGatePage />} />

          <Route element={<PrivacySiteGate />}>
            <Route element={<MainLayout />}>
              <Route index element={<InvitationPage />} />
              <Route path="events" element={<PlaceholderPage title={t('nav.events')} />} />
              <Route path="reservation" element={<ReservationPage />} />
              <Route
                path="reception-seating"
                element={<PlaceholderPage title={t('nav.receptionSeating')} />}
              />
              <Route path="happening-now" element={<PlaceholderPage title={t('nav.happeningNow')} />} />
            </Route>
          </Route>
        </Route>

        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
