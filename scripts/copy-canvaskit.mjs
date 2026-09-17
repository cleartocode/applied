/**
 * Copies the CanvasKit WASM binary into public/ so the web build can serve it.
 *
 * react-native-skia on the web is CanvasKit, and CanvasKit fetches a 7.7 MB
 * .wasm at runtime. That binary is a build artefact of a dependency, not source,
 * so it is gitignored and regenerated here on every install rather than checked
 * in. `loadSkia.web.ts` points CanvasKit at the copy with an explicit
 * `locateFile`, because Metro rewrites the default script-relative path.
 *
 * Silent no-op when canvaskit-wasm is absent — CI installs that skip optional
 * web work should not fail on this.
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);

let binDir;
try {
  binDir = join(dirname(require.resolve('canvaskit-wasm/package.json')), 'bin', 'full');
} catch {
  process.exit(0);
}

const src = join(binDir, 'canvaskit.wasm');
if (!existsSync(src)) process.exit(0);

mkdirSync('public', { recursive: true });
copyFileSync(src, join('public', 'canvaskit.wasm'));
console.log('canvaskit.wasm → public/');
