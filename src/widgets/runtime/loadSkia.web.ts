/**
 * Skia bootstrap — web.
 *
 * Invariant 6 says widget code has to keep running on the web, and on the web
 * Skia is a WebAssembly module that has to be fetched and instantiated before
 * any of its API exists. Until it resolves, `Skia.Image`, `Skia.Data` and the
 * rest are `undefined` — which surfaces as
 *
 *   TypeError: Cannot read properties of undefined (reading 'MakeImage')
 *
 * from whichever view happens to rasterise something first. That is not a bug
 * in the view; it is this call not having been awaited.
 *
 * `locateFile` is not optional. CanvasKit's default resolves the .wasm relative
 * to the script that loaded it, and Metro rewrites that path during bundling,
 * so the fetch 404s. We serve the file ourselves from `public/` instead — see
 * the `postinstall` script in package.json, which copies it out of node_modules
 * so a 7.7 MB binary never enters git.
 */

import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

export async function loadSkia(): Promise<void> {
  await LoadSkiaWeb({ locateFile: (file: string) => `/${file}` });
}
