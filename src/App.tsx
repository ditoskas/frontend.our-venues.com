import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { routerBasename } from '@/lib/celebrationId'
import { CelebrationGate } from '@/components/CelebrationGate'
import { PrivacySiteGate } from '@/components/PrivacySiteGate'
import { MainLayout } from '@/layouts/MainLayout'
import { InvitationPage } from '@/pages/InvitationPage'
import { EventsPage } from '@/pages/EventsPage'
import { ReceptionSeatingPage } from '@/pages/ReceptionSeatingPage'
import { GuestListPage } from '@/pages/GuestListPage'
import { AccessGatePage } from '@/pages/AccessGatePage'
import { ReservationPage } from '@/pages/ReservationPage'
import { HappeningNowPage } from '@/pages/HappeningNowPage'
import { LiveDisplayPage } from '@/pages/LiveDisplayPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

function App() {
  return (
    <BrowserRouter basename={routerBasename()}>
      <Routes>
        <Route element={<CelebrationGate />}>
          <Route path="access" element={<AccessGatePage />} />
          {/* No PrivacySiteGate/MainLayout — this is an unattended
              projector/TV display at the venue, not a guest-navigation
              page, so it skips the access gate and has no nav chrome. */}
          <Route path="live" element={<LiveDisplayPage />} />

          <Route element={<PrivacySiteGate />}>
            <Route element={<MainLayout />}>
              <Route index element={<InvitationPage />} />
              <Route path="events" element={<EventsPage />} />
              <Route path="reservation" element={<ReservationPage />} />
              <Route path="reception-seating" element={<ReceptionSeatingPage />} />
              {/* Deliberately not in Navbar's nav items — reachable only via
                  its direct URL, see GuestListPage.tsx. */}
              <Route path="guest-list" element={<GuestListPage />} />
              <Route path="happening-now" element={<HappeningNowPage />} />
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
