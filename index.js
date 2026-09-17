/**
 * Custom entry point — exists solely to load Skia before anything else.
 *
 * On the web, `@shopify/react-native-skia` builds its entire API object at
 * module-evaluation time:
 *
 *   export const Skia = JsiSkApi(global.CanvasKit);   // Skia.web.js
 *
 * `global.CanvasKit` is only set once the CanvasKit WASM module has been
 * fetched and instantiated, which is asynchronous. So if any module in the
 * graph imports Skia before that resolves, `Skia` is built from `undefined`
 * and stays broken for the life of the page — the symptom being
 *
 *   TypeError: Cannot read properties of undefined (reading 'MakeImage')
 *
 * thrown from whichever view rasterises first. Gating *rendering* on a loaded
 * flag does not help: by the time a component renders, the import has already
 * been evaluated. The load has to finish before the app graph is required,
 * which is why `expo-router/entry` is behind a `require` here rather than a
 * top-level import.
 *
 * Native keeps the synchronous path. Skia is linked into the binary there, and
 * deferring `AppRegistry` registration by even a microtask is not worth the
 * risk. `loadSkia` resolves to a no-op on native (see loadSkia.ts), and the
 * `.web.ts` twin is what keeps canvaskit-wasm out of the native bundles.
 */

import { Platform } from 'react-native';

import { loadSkia } from './src/widgets/runtime/loadSkia';

if (Platform.OS === 'web') {
  loadSkia()
    .then(() => {
      require('expo-router/entry');
    })
    .catch((err) => {
      console.error('Skia failed to load; the app was not started.', err);
    });
} else {
  require('expo-router/entry');
}
