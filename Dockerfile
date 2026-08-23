# Stage 1: Build the React application
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite env vars are baked in at build time, not read at container runtime —
# override with --build-arg VITE_API_BASE_URL=https://backend.o-gamos-mas.com/api
# (or whatever the deployed backend's public origin is) for a production build.
ARG VITE_API_BASE_URL=http://localhost:3000/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV CI=true

RUN npm run build

# Stage 2: Serve the built app with nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 3001

CMD ["nginx", "-g", "daemon off;"]
