import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, X, ShieldCheck, Users } from 'lucide-react'
import { useCelebration } from '@/context/CelebrationContext'
import { GuestLoginForm } from '@/components/GuestLoginForm'
import { submitReservation } from '@/lib/api/reservations'
import type { ConfirmAccessResult } from '@/lib/api/access'

type Step = 'login' | 'form' | 'submitted'

export function ReservationPage() {
  const { t } = useTranslation()
  const { celebrationId, celebration } = useCelebration()
  const { showMaxGuests } = celebration.celebrationInfo

  const [step, setStep] = useState<Step>('login')
  const [contact, setContact] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [maxAttendees, setMaxAttendees] = useState<number | null>(null)

  const [willAttend, setWillAttend] = useState<boolean | null>(null)
  const [partySize, setPartySize] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleVerified = (verifiedContact: string, result: ConfirmAccessResult) => {
    setContact(verifiedContact)
    setDisplayName(result.displayName ?? verifiedContact)
    setMaxAttendees(result.maxAttendees ?? null)
    setStep('form')
  }

  const resetFlow = () => {
    setStep('login')
    setContact('')
    setDisplayName('')
    setMaxAttendees(null)
    setWillAttend(null)
    setPartySize(1)
    setError(null)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (willAttend === null) return
    setLoading(true)
    setError(null)
    try {
      const result = await submitReservation({
        guid: celebrationId,
        contact,
        action: willAttend ? 'confirm' : 'denied',
        attendees: willAttend ? partySize : undefined,
      })
      if (result.success) {
        setStep('submitted')
      } else {
        setError(t('pages.access.genericError'))
      }
    } catch {
      setError(t('pages.access.genericError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mx-auto max-w-xl px-4 py-16 sm:py-24">
      <div className="mb-10 text-center">
        <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-natural-accent" aria-hidden="true" />
        <h1 className="font-serif text-3xl font-normal text-natural-text">{t('nav.reservation')}</h1>
      </div>

      <div className="rounded-3xl border border-natural-border bg-white p-6 shadow-sm sm:p-10">
        {step === 'login' && (
          <div className="flex flex-col items-center gap-6">
            <p className="text-center font-sans text-sm text-natural-muted">{t('pages.reservation.intro')}</p>
            <GuestLoginForm onVerified={handleVerified} />
          </div>
        )}

        {step === 'form' && (
          <div>
            <div className="mb-6 flex items-center justify-between gap-3 border-b border-natural-border pb-5">
              <h2 className="font-serif text-xl text-natural-text">
                {t('pages.reservation.welcome', { name: displayName })}
              </h2>
              <button
                type="button"
                onClick={resetFlow}
                className="shrink-0 font-sans text-xs uppercase tracking-wide text-natural-muted underline-offset-2 hover:text-natural-accent hover:underline"
              >
                {t('pages.reservation.notYou', { name: displayName })}
              </button>
            </div>

            {showMaxGuests && maxAttendees != null && (
              <p className="mb-6 font-sans text-xs text-natural-muted">
                {t('pages.reservation.maxAttendeesNote', { count: maxAttendees })}
              </p>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div>
                <p className="mb-3 font-sans text-xs font-medium uppercase tracking-widest text-natural-accent">
                  {t('pages.reservation.attendingQuestion')}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setWillAttend(true)}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-4 font-serif text-sm transition ${
                      willAttend === true
                        ? 'border-natural-accent bg-natural-accent/10 font-semibold text-natural-accent'
                        : 'border-natural-border bg-white text-natural-muted hover:border-natural-accent/50'
                    }`}
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                    {t('pages.reservation.attendYes')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setWillAttend(false)}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-4 font-serif text-sm transition ${
                      willAttend === false
                        ? 'border-red-400 bg-red-50 font-semibold text-red-700'
                        : 'border-natural-border bg-white text-natural-muted hover:border-natural-accent/50'
                    }`}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                    {t('pages.reservation.attendNo')}
                  </button>
                </div>
              </div>

              {willAttend === true && (
                <div className="flex flex-col gap-6">
                  <div>
                    <label
                      htmlFor="partySize"
                      className="mb-1.5 block font-sans text-xs uppercase tracking-widest text-natural-muted"
                    >
                      {t('pages.reservation.partySizeLabel')}
                    </label>
                    <div className="relative w-32">
                      <Users
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-natural-muted"
                        aria-hidden="true"
                      />
                      <input
                        id="partySize"
                        type="number"
                        min={1}
                        max={maxAttendees ?? undefined}
                        required
                        value={partySize}
                        onChange={(e) => setPartySize(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-full rounded-lg border border-natural-border bg-white py-2.5 pl-9 pr-3 font-sans text-sm text-natural-text focus:border-natural-accent focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {willAttend === false && (
                <p className="rounded-xl border border-natural-border bg-natural-soft p-4 font-sans text-sm leading-relaxed text-natural-muted">
                  {t('pages.reservation.declineMessage')}
                </p>
              )}

              {error && <p className="font-sans text-xs text-red-600">{error}</p>}

              {willAttend !== null && (
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-natural-accent px-6 py-3 font-sans text-sm font-medium text-natural-bg transition hover:opacity-90 disabled:opacity-60"
                >
                  {t('pages.reservation.submitButton')}
                </button>
              )}
            </form>
          </div>
        )}

        {step === 'submitted' && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="h-7 w-7" aria-hidden="true" />
            </div>
            <h2 className="font-serif text-2xl text-natural-text">{t('pages.reservation.successTitle')}</h2>
            <p className="max-w-sm font-sans text-sm leading-relaxed text-natural-muted">
              {willAttend
                ? t('pages.reservation.successAttending', { name: displayName, count: partySize })
                : t('pages.reservation.successDeclined', { name: displayName })}
            </p>
            <button
              type="button"
              onClick={resetFlow}
              className="mt-2 rounded-lg border border-natural-border px-6 py-2.5 font-sans text-xs uppercase tracking-wide text-natural-muted transition hover:border-natural-accent hover:text-natural-accent"
            >
              {t('pages.reservation.searchAnother')}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
