import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Send, LogIn } from 'lucide-react'
import { useCelebration } from '@/context/CelebrationContext'
import { confirmAccess, type ConfirmAccessResult } from '@/lib/api/access'
import { setVerifiedGuestSession } from '@/lib/guestSessionStorage'

type Step = 'contact' | 'code'

interface GuestLoginFormProps {
  /** Called once the code is verified — the raw contact string the guest entered, plus whatever the backend returned for it. */
  onVerified: (contact: string, result: ConfirmAccessResult) => void
}

/**
 * The shared two-step "contact -> code" guest-identification form used by
 * both the site-wide access gate (AccessGatePage) and the reservation
 * page's RSVP guest login — see CLAUDE.md "Private-site access gate" and
 * PUBLIC-API.md's GET /api/public/access/confirm for the full server-side
 * contract.
 */
export function GuestLoginForm({ onVerified }: GuestLoginFormProps) {
  const { t } = useTranslation()
  const { celebrationId } = useCelebration()

  const [step, setStep] = useState<Step>('contact')
  const [contact, setContact] = useState('')
  const [code, setCode] = useState('')
  // The backend hands the code straight back in the response (no email/SMS
  // delivery integration exists yet — see PUBLIC-API.md) — shown here so
  // the flow is actually completable until that's wired up.
  const [issuedCode, setIssuedCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSendCode = async (e: FormEvent) => {
    e.preventDefault()
    if (!contact.trim()) return
    setLoading(true)
    setError(null)
    try {
      const result = await confirmAccess({ guid: celebrationId, contact: contact.trim() })
      if (result.success) {
        setIssuedCode(result.code ?? null)
        setStep('code')
      } else {
        setError(t('pages.access.genericError'))
      }
    } catch {
      setError(t('pages.access.genericError'))
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true)
    setError(null)
    try {
      const result = await confirmAccess({ guid: celebrationId, contact: contact.trim(), code: code.trim() })
      if (result.success) {
        // Remembered so a returning visit (or e.g. opening the "add a Live
        // Events photo" modal right after verifying elsewhere) doesn't ask
        // for contact + code again, and so the modal has a token to call
        // POST /api/public/live-events with — see guestSessionStorage.ts.
        if (result.token && result.expiresAt) {
          setVerifiedGuestSession(celebrationId, {
            contact: contact.trim(),
            token: result.token,
            expiresAt: result.expiresAt,
            displayName: result.displayName,
            maxAttendees: result.maxAttendees ?? null,
          })
        }
        onVerified(contact.trim(), result)
      } else {
        setError(t('pages.access.genericError'))
      }
    } catch {
      setError(t('pages.access.genericError'))
    } finally {
      setLoading(false)
    }
  }

  if (step === 'contact') {
    return (
      <form onSubmit={handleSendCode} className="flex w-full flex-col gap-4">
        <div className="flex flex-col gap-1.5 text-left">
          <label htmlFor="contact" className="font-sans text-xs uppercase tracking-widest text-natural-muted">
            {t('pages.access.contactLabel')}
          </label>
          <input
            id="contact"
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-lg border border-natural-border bg-white px-4 py-2.5 font-sans text-sm text-natural-text focus:border-natural-accent focus:outline-none"
          />
        </div>

        {error && <p className="font-sans text-xs text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-lg bg-natural-accent px-4 py-2.5 font-sans text-sm font-medium text-natural-bg transition hover:opacity-90 disabled:opacity-60"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          {t('pages.access.sendButton')}
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={handleLogin} className="flex w-full flex-col gap-4">
      {issuedCode && (
        <p className="rounded-lg border border-natural-border bg-natural-soft px-4 py-2.5 font-sans text-xs text-natural-muted">
          {t('pages.access.codeIssuedNote', { code: issuedCode })}
        </p>
      )}

      <div className="flex flex-col gap-1.5 text-left">
        <label htmlFor="code" className="font-sans text-xs uppercase tracking-widest text-natural-muted">
          {t('pages.access.codeLabel')}
        </label>
        <input
          id="code"
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          autoComplete="one-time-code"
          className="w-full rounded-lg border border-natural-border bg-white px-4 py-2.5 font-sans text-sm text-natural-text focus:border-natural-accent focus:outline-none"
        />
      </div>

      {error && <p className="font-sans text-xs text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="flex items-center justify-center gap-2 rounded-lg bg-natural-accent px-4 py-2.5 font-sans text-sm font-medium text-natural-bg transition hover:opacity-90 disabled:opacity-60"
      >
        <LogIn className="h-4 w-4" aria-hidden="true" />
        {t('pages.access.loginButton')}
      </button>
    </form>
  )
}
