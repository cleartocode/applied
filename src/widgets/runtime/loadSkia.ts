/**
 * Skia bootstrap — native.
 *
 * On iOS and Android the Skia runtime is linked into the binary and is ready
 * before the first render, so there is nothing to wait for. This file exists
 * only so that `app/_layout.tsx` can await the same call on every platform
 * without a `Platform.OS` branch in the component.
 *
 * The web implementation lives in `loadSkia.web.ts`. Metro resolves the
 * `.web.ts` extension for the web bundle and this one everywhere else, which
 * is what keeps the 7.7 MB `canvaskit-wasm` package out of the native bundles
 * entirely — a `Platform.OS` check would not, because Metro follows dynamic
 * imports regardless of the branch that guards them.
 */

export async function loadSkia(): Promise<void> {
  // no-op: Skia is already linked.
}
