/**
 * Attempt capture.
 *
 * The strongest fidelity criterion in the productive-failure literature is that
 * the instruction must build on the learner's *own* generated solution — not
 * generic instruction after a generic attempt. So the struggle beat has to leave
 * behind structured data, and the consolidation beat has to open by naming it:
 *
 *   "You pushed eta to 0.42 and the loss exploded. Here is why."
 *
 * That is a data-flow requirement running widget runtime -> lesson player ->
 * content renderer, which is why it is in the spike. In Phase 3 this becomes a
 * row in `struggle_attempts` synced through the outbox; for now it is a
 * module-level store so the plumbing can be proven without a backend.
 *
 * Deliberately dependency-free: `useSyncExternalStore` is in React, and adding a
 * state library to a three-week spike is how spikes stop being spikes.
 */

import { useSyncExternalStore } from 'react';

export type StrategyCluster =
  | 'not-started'
  | 'timid' // barely moved the control, gave up early
  | 'systematic' // swept the range in one direction, converged on a value
  | 'blew-it-up' // drove it past divergence, deliberately or not
  | 'found-it'; // reached the target without diverging

export interface Attempt {
  lessonId: string;
  startedAt: number;
  endedAt: number | null;

  // --- final values of bindings -----------------------------------------
  finalEta: number;
  minEtaTried: number;
  maxEtaTried: number;

  // --- interaction shape ------------------------------------------------
  adjustmentCount: number;
  directionChanges: number;
  timeToFirstChangeMs: number | null;

  // --- outcome predicates -----------------------------------------------
  diverged: boolean;
  reachedTarget: boolean;
  bestLoss: number;
  totalSteps: number;
  runsStarted: number;
  gaveUp: boolean;
}

const EMPTY: Attempt = {
  lessonId: 'gradient-descent-0a',
  startedAt: 0,
  endedAt: null,
  finalEta: 0,
  minEtaTried: Number.POSITIVE_INFINITY,
  maxEtaTried: Number.NEGATIVE_INFINITY,
  adjustmentCount: 0,
  directionChanges: 0,
  timeToFirstChangeMs: null,
  diverged: false,
  reachedTarget: false,
  bestLoss: Number.POSITIVE_INFINITY,
  totalSteps: 0,
  runsStarted: 0,
  gaveUp: false,
};

let current: Attempt = { ...EMPTY };
let lastDirection = 0;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot(): Attempt {
  return current;
}

export function beginAttempt(lessonId: string): void {
  current = { ...EMPTY, lessonId, startedAt: Date.now() };
  lastDirection = 0;
  emit();
}

/** Called (throttled) as the learner drags the learning-rate control. */
export function recordEtaChange(eta: number): void {
  const first = current.timeToFirstChangeMs === null;
  const direction = Math.sign(eta - current.finalEta);
  const changedDirection =
    !first && direction !== 0 && lastDirection !== 0 && direction !== lastDirection;
  if (direction !== 0) lastDirection = direction;

  current = {
    ...current,
    finalEta: eta,
    minEtaTried: Math.min(current.minEtaTried, eta),
    maxEtaTried: Math.max(current.maxEtaTried, eta),
    adjustmentCount: current.adjustmentCount + 1,
    directionChanges: current.directionChanges + (changedDirection ? 1 : 0),
    timeToFirstChangeMs: first ? Date.now() - current.startedAt : current.timeToFirstChangeMs,
  };
  emit();
}

export function recordRunStarted(): void {
  current = { ...current, runsStarted: current.runsStarted + 1 };
  emit();
}

export function recordOutcome(patch: Partial<Attempt>): void {
  current = {
    ...current,
    ...patch,
    bestLoss:
      patch.bestLoss !== undefined ? Math.min(current.bestLoss, patch.bestLoss) : current.bestLoss,
  };
  emit();
}

export function endAttempt(gaveUp = false): void {
  current = { ...current, endedAt: Date.now(), gaveUp };
  emit();
}

export function useAttempt(): Attempt {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/**
 * Rule-based strategy clustering.
 *
 * Rule-based on purpose: for v1 the clusters need to be legible, because their
 * only consumer is a sentence a human wrote. When there is enough real data to
 * learn the clusters instead, the shape of this function does not change.
 */
export function clusterStrategy(a: Attempt): StrategyCluster {
  if (a.adjustmentCount === 0 && a.runsStarted === 0) return 'not-started';
  if (a.diverged) return 'blew-it-up';
  if (a.reachedTarget) return 'found-it';
  if (a.adjustmentCount < 4 && a.maxEtaTried - a.minEtaTried < 0.05) return 'timid';
  return 'systematic';
}

/** Rough peer distribution, stubbed until there are real peers to compare with. */
export const PEER_DISTRIBUTION: Record<StrategyCluster, number> = {
  'not-started': 0.04,
  timid: 0.18,
  systematic: 0.22,
  'blew-it-up': 0.41,
  'found-it': 0.15,
};
