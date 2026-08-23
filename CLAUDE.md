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