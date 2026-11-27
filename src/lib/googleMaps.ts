// Lazily injects the Google Maps JavaScript API <script> tag once and caches
// the loading promise, so remounting EventsPage (route re-entry) never
// re-injects the script or re-requests the API. Mirrors
// backend.our-venues.com's src/lib/googleMaps.ts (same loader shape, same
// Maps JS API), kept as a separate copy since the two apps don't share code.
let loadPromise: Promise<typeof google> | null = null

export function loadGoogleMaps(apiKey: string): Promise<typeof google> {
  if (window.google?.maps) {
    return Promise.resolve(window.google)
  }
  if (loadPromise) {
    return loadPromise
  }

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    // Deliberately NOT `&loading=async`: with that flag, the script tag's
    // own `onload` fires once the small bootstrap loader has run, before
    // `google.maps.*` classes (Map, Marker, …) are actually populated —
    // checking `window.google?.maps` in `onload` races that and can
    // resolve too early. Omitting it falls back to the classic loading
    // behavior, where the full `google.maps` namespace is guaranteed
    // populated by the time `onload` fires (Google only shows a benign
    // console suggestion to add the flag back for performance).
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`
    script.async = true
    script.onload = () => {
      if (window.google?.maps) {
        resolve(window.google)
      } else {
        reject(new Error('Google Maps script loaded but google.maps is unavailable'))
      }
    }
    script.onerror = () => reject(new Error('Failed to load the Google Maps script'))
    document.head.appendChild(script)
  })

  return loadPromise
}
