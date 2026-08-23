import { Outlet } from 'react-router-dom'
import { Navbar } from '@/components/Navbar'

export function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-natural-bg text-natural-text">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
