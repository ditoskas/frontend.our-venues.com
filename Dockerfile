# Stage 1: Build the React application
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite env vars are baked in at build time, not read at container runtime —
# override with --build-arg VITE_API_BASE_URL=https://backend.our-venues.com/api
# (or whatever the deployed backend's public origin is) for a production build.
ARG VITE_API_BASE_URL=http://localhost:3000/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Dev-only fallback for window.celebrationId (see src/lib/celebrationId.ts) —
# override with --build-arg VITE_CELEBRATION_ID=<id> per deployment, or omit
# it once the page is embedded/served with window.celebrationId already set.
ARG VITE_CELEBRATION_ID=3fe69f43-ef7c-4aef-9ba1-0e68275e0d98
ENV VITE_CELEBRATION_ID=$VITE_CELEBRATION_ID

# Google Maps JavaScript API key for the Events page (src/pages/EventsPage.tsx) —
# override with --build-arg VITE_GOOGLE_MAPS_API_KEY=<key> per deployment.
# Empty is fine: the page just shows a "map unavailable" message instead of
# a map, same degrade-gracefully behavior as a missing key elsewhere.
ARG VITE_GOOGLE_MAPS_API_KEY=
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY

ENV CI=true

RUN npm run build

# Stage 2: Serve the built app with nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 3001

CMD ["nginx", "-g", "daemon off;"]
