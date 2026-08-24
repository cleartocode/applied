/**
 * Headless model-step benchmark.  `npm run bench`
 *
 * The on-device HUD measures the step *in situ* — worklet dispatch, shared-value
 * reads, the lot. This measures the maths alone, in bare Node, with nothing else
 * in the way.
 *
 * The gap between the two numbers is the plumbing, and that gap is the useful
 * quantity. If the device shows 3 ms and this shows 0.0002 ms, the model is not
 * the problem and no amount of optimising it will help.
 *
 * Runs with Node's built-in type stripping (Node 22.6+), so the benchmark needs
 * no build step and no dependencies — including not needing the app's
 * node_modules to exist.
 */

import { gdStep, lossAt, makeDataset, divergenceThreshold, closedFormSolution } from '../src/widgets/models/gradientDescent.ts';

const BUDGET_MS = 4;
const ITERATIONS = 2_000_000;

function bench(name: string, iterations: number, fn: (i: number) => void): number {
  // Warm the JIT before measuring; the first thousand iterations of anything in
  // V8 are interpreted and would dominate the average.
  for (let i = 0; i < 50_000; i += 1) fn(i);

  const t0 = process.hrtime.bigint();
  for (let i = 0; i < iterations; i += 1) fn(i);
  const t1 = process.hrtime.bigint();

  const totalMs = Number(t1 - t0) / 1e6;
  const perOpMs = totalMs / iterations;
  const pct = (perOpMs / BUDGET_MS) * 100;

  console.log(
    `  ${name.padEnd(28)} ${(perOpMs * 1000).toFixed(4).padStart(10)} µs/op   ` +
      `${pct.toExponential(2).padStart(10)}% of the ${BUDGET_MS} ms budget`,
  );
  return perOpMs;
}

const dataset = makeDataset();
const optimum = closedFormSolution(dataset);
const threshold = divergenceThreshold(dataset);

console.log('\n  gradient-descent model — step budget\n');
console.log(`  dataset          n = ${dataset.n}`);
console.log(`  optimum          w = ${optimum.w.toFixed(4)}, b = ${optimum.b.toFixed(4)}`);
console.log(`  diverges above   η = ${threshold.toFixed(4)}\n`);

let w = -0.4;
let b = 2.4;

const stepMs = bench('gdStep', ITERATIONS, () => {
  const s = gdStep(dataset, w, b, 0.05);
  w = s.w;
  b = s.b;
  // Re-seed before the state converges to a fixed point, so the benchmark keeps
  // exercising the same arithmetic rather than settling into denormals.
  if (Math.abs(w - optimum.w) < 1e-9) {
    w = -0.4;
    b = 2.4;
  }
});

bench('lossAt (surface cell)', ITERATIONS, (i) => {
  lossAt(dataset, (i % 600) / 100 - 1.5, (i % 700) / 100 - 3.5);
});

// The realistic per-frame cost: several steps batched into one frame.
const perFrame = stepMs * 4;
console.log(
  `\n  4 steps/frame            ${(perFrame * 1000).toFixed(4)} µs — ` +
    `${((perFrame / BUDGET_MS) * 100).toExponential(2)}% of budget\n`,
);

if (stepMs > BUDGET_MS) {
  console.error(`  FAIL: step cost ${stepMs.toFixed(3)} ms exceeds the ${BUDGET_MS} ms budget.\n`);
  process.exit(1);
}

console.log('  PASS — the maths is free. Any budget breach on device is plumbing.\n');
