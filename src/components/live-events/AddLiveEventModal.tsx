import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Send, ImagePlus, Check } from 'lucide-react'
import { useCelebration } from '@/context/CelebrationContext'
import { GuestLoginForm } from '@/components/GuestLoginForm'
import { pickLocalized } from '@/lib/localized'
import { submitLiveEvent, type PublicLiveEventItem } from '@/lib/api/liveEvents'
import type { CelebrationEvent } from '@/lib/api/celebrations'
import { getVerifiedGuestSession } from '@/lib/guestSessionStorage'

type Step = 'login' | 'form' | 'success'

interface AddLiveEventModalProps {
  onClose: () => void
  onCreated: (item: PublicLiveEventItem) => void
}

/**
 * The `events` entry whose `date` is closest to now — used to preselect the
 * location dropdown, since a guest posting mid-celebration is almost always
 * at (or about to be at) whichever event is happening nearest to this
 * moment. Events with no `date` are never picked as "nearest" but stay
 * selectable in the dropdown; falls back to the first event if none have a
 * date at all.
 */
function nearestEventId(events: CelebrationEvent[]): string {
  let best: CelebrationEvent | null = null
  let bestDiff = Infinity
  const now = Date.now()
  for (const event of events) {
    if (!event.date) continue
    const diff = Math.abs(new Date(event.date).getTime() - now)
    if (diff < bestDiff) {
      bestDiff = diff
      best = event
    }
  }
  return (best ?? events[0])?.id ?? ''
}

/**
 * The "Add" popup on HappeningNowPage — guest login (reusing the same
 * contact/code form as the reservation page) followed by the post form
 * (location/title/description/image). The login step is skipped if this
 * browser already has a verified, unexpired guest session for this
 * celebration stored (see guestSessionStorage.ts) — from this same modal
 * on an earlier visit, the access gate, or the reservation page. The post
 * form itself calls `POST /api/public/live-events` (see PUBLIC-API.md),
 * the logged-in-guest endpoint — it sends the stored session `token` as
 * `Authorization: Bearer <token>`, not a `contact` field; the backend
 * derives the guest's identity from that token, not from anything this
 * component sends directly.
 */
export function AddLiveEventModal({ onClose, onCreated }: AddLiveEventModalProps) {
  const { t, i18n } = useTranslation()
  const { celebrationId, celebration } = useCelebration()
  const events = celebration.events

  // Skip straight to the post form if this browser already verified a
  // guest session for this celebration (via this modal, the access gate,
  // or the reservation page — see guestSessionStorage.ts) and it hasn't
  // expired.
  const [initialSession] = useState(() => getVerifiedGuestSession(celebrationId))
  const [step, setStep] = useState<Step>(initialSession ? 'form' : 'login')
  const [token, setToken] = useState(initialSession?.token ?? '')
  const [eventId, setEventId] = useState(() => nearestEventId(events))
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!eventId || !title.trim() || !image || !token) return
    setLoading(true)
    setError(null)
    try {
      const item = await submitLiveEvent({
        token,
        eventId,
        title: title.trim(),
        description: description.trim() || undefined,
        image,
      })
      onCreated(item)
      setStep('success')
    } catch {
      setError(t('pages.access.genericError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-natural-border bg-white p-6 shadow-lg sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-3">
          <h2 className="font-serif text-xl text-natural-text">{t('pages.happeningNow.modalTitle')}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('pages.happeningNow.close')}
            className="shrink-0 rounded-full p-1 text-natural-muted transition hover:bg-natural-soft hover:text-natural-text"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {step === 'login' && (
          <div className="flex flex-col gap-6">
            <p className="text-center font-sans text-sm text-natural-muted">
              {t('pages.happeningNow.loginIntro')}
            </p>
            <GuestLoginForm
              onVerified={(_contact, result) => {
                // GuestLoginForm already persisted this to
                // guestSessionStorage.ts (see its onVerified caller) —
                // just pull the token into local state so handleSubmit can
                // use it immediately, without a re-read from storage.
                if (result.token) setToken(result.token)
                setStep('form')
              }}
            />
          </div>
        )}

        {step === 'form' && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="live-event-location"
                className="font-sans text-xs uppercase tracking-widest text-natural-muted"
              >
                {t('pages.happeningNow.locationLabel')}
              </label>
              <select
                id="live-event-location"
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                required
                className="w-full rounded-lg border border-natural-border bg-white px-4 py-2.5 font-sans text-sm text-natural-text focus:border-natural-accent focus:outline-none"
              >
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {pickLocalized(event.title, i18n.resolvedLanguage) ?? event.id}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="live-event-title"
                className="font-sans text-xs uppercase tracking-widest text-natural-muted"
              >
                {t('pages.happeningNow.titleLabel')}
              </label>
              <input
                id="live-event-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full rounded-lg border border-natural-border bg-white px-4 py-2.5 font-sans text-sm text-natural-text focus:border-natural-accent focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="live-event-description"
                className="font-sans text-xs uppercase tracking-widest text-natural-muted"
              >
                {t('pages.happeningNow.descriptionLabel')}
              </label>
              <textarea
                id="live-event-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-lg border border-natural-border bg-white px-4 py-2.5 font-sans text-sm text-natural-text focus:border-natural-accent focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="font-sans text-xs uppercase tracking-widest text-natural-muted">
                {t('pages.happeningNow.imageLabel')}
              </span>
              <label
                htmlFor="live-event-image"
                className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-natural-border bg-natural-soft px-4 py-6 text-center font-sans text-sm text-natural-muted transition hover:border-natural-accent hover:text-natural-accent"
              >
                <ImagePlus className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{image ? image.name : t('pages.happeningNow.imagePlaceholder')}</span>
              </label>
              <input
                id="live-event-image"
                type="file"
                accept="image/*"
                onChange={(e) => setImage(e.target.files?.[0] ?? null)}
                required
                className="sr-only"
              />
            </div>

            {error && <p className="font-sans text-xs text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-lg bg-natural-accent px-4 py-2.5 font-sans text-sm font-medium text-natural-bg transition hover:opacity-90 disabled:opacity-60"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              {t('pages.happeningNow.sendButton')}
            </button>
          </form>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="h-7 w-7" aria-hidden="true" />
            </div>
            <p className="font-sans text-sm text-natural-muted">{t('pages.happeningNow.successMessage')}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 rounded-lg bg-natural-accent px-6 py-2.5 font-sans text-sm font-medium text-natural-bg transition hover:opacity-90"
            >
              {t('pages.happeningNow.close')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
