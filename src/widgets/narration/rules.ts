/**
 * Contextual narration.
 *
 * The cheapest high-leverage feature in the whole product: a sentence that
 * explains what the learner just caused, in the moment they caused it. It is the
 * difference between a toy that reacts and a teacher that notices.
 *
 * Rules are data, evaluated on the JS thread against a debounced snapshot of
 * model state — never per frame. Authors will write these in YAML in Phase 1;
 * the shape here is what that YAML compiles to.
 */

import type { NarrationRule } from '@/widgets/runtime/types';

export interface GdNarrationContext {
  eta: number;
  /** 2 / lambdaMax of the Hessian — above this the iteration cannot converge. */
  threshold: number;
  loss: number;
  initialLoss: number;
  running: boolean;
  diverged: boolean;
  steps: number;
}

const fmt = (n: number, p = 3) => n.toFixed(p);

export const gradientDescentNarration: NarrationRule<GdNarrationContext>[] = [
  {
    id: 'diverged',
    priority: 100,
    tone: 'critical',
    when: (c) => c.diverged,
    text: (c) =>
      `η = ${fmt(c.eta)} overshoots. Each step jumps past the bottom and lands further up the ` +
      `other side, so the error grows instead of shrinking. It never settles.`,
  },
  {
    id: 'above-threshold-armed',
    priority: 90,
    tone: 'warning',
    when: (c) => !c.running && !c.diverged && c.eta > c.threshold,
    text: (c) =>
      `η = ${fmt(c.eta)} is a big step for this landscape. Press Run and watch what happens.`,
  },
  {
    id: 'near-threshold',
    priority: 80,
    tone: 'warning',
    when: (c) => c.running && c.eta > c.threshold * 0.75 && c.eta <= c.threshold,
    text: (c) =>
      `η = ${fmt(c.eta)} — right on the edge. The path is bouncing between the valley walls ` +
      `instead of running down it.`,
  },
  {
    id: 'converged',
    priority: 70,
    tone: 'good',
    when: (c) => c.loss < c.initialLoss * 0.02 && c.steps > 0,
    text: () => `Settled. The line stopped moving because the slope underneath it went to zero.`,
  },
  {
    id: 'crawling',
    priority: 60,
    when: (c) => c.running && c.eta < 0.01 && c.steps > 200,
    text: (c) =>
      `η = ${fmt(c.eta)} is safe but slow — every step barely moves. It will get there. Eventually.`,
  },
  {
    id: 'zigzag',
    priority: 50,
    when: (c) => c.running && c.eta > c.threshold * 0.4,
    text: () =>
      `Notice the zig-zag. The valley is much steeper across than along, so the step keeps ` +
      `bouncing sideways while creeping forward.`,
  },
  {
    id: 'descending',
    priority: 10,
    when: (c) => c.running,
    text: () => `Rolling downhill. Each step moves against the slope where the ball currently sits.`,
  },
  {
    id: 'idle',
    priority: 0,
    when: () => true,
    text: () => `Set a learning rate, then press Run. There is no wrong answer here yet.`,
  },
];

export function evaluateNarration<Ctx>(
  rules: readonly NarrationRule<Ctx>[],
  ctx: Ctx,
): { id: string; text: string; tone: NonNullable<NarrationRule<Ctx>['tone']> } {
  let best: NarrationRule<Ctx> | null = null;
  for (const rule of rules) {
    if (!rule.when(ctx)) continue;
    if (best === null || rule.priority > best.priority) best = rule;
  }
  if (best === null) return { id: 'none', text: '', tone: 'neutral' };
  return { id: best.id, text: best.text(ctx), tone: best.tone ?? 'neutral' };
}
