import { Navigate, Outlet } from 'react-router-dom'
import { useCelebration } from '@/context/CelebrationContext'
import { hasSiteAccess } from '@/lib/siteAccessStorage'

/**
 * Nested below `CelebrationGate` (so it has celebration data already),
 * above `MainLayout`. If the celebration isn't public and this browser
 * hasn't verified via the access-code gate yet, redirects to `/access`
 * instead of rendering the real site.
 */
export function PrivacySiteGate() {
  const { celebrationId, celebration } = useCelebration()

  if (!celebration.celebrationInfo.isSitePublic && !hasSiteAccess(celebrationId)) {
    return <Navigate to="/access" replace />
  }

  return <Outlet />
}
