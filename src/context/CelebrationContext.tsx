import { createContext, useContext, type ReactNode } from 'react'
import type { PublicCelebration } from '@/lib/api/celebrations'

interface CelebrationContextValue {
  celebrationId: string
  celebration: PublicCelebration
}

const CelebrationContext = createContext<CelebrationContextValue | null>(null)

interface CelebrationProviderProps extends CelebrationContextValue {
  children: ReactNode
}

export function CelebrationProvider({ celebrationId, celebration, children }: CelebrationProviderProps) {
  return (
    <CelebrationContext.Provider value={{ celebrationId, celebration }}>
      {children}
    </CelebrationContext.Provider>
  )
}

/** The current celebration (id + fetched data) — only usable below `CelebrationGate`, which guarantees it's loaded. */
export function useCelebration(): CelebrationContextValue {
  const value = useContext(CelebrationContext)
  if (!value) {
    throw new Error('useCelebration must be used within a CelebrationProvider')
  }
  return value
}
