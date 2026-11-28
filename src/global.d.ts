export {}

declare global {
  interface Window {
    // Set by whatever embeds/serves this page, as an alternative to the
    // ?celebrationId= query param — see src/lib/celebrationId.ts.
    celebrationId?: string
    // Router basename set by the backend's /api/site/entry alongside
    // celebrationId: "/celebrations/{guid}" on the permanent link, "/" on a
    // celebration subdomain. See routerBasename() in src/lib/celebrationId.ts.
    celebrationBasePath?: string
  }
}
