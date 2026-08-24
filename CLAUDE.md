# O Gamos Mas — Frontend

## What this is

The public-facing frontend for **o-gamos-mas.com**, a wedding and
christening ("baptism") planning platform. This is the frontend
implementation for the backend at
`C:\ThinkPositive\o-gamos-mas.com\backend.o-gamos-mas.com` (a Next.js
admin app with no public UI of its own) — this app is what consumes that
backend's API.

## Tech stack

- **React 19 + TypeScript**, built with **Vite**.
- **Tailwind CSS v4** via `@tailwindcss/vite` (CSS-first config, no
  `tailwind.config.js` — see `src/index.css`).
- **lucide-react** for icons — use it for any icon, don't hand-roll inline
  SVGs or reach for a different icon set.

## Theme

The color palette and fonts come from the `wedding-planner-&-seating-guestlist-template`
reference design and are defined as Tailwind v4 theme tokens in `src/index.css`
(`@theme` block) — no `tailwind.config.js`. Use these tokens instead of
arbitrary/generic Tailwind colors:

| Token                | Hex       | Use                          |
| --------------------- | --------- | ----------------------------- |
| `natural-bg`          | `#fdfbf7` | Page background               |
| `natural-text`        | `#4a4a3a` | Primary text                  |
| `natural-accent`      | `#7c7c5c` | Accents, buttons, active state|
| `natural-border`      | `#e5e0d8` | Borders/dividers              |
| `natural-muted`       | `#6b6b5b` | Secondary/muted text          |
| `natural-soft`        | `#f5f5f0` | Subtle surface backgrounds    |
| `natural-dashed`      | `#d1cdc2` | Dashed separators              |

Fonts are **self-hosted** (no Google Fonts CDN call) under
`src/assets/fonts/`, declared via `@font-face` in `src/index.css`:
`font-serif` / `font-monogram` (**Alegreya**), `font-sans` (**Alegreya
Sans**), `font-mono` (system monospace stack). Alegreya was chosen over the
original template's Playfair Display/Inter because it has full Greek +
Cyrillic + Latin glyph coverage in one family — needed since the site ships
in el/en/ru — so headings, body copy, and the `Monogram` component all stay
visually consistent across languages instead of swapping fonts per locale.
There is no dark-mode variant — the theme is a single warm/light palette by
design.

## Internationalization

3 languages: **Greek (`el`, default)**, **English (`en`)**, **Russian
(`ru`)** — via `i18next` + `react-i18next`, configured in `src/i18n/index.ts`.
Translation strings live in `src/i18n/locales/{el,en,ru}.json`.

- The language detector only reads a previously-saved choice from
  `localStorage` (key `i18nextLng`) — it deliberately does **not** infer
  the language from the browser/OS locale, so first-time visitors always
  land on Greek. Switching language is done through `<LanguageSwitcher />`
  (`src/components/LanguageSwitcher.tsx`), which persists the choice.
- Use `useTranslation()` / `t('key')` for plain strings, and `<Trans>` when
  a string needs embedded markup (e.g. wrapping part of a sentence in a
  tag) — write the markup directly into the locale JSON string and match it
  via the `components` prop.
- Dates should be formatted with `Intl.DateTimeFormat(i18n.resolvedLanguage, …)`
  rather than a hardcoded format, so they render in the visitor's chosen
  language regardless of what script the underlying data (e.g. a couple's
  names) is in — see `Monogram.tsx`.
- Some celebration fields from the backend are **translatable content**,
  not UI strings: `celebrationInfo.headline`/`quote`/`countdownParagraph`
  and `timeline[]`/`events[]` items' `title`/`description` each come back
  as a `LocalizedText` (`{ el, en, ru }`, `null` per language until an
  admin fills it in — see `PUBLIC-API.md` in the backend). Pick the right
  one with `pickLocalized(value, i18n.resolvedLanguage)`
  (`src/lib/localized.ts`), which falls back to `el` (the primary
  language) then any other set language — never index the object
  directly, a language can legitimately be `null`.

## Monogram component

`src/components/Monogram.tsx` renders the elegant initials-logo + name/date
lockup used for a couple's or event's branding. Props: `name1`, `name2`,
`date` (`string | Date`), `type` (`'Marriage' | 'Christening'`).

- Monogram initials: first letters of `name1`/`name2`, joined with `&` for
  `Marriage` (e.g. `D&M`), concatenated with no separator for `Christening`
  (e.g. `DM`). The full-name line below mirrors the same distinction (`Name1
  & Name2` vs `Name1 Name2`).
- Rendered in `font-monogram` (Alegreya, bold italic) inside a double-ring
  circular badge — deliberately a distinct token from `font-serif` even
  though it currently points at the same family, so the monogram's font can
  be swapped independently later without touching body/heading type.
- The date renders via `Intl.DateTimeFormat` in the current UI language
  (see Internationalization above), not a fixed format.

## Layout & routing

Routing is **react-router-dom** (`BrowserRouter`), wired in `App.tsx`. All
routes render inside `src/layouts/MainLayout.tsx` (`<Navbar /> + <Outlet
/>`) — add new top-level pages as children of that layout route, not as
siblings of it, so they keep the navbar.

`src/components/Navbar.tsx` is the sticky site header: the `Monogram`
component (`size="sm"`) on the left linking home, the 5 nav items in the
middle (Invitation `/`, Events `/events`, Reservation `/reservation`,
Reception Seating `/reception-seating`, Happening Now `/happening-now`,
each with a `lucide-react` icon and an i18n label from `nav.*`), and
`LanguageSwitcher` on the right. Nav item labels are hidden below the `lg`
breakpoint (icon-only) to keep the bar from wrapping on mobile — the same
pattern `Monogram`'s `size="sm"` text uses (`hidden sm:block`).

Pages that don't have real content yet render `PlaceholderPage` (title +
`pages.comingSoon`) directly from the route definition in `App.tsx` rather
than each getting their own file — give a route its own page component
under `src/pages/` once it has actual content (see `InvitationPage.tsx`).

## Celebration gate

Every route in this app is scoped to one celebration (wedding/christening),
identified by the backend's `Celebration.guid`. `src/components/CelebrationGate.tsx`
sits above `MainLayout` in `App.tsx`'s route tree and, on load:

1. Resolves the id via `resolveCelebrationId()` (`src/lib/celebrationId.ts`)
   — `window.celebrationId` first (set by whatever embeds/serves the page),
   falling back to the `?celebrationId=` query param. Neither present/both
   blank → straight to `/404`.
2. Calls `GET /api/public/celebration/{id}` (`getPublicCelebration()` in
   `src/lib/api/celebrations.ts`) and shows `LoadingScreen` while it's in
   flight.
3. Any failure — unknown guid, a celebration that isn't public yet, or a
   network/server error — also redirects to `/404`. The backend
   deliberately returns the same generic 404 for "no such guid" and "guid
   exists but not public" (see `backend.o-gamos-mas.com/src/PUBLIC-API.md`
   — that file is the authoritative contract for every `/api/public/**`
   route), so the frontend can't and shouldn't try to tell those apart.
4. On success, the fetched `PublicCelebration` + id are provided to every
   nested route via `useCelebration()` (`src/context/CelebrationContext.tsx`)
   — this is what `Navbar` and `InvitationPage` pull the couple's real
   names/date/type from for `<Monogram>`, instead of hardcoded demo data.

`VITE_CELEBRATION_ID` (`.env.example`/`.env.local`) is a **dev-only**
convenience — `seedCelebrationIdFromEnv()` in `src/lib/celebrationId.ts`
sets `window.celebrationId` from it at boot (`main.tsx`), but only if
`window.celebrationId` isn't already set, so it never masks a real
embedding host's value. It does **not** replace the `?celebrationId=`
query param path — both remain supported. The `Dockerfile` bakes the same
var in as a build `ARG` (Vite env vars are compile-time) with a sample
guid as the default; override per deployment.

## Private-site access gate

`celebrationInfo.isSitePublic` (from the fetch above) decides whether a
visitor sees the real site immediately or has to verify first.
`src/components/PrivacySiteGate.tsx` sits between `CelebrationGate` and
`MainLayout` in the route tree and, when `isSitePublic` is `false` and
this browser hasn't verified before (`hasSiteAccess()` in
`src/lib/siteAccessStorage.ts`, a `localStorage` flag scoped by
celebration id — not a real session), redirects to `/access` instead of
rendering `<Outlet />`. `/access` is a sibling route nested under
`CelebrationGate` too (so it still has `useCelebration()` context for its
`<Monogram>`), but **outside** `PrivacySiteGate`/`MainLayout` — no navbar,
just the centered form (`src/pages/AccessGatePage.tsx`).

The form itself is `src/components/GuestLoginForm.tsx` — a two-step
"contact then code" flow shared with the reservation page below, both
hitting `GET /api/public/access/confirm` (`confirmAccess()` in
`src/lib/api/access.ts`) with `guid` + `contact` (email or phone), the
second step adding `code`. It doesn't know or care what happens after
verification — it takes an `onVerified(contact, result)` callback.
`AccessGatePage` passes one that calls `grantSiteAccess()` (sets the
local flag) and navigates to `/`, where `PrivacySiteGate` re-checks and
lets it through.

**This is a client-side-only gate, not real access control** —
`CelebrationGate` already fetched the full celebration (couple info,
timeline, everything) before `PrivacySiteGate` ever runs, so the data is
sitting in the page regardless of whether the form was completed; a
visitor could bypass it via devtools. The backend endpoint is
**currently a stub** (see `PUBLIC-API.md`) — it always returns success
with fixed placeholder `displayName`/`maxAttendees`, no code is actually
generated or delivered anywhere, no `contact` is validated against
anything. Don't treat either side of this as secure until that's built
out for real.

## Reservation page

`src/pages/ReservationPage.tsx` (route `/reservation`, inside
`PrivacySiteGate`/`MainLayout` like the rest of the real site) is the
RSVP flow, modeled on the reference template's `RsvpConfirmation.tsx`
component but wired to real endpoints instead of local state:

1. **Guest login** — the same `GuestLoginForm` the access gate uses (see
   above). Here, `onVerified` stores the verified `contact` string plus
   the stub's `displayName`/`maxAttendees` in local state and moves to
   the RSVP form — it does **not** grant site access or navigate away,
   unlike `AccessGatePage`.
2. **RSVP form** — "Welcome, {displayName}", then attend yes/no, and if
   yes, a party-size number input (capped at `maxAttendees` when known).
   `celebrationInfo.showMaxGuests` gates a note telling the guest their
   max party size (`maxAttendees` from step 1) — omitted entirely when
   that flag is off, regardless of whether the number is known.
3. **Submit** — `submitReservation()` (`src/lib/api/reservations.ts`)
   calls `GET /api/public/reservations/confirm`, the one guest-facing
   endpoint in `PUBLIC-API.md` that **isn't** a stub: it matches `contact`
   against a real guest's phone/email and writes `confirmationDate`/
   `confirmedAttendees` (or `deniedDate`) on that guest. Unlike the
   access-gate's endpoint, this one **does** still require
   `celebrationInfo.isSitePublic === true` (and a future
   `celebrationDate`) — a guest can log in and fill out the form
   regardless, but the final submit 404s until the celebration is public.

## Talking to the backend

Every API call goes through the shared axios instance at
`src/lib/apiClient.ts`, never a bare `axios`/`fetch` call:

```ts
import { apiClient } from '@/lib/apiClient'

const { data } = await apiClient.get('/professionals')
```

- The instance's `baseURL` comes from `VITE_API_BASE_URL` (see
  `.env.example` / `.env.local`), defaulting to
  `http://localhost:3000/api` — the backend's local dev server.
- This app should only ever call **`/api/public/**`** — per the backend's
  `PUBLIC-API.md` (`backend.o-gamos-mas.com/src/PUBLIC-API.md`, the
  authoritative contract), those are the only routes meant to be called
  directly by this frontend, and they're unauthenticated by design (a
  `Celebration.guid` is the entire access control, not a session) — no
  `withCredentials`, no cookies, nothing to log in as. The backend also
  sets CORS (`Access-Control-Allow-Origin: *`) only on that path prefix
  (`next.config.ts` → `headers()`), precisely because these routes are
  meant to be hit cross-origin from here and carry no session to leak.
  Everything else under `/api/**` is the authenticated admin API and isn't
  reachable from this app.
- The backend is still early — check `PUBLIC-API.md` for what's actually
  documented before wiring up a new call, or ask for a new public route to
  be added (and documented there) first.

## Docker

Production `Dockerfile` is a 2-stage build — `node:22-alpine` runs
`npm ci && npm run build`, then the static `dist/` output is copied into
`nginx:alpine` (config in `nginx.conf`), matching the pattern used by
`frontend.giannistoskas.com` elsewhere in this workspace. The container
listens on **3001** (not Vite's dev port 5173).

- `VITE_API_BASE_URL` is baked into the JS bundle at build time (Vite env
  vars aren't readable at container runtime), so it must be passed as a
  build arg for a real deployment: `docker build --build-arg
  VITE_API_BASE_URL=https://backend.o-gamos-mas.com/api .` — it defaults to
  the local dev backend otherwise.
- `nginx.conf` does SPA fallback (`try_files … /index.html`) so
  react-router routes like `/events` resolve on a hard refresh, gzips
  text/js/css/svg/font responses, and sets a 1-year immutable
  `Cache-Control` on `/assets/*` since Vite content-hashes those filenames.
- Verified end-to-end with `docker build` + `docker run` — root, a deep
  client-side route, and asset gzip/cache headers all check out.