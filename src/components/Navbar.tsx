import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Heart, CalendarDays, Ticket, Users, Sparkles, type LucideIcon } from 'lucide-react'
import { Monogram } from '@/components/Monogram'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

const navItems: { to: string; end?: boolean; labelKey: string; icon: LucideIcon }[] = [
  { to: '/', end: true, labelKey: 'nav.invitation', icon: Heart },
  { to: '/events', labelKey: 'nav.events', icon: CalendarDays },
  { to: '/reservation', labelKey: 'nav.reservation', icon: Ticket },
  { to: '/reception-seating', labelKey: 'nav.receptionSeating', icon: Users },
  { to: '/happening-now', labelKey: 'nav.happeningNow', icon: Sparkles },
]

export function Navbar() {
  const { t } = useTranslation()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-natural-border bg-natural-bg/95 backdrop-blur-md">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-4 px-4 md:h-20 sm:px-6">
        <NavLink to="/" className="shrink-0" aria-label={t('nav.invitation')}>
          <Monogram
            name1="Δημήτρης"
            name2="Μαρία"
            date="2026-06-12"
            type="Marriage"
            size="sm"
          />
        </NavLink>

        <nav className="flex flex-1 items-center justify-center gap-1 overflow-x-auto sm:gap-2">
          {navItems.map(({ to, end, labelKey, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={t(labelKey)}
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-md border px-2.5 py-2 text-xs font-sans font-medium uppercase tracking-widest transition-all md:px-4 md:py-2.5 ${
                  isActive
                    ? 'border-natural-border bg-natural-soft text-natural-accent'
                    : 'border-transparent text-natural-text/75 hover:bg-natural-soft/50 hover:text-natural-text'
                }`
              }
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="hidden lg:inline">{t(labelKey)}</span>
            </NavLink>
          ))}
        </nav>

        <div className="shrink-0">
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  )
}
