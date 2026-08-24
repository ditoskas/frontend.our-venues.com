import { Sparkles } from 'lucide-react'

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-natural-bg">
      <Sparkles className="h-8 w-8 animate-spin-slow text-natural-accent" aria-hidden="true" />
    </div>
  )
}
