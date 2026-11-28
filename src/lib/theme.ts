import type { PublicCelebration } from '@/lib/api/celebrations'

/**
 * The `data-theme` value CelebrationGate stamps onto `<html>` once a
 * celebration is loaded — drives the `[data-theme="..."]` palette overrides
 * in `index.css`. `undefined` for a Marriage (or anything else unrecognized)
 * means "no attribute", i.e. the default warm palette `@theme` already
 * defines — see CLAUDE.md "Theme".
 */
export type SiteTheme = 'christening-boy' | 'christening-girl' | 'christening'

export function resolveTheme(celebration: Pick<PublicCelebration, 'type' | 'childGender'>): SiteTheme | undefined {
  if (celebration.type !== 'Christening') return undefined
  if (celebration.childGender === 'Boy') return 'christening-boy'
  if (celebration.childGender === 'Girl') return 'christening-girl'
  return 'christening'
}
