import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { CelebrationProvider } from '@/context/CelebrationContext'
import { resolveCelebrationId } from '@/lib/celebrationId'
import { getPublicCelebration, type PublicCelebration } from '@/lib/api/celebrations'
import { redeemInvite } from '@/lib/api/access'
import { setVerifiedGuestSession } from '@/lib/guestSessionStorage'
import { grantSiteAccess } from '@/lib/siteAccessStorage'
import { LoadingScreen } from '@/components/LoadingScreen'

type GateState =
  | { status: 'loading' }
  | { status: 'ready'; celebration: PublicCelebration }
  | { status: 'error' }

/**
 * Route-level guard for everything celebration-scoped: resolves the
 * celebration id (window.celebrationId, then ?celebrationId=), fetches
 * GET /api/public/celebration/{id}, and redirects to /404 if the id is
 * missing or the backend doesn't recognize it (unknown guid, or a
 * celebration that isn't public — see PUBLIC-API.md, both are a plain 404
 * by design so a caller can't distinguish them). Otherwise the fetched
 * celebration is made available to nested routes via useCelebration().
 */
export function CelebrationGate() {
  const location = useLocation()
  const navigate = useNavigate()
  const celebrationId = resolveCelebrationId(location.search)
  const [state, setState] = useState<GateState>({ status: 'loading' })

  useEffect(() => {
    if (!celebrationId) return

    let cancelled = false
    setState({ status: 'loading' })

    // A personal invitation link (…?invite=<code>) signs the guest in before
    // the site renders — so a private site opens directly and the RSVP form
    // already knows who they are. A failed/expired code is simply ignored.
    const invite = new URLSearchParams(location.search).get('invite')
    getPublicCelebration(celebrationId)
      .then(async (celebration) => {
        if (invite) {
          try {
            const result = await redeemInvite(celebrationId, invite)
            if (result.success && result.token && result.expiresAt && result.contact) {
              setVerifiedGuestSession(celebrationId, {
                contact: result.contact,
                token: result.token,
                expiresAt: result.expiresAt,
                displayName: result.displayName,
                maxAttendees: result.maxAttendees ?? null,
              })
              grantSiteAccess(celebrationId)
            }
          } catch {
            // invalid or expired link — continue as a normal visitor
          }
          // Drop the code from the address bar (and from anything the
          // visitor might copy and forward).
          const params = new URLSearchParams(location.search)
          params.delete('invite')
          const search = params.toString()
          navigate({ pathname: location.pathname, search: search ? `?${search}` : '' }, { replace: true })
        }
        if (!cancelled) setState({ status: 'ready', celebration })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' })
      })

    return () => {
      cancelled = true
    }
    // Runs once per celebration: the invite code is read from the URL the
    // page was opened with, then removed from it.
  }, [celebrationId])

  if (!celebrationId || state.status === 'error') {
    return <Navigate to="/404" replace />
  }

  if (state.status === 'loading') {
    return <LoadingScreen />
  }

  return (
    <CelebrationProvider celebrationId={celebrationId} celebration={state.celebration}>
      <Outlet />
    </CelebrationProvider>
  )
}
