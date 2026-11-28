import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { CelebrationProvider } from '@/context/CelebrationContext'
import { resolveCelebrationId } from '@/lib/celebrationId'
import { getPublicCelebration, type PublicCelebration } from '@/lib/api/celebrations'
import { resolveTheme } from '@/lib/theme'
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
  const celebrationId = resolveCelebrationId(location.search)
  const [state, setState] = useState<GateState>({ status: 'loading' })

  useEffect(() => {
    if (!celebrationId) return

    let cancelled = false
    setState({ status: 'loading' })

    getPublicCelebration(celebrationId)
      .then((celebration) => {
        if (!cancelled) setState({ status: 'ready', celebration })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' })
      })

    return () => {
      cancelled = true
    }
  }, [celebrationId])

  // Stamps `data-theme` on <html> once the celebration's loaded, driving the
  // `[data-theme="..."]` palette overrides in index.css — see
  // `@/lib/theme`'s resolveTheme() and CLAUDE.md "Theme". Applied here
  // (above PrivacySiteGate/MainLayout) so it also covers /access and /live,
  // not just the main site chrome.
  useEffect(() => {
    const theme = state.status === 'ready' ? resolveTheme(state.celebration) : undefined
    if (theme) {
      document.documentElement.dataset.theme = theme
    } else {
      delete document.documentElement.dataset.theme
    }
    return () => {
      delete document.documentElement.dataset.theme
    }
  }, [state])

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
