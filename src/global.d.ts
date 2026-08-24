export {}

declare global {
  interface Window {
    // Set by whatever embeds/serves this page, as an alternative to the
    // ?celebrationId= query param — see src/lib/celebrationId.ts.
    celebrationId?: string
  }
}
