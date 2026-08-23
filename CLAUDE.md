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
- `withCredentials: true` is set because the backend authenticates via a
  session cookie, not bearer tokens.
- The backend is still early — most routes are server-rendered admin
  pages rather than JSON APIs. Before wiring up a new call, check
  `backend.o-gamos-mas.com/src/app/api/**` for the route, or ask for it
  to be added there first.

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