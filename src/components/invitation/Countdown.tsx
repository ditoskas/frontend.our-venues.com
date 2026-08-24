import { useEffect, useState } from 'react'
import { Calendar, Heart } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useCelebration } from '@/context/CelebrationContext'
import { resolveBackendAssetUrl } from '@/lib/apiClient'
import { pickLocalized } from '@/lib/localized'

interface TimeRemaining {
  days: number
  hours: number
  minutes: number
  seconds: number
  isOver: boolean
}

function getTimeRemaining(targetTime: number): TimeRemaining {
  const diff = targetTime - Date.now()
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true }
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1000),
    isOver: false,
  }
}

const pad = (n: number) => n.toString().padStart(2, '0')

const UNITS = ['days', 'hours', 'minutes', 'seconds'] as const

export function Countdown() {
  const { t, i18n } = useTranslation()
  const { celebration } = useCelebration()
  const { celebrationDate, countdownParagraph, invitationUrl } = celebration.celebrationInfo
  const targetTime = celebrationDate ? new Date(celebrationDate).getTime() : null
  const localizedParagraph = pickLocalized(countdownParagraph, i18n.resolvedLanguage)

  const [timeLeft, setTimeLeft] = useState<TimeRemaining>(() =>
    targetTime
      ? getTimeRemaining(targetTime)
      : { days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true },
  )

  useEffect(() => {
    if (!targetTime) return
    setTimeLeft(getTimeRemaining(targetTime))
    const interval = setInterval(() => setTimeLeft(getTimeRemaining(targetTime)), 1000)
    return () => clearInterval(interval)
  }, [targetTime])

  if (!targetTime) return null

  return (
    <section id="countdown" className="border-b border-natural-border bg-natural-bg py-10 md:py-14">
      <div className="mx-auto max-w-3xl px-4">
        {timeLeft.isOver ? (
          <div className="flex flex-col items-center rounded-2xl border border-natural-border bg-white p-8 text-center shadow-sm">
            <Heart className="mb-3 h-8 w-8 animate-pulse text-natural-accent" aria-hidden="true" />
            <h3 className="font-serif text-2xl font-normal text-natural-text">
              {t('pages.invitation.dayArrived')}
            </h3>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="mb-6 flex items-center gap-2">
              <span className="h-px w-8 bg-natural-border" />
              <span className="flex items-center gap-1.5 font-sans text-[10px] font-medium uppercase tracking-widest text-natural-accent">
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                {t('pages.invitation.countingDown')}
              </span>
              <span className="h-px w-8 bg-natural-border" />
            </div>

            <div className="grid w-full max-w-xl grid-cols-4 gap-3 sm:gap-6">
              {UNITS.map((unit) => {
                const value = timeLeft[unit]
                return (
                  <div
                    key={unit}
                    className={`flex flex-col items-center rounded-2xl border border-natural-border p-4 shadow-sm transition-colors hover:border-natural-accent/50 sm:p-5 ${
                      unit === 'seconds' ? 'bg-natural-soft' : 'bg-white'
                    }`}
                  >
                    <span
                      className={`mb-1 font-serif text-2xl leading-none tracking-tight sm:text-4xl ${
                        unit === 'seconds' ? 'text-natural-accent tabular-nums' : 'text-natural-text'
                      }`}
                    >
                      {pad(value)}
                    </span>
                    <span className="font-sans text-[9px] uppercase tracking-widest text-natural-muted sm:text-[10px]">
                      {t(`pages.invitation.units.${unit}`, { count: value })}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {localizedParagraph && (
          <p className="mx-auto mt-6 max-w-2xl text-center font-sans text-sm font-light leading-relaxed text-natural-muted">
            {localizedParagraph}
          </p>
        )}

        {invitationUrl && (
          <div className="mx-auto mt-8 max-w-sm overflow-hidden rounded-2xl border border-natural-border bg-white p-2 shadow-sm">
            <img
              src={resolveBackendAssetUrl(invitationUrl)}
              alt=""
              referrerPolicy="no-referrer"
              className="w-full rounded-xl object-cover"
            />
          </div>
        )}
      </div>
    </section>
  )
}
