import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MainLayout } from '@/layouts/MainLayout'
import { InvitationPage } from '@/pages/InvitationPage'
import { PlaceholderPage } from '@/components/PlaceholderPage'

function App() {
  const { t } = useTranslation()

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<InvitationPage />} />
          <Route path="events" element={<PlaceholderPage title={t('nav.events')} />} />
          <Route path="reservation" element={<PlaceholderPage title={t('nav.reservation')} />} />
          <Route
            path="reception-seating"
            element={<PlaceholderPage title={t('nav.receptionSeating')} />}
          />
          <Route path="happening-now" element={<PlaceholderPage title={t('nav.happeningNow')} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
