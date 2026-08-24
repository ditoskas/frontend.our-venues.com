import { apiClient } from '@/lib/apiClient'
import type { MonogramType } from '@/components/Monogram'
import type { SupportedLanguage } from '@/i18n'

// Mirrors GET /api/public/celebration/{guid} — see PUBLIC-API.md in
// backend.o-gamos-mas.com. Every field the backend doesn't have set comes
// back as null (never omitted), so these types don't mark them optional.

/** A translatable field — one entry per supported language, null where unset. */
export type LocalizedText = Record<SupportedLanguage, string | null>

export interface CelebrationPerson {
  firstName: string
  lastName: string
  email: string | null
  mobile: string | null
}

export interface CelebrationTimelineItem {
  id: string
  title: LocalizedText
  description: LocalizedText
  date: string | null
  imageUrl: string | null
}

export interface CelebrationEvent {
  id: string
  title: LocalizedText
  description: LocalizedText
  area: string | null
  date: string | null
  city: string | null
  address: string | null
  postCode: string | null
  country: string | null
  mapLat: number | null
  mapLng: number | null
}

export interface PublicCelebration {
  guid: string
  type: MonogramType
  /** Locales the admin is actively maintaining translations in for this
   *  celebration — a hint for e.g. the language switcher, not a filter:
   *  every LocalizedText field below still returns all locales regardless. */
  activeLanguages: SupportedLanguage[]
  celebrationInfo: {
    title: string
    celebrationDate: string | null
    headline: LocalizedText
    quote: LocalizedText
    countdownParagraph: LocalizedText
    heroBackgroundUrl: string | null
    invitationUrl: string | null
    maxGuestsPerInvitation: number | null
    showMaxGuests: boolean
    /** Informational only — see CLAUDE.md "Celebration gate". Doesn't
     *  gate this response; the frontend acts on it. */
    isSitePublic: boolean
  }
  coupleInfo: {
    husband: CelebrationPerson
    wife: CelebrationPerson
  }
  story: {
    title: LocalizedText
    subtitle: LocalizedText
    paragraph: LocalizedText
  }
  timeline: CelebrationTimelineItem[]
  events: CelebrationEvent[]
}

export async function getPublicCelebration(guid: string): Promise<PublicCelebration> {
  const { data } = await apiClient.get<PublicCelebration>(`/public/celebration/${guid}`)
  return data
}
