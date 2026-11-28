# O Gamos Mas — Frontend

## What this is

The public-facing frontend for **o-gamos-mas.com**, a wedding and
christening ("baptism") planning platform. This is the frontend
implementation for the backend at
`C:\Users\toska\My Drive (ditoskas@gmail.com)\MyProjects\our-venues.com\app.our-venues.com` (a Next.js
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
   exists but not public" (see `app.our-venues.com/src/PUBLIC-API.md`
   — that file is the authoritative contract for every `/api/public/**`
   route), so the frontend can't and shouldn't try to tell those apart.
4. On success, the fetched `PublicCelebration` + id are provided to every
   nested route via `useCelebration()` (`src/context/CelebrationContext.tsx`)
   — this is what `Navbar` and `InvitationPage` pull the couple's real
   names/date/type from for `<Monogram>`, instead of hardcoded demo data.

**How the page is served in practice** (see the backend's
`docs/CELEBRATION-SUBDOMAINS.md`): the backend's `/api/site/entry` serves
this app's `index.html` for the permanent link
`app.our-venues.com/celebrations/{guid}` and for active celebration
subdomains (`{label}.o-gamos-mas.com` / `{label}.vaftizomai.com`), injecting
`window.celebrationId` **and** `window.celebrationBasePath`. The latter is
the react-router `basename` (`routerBasename()` in
`src/lib/celebrationId.ts`): `/celebrations/{guid}` on the permanent link,
`/` on a subdomain, and Vite's `base` (`/site`) when the app is opened
directly. Every in-app link must stay router-relative (`<Link to="events">`
/ `navigate('/events')` under the basename) — never hardcode an absolute
URL path.

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

The backend endpoint is real (see `PUBLIC-API.md`): step 1 matches
`contact` against one of the celebration's actual guests (phone exact,
email case-insensitive) and generates a genuine 6-digit code, only while
the celebration is "active" (now before `celebrationDate + 1 day`); step
2 verifies that code (single-use, 10-minute expiry) and returns the
guest's real `displayName`/`maxAttendees`. **There's no email/SMS
delivery integration yet** — the backend hands the code straight back in
the step-1 response, and `GuestLoginForm` displays it inline
(`pages.access.codeIssuedNote`) so the flow is actually completable until
real delivery is wired up. The response also includes a signed guest
session `token` (`ConfirmAccessResult.token`, expiring at the same
`celebrationDate + 1 day`) — `GuestLoginForm` persists both `contact` and
`token` to `src/lib/guestSessionStorage.ts` (`setVerifiedGuestSession()`,
keyed by celebration id, self-expiring at the same moment the token does)
on every successful verify. This is what lets a returning visit (or
switching between the access gate, reservation page, and the "add a Live
Events photo" modal within one browser session) skip straight past the
login step — see "Happening Now" below for the one place the `token`
itself is actually sent to the backend, not just remembered.
`grantSiteAccess()`'s separate `localStorage` flag is still the only thing
gating `PrivacySiteGate` — the two storages track different things
(site-wide access vs. this specific guest's identity) and aren't tied
together.

**This is still a client-side-only gate, not real access control** —
`CelebrationGate` already fetched the full celebration (couple info,
timeline, everything) before `PrivacySiteGate` ever runs, so the data is
sitting in the page regardless of whether the form was completed, and the
`localStorage` flag it sets isn't tied to the backend's `token` at all —
a visitor could bypass it via devtools. Don't treat this as secure, even
though the code/verification behind it is now real.

## Reservation page

`src/pages/ReservationPage.tsx` (route `/reservation`, inside
`PrivacySiteGate`/`MainLayout` like the rest of the real site) is the
RSVP flow, modeled on the reference template's `RsvpConfirmation.tsx`
component but wired to real endpoints instead of local state:

1. **Guest login** — the same `GuestLoginForm` the access gate uses (see
   above). Here, `onVerified` stores the verified `contact` string plus
   the verified guest's `displayName`/`maxAttendees` in local state and
   moves to the RSVP form — it does **not** grant site access or navigate
   away, unlike `AccessGatePage`.
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

## Happening Now / Live Events

`src/pages/HappeningNowPage.tsx` (route `/happening-now`, gated by
`celebrationInfo.showLive` the same way other optional pages are — a
`pages.comingSoon` placeholder when it's off) shows the celebration's
guest-submitted photo feed (`GET /api/public/celebration/{guid}/live-events`,
`getLiveEvents()` in `src/lib/api/liveEvents.ts`) and an "Add" button
opening `src/components/live-events/AddLiveEventModal.tsx`.

The modal is **login (skippable) then the post form**, not always both:

1. **Guest login** — the same `GuestLoginForm` the access gate and
   reservation page use, but skipped entirely if this browser already has
   an unexpired verified session for this celebration in
   `src/lib/guestSessionStorage.ts` (`getVerifiedGuestSession()`) — from
   this same modal earlier, the access gate, or the reservation page. When
   shown, `onVerified` just pulls `result.token` into local state (it was
   already persisted to storage by `GuestLoginForm` itself — see "Private-
   site access gate" above) and moves to the form.
2. **Post form** — location (an `EventItem` dropdown, preselected to
   whichever event's `date` is nearest to now), title, description,
   image.
3. **Submit** — `submitLiveEvent()` (`src/lib/api/liveEvents.ts`) calls
   `POST /api/public/live-events` (see `PUBLIC-API.md`) — the
   **logged-in-guest** endpoint, distinct from
   `POST /api/public/celebration/{guid}/live-events`: it sends the guest
   session `token` as `Authorization: Bearer <token>` and nothing else
   identifying — no `guid`, no `contact` — since the backend decodes the
   celebration and guest identity from the token itself. 401s if the
   token is missing/invalid/expired, so a stale/tampered stored session
   fails loudly rather than silently posting as the wrong guest.
   `PublicLiveEventItem.status` (`"pending"` | `"published"`) comes back
   on the created item — this app doesn't currently branch on it (no
   "your photo is awaiting approval" messaging yet), it's just there if a
   future UI wants it. Whether a fresh submission starts as `"pending"` or
   `"published"` is entirely the backend's call
   (`Celebration.isConfirmationRequiredOnLiveEvents`, admin-only setting,
   not exposed on the public celebration response) — this app has no
   input into or visibility of that decision.

## Events page

`src/pages/EventsPage.tsx` (route `/events`, not gated by any
`celebrationInfo.show*` flag — Events is always visible, unlike Reception
Seating/Happening Now) is a full-width, edge-to-edge layout deliberately
breaking from every other page's centered `max-w-* mx-auto` shape: a
Google Map filling the remaining viewport below the sticky navbar
(`h-[calc(100vh-4.5rem)]`/`md:h-[calc(100vh-5rem)]`, matching `Navbar`'s
own `h-18`/`md:h-20`) with a sidebar listing `celebration.events`
alongside it — stacked on mobile (sidebar on top, fixed `h-64`), side by
side on desktop (`md:w-96` sidebar).

- **Sorting**: `sortEventsDesc()` sorts by `date` descending (latest
  first); events with no `date` at all sort last. As the celebration's own
  multi-day event list plays out, this naturally splits into already-past
  entries settling toward the bottom and upcoming ones staying near the
  top.
- **Past vs. upcoming styling**: `isPastEvent()` (`date` before now) drives
  both a sidebar badge (`pages.events.past`/`upcoming`) and dimming
  (`opacity-60`) on past rows, and a differently-colored marker on the map
  (`PAST_MARKER_COLOR` muted gray vs. `FUTURE_MARKER_COLOR` the
  `natural-accent` token) — both derived independently at render time from
  the same `isPastEvent()` call, not a single shared "past" list computed
  once.
- **Marker shape**: not Google's default red pin, and not a plain flat
  circle either (an earlier version used one — explicitly replaced after
  feedback that it looked wrong on the map). `pinIconUrl()` builds a small
  inline SVG data URI: a filled teardrop using the *exact same outline*
  lucide-react's own `MapPin` renders (so the marker on the map echoes
  `pages.events.noLocation`'s inline icon in the sidebar), with a light
  circle "hole" punched near the top for the classic pin look. `pinIcon()`
  wraps that as a `google.maps.Icon` (`scaledSize`/`anchor` sized off the
  shared `MARKER_SIZE` constant, anchored at the pin's tip, not its
  center) — swap `pinIconUrl()`'s SVG markup if the shape itself ever
  needs to change again, the color/sizing plumbing around it shouldn't
  need to.
- **Markers only for events with a point**: `hasPoint()` (both `mapLat`
  and `mapLng` set) gates whether an event gets a `google.maps.Marker` at
  all — an event missing map data still lists in the sidebar (with a
  `pages.events.noLocation` hint) but isn't clickable and never appears on
  the map. `map.fitBounds()` centers/zooms to fit every mapped event
  (falls back to a single-point center+zoom for exactly one, or Athens at
  a wide zoom — `DEFAULT_CENTER`, same fallback the admin's own map picker
  uses — when there are none).
- **The popup**: clicking a marker *or* its sidebar row calls the same
  `openInfoFor()`, which pans the map to that event's point and opens one
  shared `google.maps.InfoWindow` — its content isn't a plain HTML string
  but a small `EventInfoCard` React component, rendered into a detached
  container via `react-dom/client`'s `createRoot()` (the InfoWindow's
  content lives outside the app's React tree, so that component receives
  already-localized/formatted plain-string props rather than calling
  `useTranslation()`/`pickLocalized()` itself). The card shows title,
  date, area, address, description, and a "Get Directions"
  (`pages.events.directions`) link — `target="_blank"`, opening Google
  Maps' own directions UI (`https://www.google.com/maps/dir/?api=1&destination=...`,
  lat/lng when available, else the joined address string) in a new tab.
- **Loading the API**: `src/lib/googleMaps.ts` — a from-scratch copy of
  app.our-venues.com's own `lib/googleMaps.ts` (script-tag injection,
  cached loading promise), not shared code since the two apps don't share
  a package. **Deliberately omits `&loading=async`** from the script URL —
  with that flag, the script's `onload` fires once Google's small
  bootstrap loader has run but *before* `google.maps.*` classes are
  actually populated, so checking `window.google?.maps` in `onload` races
  it and can resolve too early (hit this live during development — the
  page fell into its `error` state despite the script itself returning
  200). Omitting the flag falls back to the classic loading behavior,
  where the full namespace is guaranteed populated by the time `onload`
  fires. The backend's copy of this loader had the same latent bug and
  was fixed the same way.
- **Env var**: `VITE_GOOGLE_MAPS_API_KEY` (`.env.example`/`.env.local`,
  and `VITE_GOOGLE_MAPS_API_KEY` build `ARG` in `Dockerfile`) — the same
  underlying Google Maps API key as the backend admin's
  `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (same Google Cloud project, same Maps
  JavaScript API), just under Vite's env prefix instead of Next's.
  Degrades gracefully when unset: the sidebar list still works, the map
  area shows a `pages.events.noKey` message instead.
- **Types**: `@types/google.maps` devDependency, plus `"google.maps"`
  added to `tsconfig.app.json`'s `compilerOptions.types` array — that
  array being explicit (`["vite/client"]` only, previously) means
  TypeScript does **not** auto-include every `@types/*` package the way a
  default/unset `types` option would; any future global-namespace type
  package (like this one) needs to be added there explicitly or it won't
  resolve.

## Talking to the backend

Every API call goes through the shared axios instance at
`src/lib/apiClient.ts`, never a bare `axios`/`fetch` call:

```ts
import { apiClient } from '@/lib/apiClient'

const { data } = await apiClient.get('/professionals')
```

- The instance's `baseURL` comes from `VITE_API_BASE_URL` (see
  `.env.example` / `.env.local`), defaulting to
  `http://localhost:3000/api` — the backend's local dev server. Production
  and the Docker setup use the same-origin **`/api`**: wherever the page is
  served from (permanent link or subdomain), `/api` is the backend. For the
  Vite dev server, `VITE_API_PROXY_TARGET` makes it forward `/api` to the
  backend (`vite.config.ts`).
- This app should only ever call **`/api/public/**`** — per the backend's
  `PUBLIC-API.md` (`app.our-venues.com/src/PUBLIC-API.md`, the
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

**All built assets live under `/site/`** (`base: '/site/'` in
`vite.config.ts`), so one build works on every host and path; the dev
server also serves at `/site/` (open `http://localhost:3001/site/`).
`server.allowedHosts` accepts `frontend` (requests proxied by the backend
over Docker) and `*.localhost`, and `VITE_HMR_CLIENT_PORT` points HMR at
this server when the page is served through the backend (port 3000).

The local Docker setup (backend repo's `docker-compose.yml`) runs the **Vite
dev server** (`Dockerfile.dev`), not the production image below.

Production `Dockerfile` is a 2-stage build — `node:22-alpine` runs
`npm ci && npm run build`, then the static `dist/` output is copied into
`nginx:alpine` (config in `nginx.conf`), matching the pattern used by
`frontend.giannistoskas.com` elsewhere in this workspace. The container
listens on **3001** (not Vite's dev port 5173).

- `VITE_API_BASE_URL` is baked into the JS bundle at build time (Vite env
  vars aren't readable at container runtime), so it must be passed as a
  build arg for a real deployment: `docker build --build-arg
  VITE_API_BASE_URL=https://app.our-venues.com/api .` — it defaults to
  the local dev backend otherwise.
- `nginx.conf` does SPA fallback (`try_files … /index.html`) so
  react-router routes like `/events` resolve on a hard refresh, gzips
  text/js/css/svg/font responses, and sets a 1-year immutable
  `Cache-Control` on `/site/assets/*` since Vite content-hashes those
  filenames. The build is copied to `/usr/share/nginx/html/site`, and `/`
  redirects to `/site/`.
- Verified end-to-end with `docker build` + `docker run` — root, a deep
  client-side route, and asset gzip/cache headers all check out.