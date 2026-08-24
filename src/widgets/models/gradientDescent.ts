/**
 * Built-in model: `gradient-descent` (least-squares linear fit, 2 parameters).
 *
 * This file is the reference shape for every model in the widget library:
 *
 *   - It is a **pure step function**: (state, params) -> state'. No React, no
 *     shared values, no side effects, no imports.
 *   - Every exported function carries the `'worklet'` directive so it can be
 *     called from the UI thread without a JS round-trip.
 *   - It is plain enough to run in bare Node, which is what `bench/step-budget.ts`
 *     does to measure the step cost in isolation.
 *
 * The performance budget for a model step is 4 ms (see docs/phase-0a.md). This
 * one is nowhere near it, which is the point: if the on-device HUD ever shows a
 * number near 4 ms, the cost is in the plumbing, not the maths.
 */

export interface Dataset {
  readonly xs: readonly number[];
  readonly ys: readonly number[];
  /** Precomputed means, so loss at an arbitrary (w, b) is O(1). */
  readonly sxx: number;
  readonly sx: number;
  readonly sxy: number;
  readonly sy: number;
  readonly syy: number;
  readonly n: number;
}

export interface GdState {
  readonly w: number;
  readonly b: number;
  readonly loss: number;
  readonly gw: number;
  readonly gb: number;
}

/**
 * Build a synthetic dataset: y = trueW * x + trueB + noise, x spread over
 * [0, xMax].
 *
 * `xMax` is not cosmetic. The Hessian of the least-squares loss is
 * [[E[x²], E[x]], [E[x], 1]], and gradient descent diverges once the learning
 * rate exceeds 2 / lambdaMax. With x over [0, 4] that threshold lands near
 * eta = 0.33 — comfortably inside the slider's [0.001, 0.5] domain, so the
 * learner can reach divergence by dragging rather than by being told about it.
 * It also gives a condition number around 28, which is what makes the descent
 * path visibly zig-zag down a narrow valley instead of gliding straight in.
 */
export function makeDataset(
  n = 64,
  trueW = 2,
  trueB = -0.5,
  xMax = 4,
  noise = 0.35,
  seed = 7,
): Dataset {
  const xs: number[] = [];
  const ys: number[] = [];

  // Deterministic PRNG (mulberry32) so the surface is identical every run —
  // a spike you cannot reproduce is a spike you cannot measure.
  let s = seed >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  for (let i = 0; i < n; i += 1) {
    const x = (i / (n - 1)) * xMax;
    const gauss = (rand() + rand() + rand() + rand() - 2) * 0.7; // ~N(0,1)
    xs.push(x);
    ys.push(trueW * x + trueB + gauss * noise);
  }

  let sxx = 0;
  let sx = 0;
  let sxy = 0;
  let sy = 0;
  let syy = 0;
  for (let i = 0; i < n; i += 1) {
    sxx += xs[i] * xs[i];
    sx += xs[i];
    sxy += xs[i] * ys[i];
    sy += ys[i];
    syy += ys[i] * ys[i];
  }

  return { xs, ys, sxx: sxx / n, sx: sx / n, sxy: sxy / n, sy: sy / n, syy: syy / n, n };
}

/**
 * Mean squared error at (w, b), in O(1) from the precomputed moments.
 * Used to rasterise the loss field — 16k grid cells must not cost 16k * n.
 */
export function lossAt(d: Dataset, w: number, b: number): number {
  'worklet';
  return (
    0.5 *
    (d.sxx * w * w + 2 * d.sx * w * b + b * b - 2 * d.sxy * w - 2 * d.sy * b + d.syy)
  );
}

/**
 * One gradient-descent step. Pure: same inputs, same output, no allocation
 * beyond the returned record.
 */
export function gdStep(d: Dataset, w: number, b: number, eta: number): GdState {
  'worklet';
  const gw = d.sxx * w + d.sx * b - d.sxy;
  const gb = d.sx * w + b - d.sy;
  const loss =
    0.5 *
    (d.sxx * w * w + 2 * d.sx * w * b + b * b - 2 * d.sxy * w - 2 * d.sy * b + d.syy);
  return { w: w - eta * gw, b: b - eta * gb, loss, gw, gb };
}

/**
 * The learning rate above which this dataset diverges: 2 / lambdaMax of the
 * Hessian. Computed rather than hardcoded so narration rules stay true if the
 * dataset changes.
 */
export function divergenceThreshold(d: Dataset): number {
  const trace = d.sxx + 1;
  const det = d.sxx - d.sx * d.sx;
  const disc = Math.sqrt(Math.max(0, trace * trace - 4 * det));
  const lambdaMax = (trace + disc) / 2;
  return 2 / lambdaMax;
}

/** The exact least-squares solution, for scoring how close the learner got. */
export function closedFormSolution(d: Dataset): { w: number; b: number } {
  const det = d.sxx - d.sx * d.sx;
  const w = (d.sxy - d.sx * d.sy) / det;
  return { w, b: d.sy - w * d.sx };
}
