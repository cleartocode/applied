/**
 * Frame-budget instrumentation.
 *
 * The Phase 0a gate is a number, not a vibe: the model step must stay under
 * 4 ms and the loop must hold its frame rate on a real low-end Android device.
 * So the spike measures itself and shows the measurement on screen — if you have
 * to attach a profiler to know whether you passed, you will stop checking.
 *
 * Sampling happens on the UI thread into a ring buffer of plain numbers.
 * Aggregation crosses to JS at 4 Hz, never per frame: the moment perf telemetry
 * starts costing frames it is lying to you.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useAnimatedReaction,
  useSharedValue,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';

export const RING_SIZE = 120;

/** High-resolution clock, safe to call from a worklet. */
export function nowMs(): number {
  'worklet';
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

/**
 * Append to a ring buffer held in a SharedValue.
 *
 * Reassigns rather than mutating in place: mutation of a shared value's contents
 * is not guaranteed to be observed, and a 120-element copy costs a fraction of a
 * microsecond — far below the noise floor of what we are measuring.
 */
export function pushSample(ring: SharedValue<number[]>, value: number): void {
  'worklet';
  const cur = ring.get();
  ring.set(cur.length >= RING_SIZE ? [...cur.slice(1), value] : [...cur, value]);
}

export interface Stats {
  p50: number;
  p95: number;
  max: number;
  n: number;
}

export const EMPTY_STATS: Stats = { p50: 0, p95: 0, max: 0, n: 0 };

export function summarise(samples: readonly number[]): Stats {
  'worklet';
  const n = samples.length;
  if (n === 0) return { p50: 0, p95: 0, max: 0, n: 0 };
  const sorted = [...samples].sort((a, z) => a - z);
  const at = (p: number) => sorted[Math.min(n - 1, Math.max(0, Math.round(p * (n - 1))))];
  return { p50: at(0.5), p95: at(0.95), max: sorted[n - 1], n };
}

export function useRing(): SharedValue<number[]> {
  return useSharedValue<number[]>([]);
}

/**
 * Mirror a UI-thread ring buffer into React state at a fixed, low rate.
 *
 * `hz` is deliberately capped — this exists to be read by a human eye, and a
 * readout that updates 60 times a second is unreadable as well as wasteful.
 */
export function useRingStats(ring: SharedValue<number[]>, hz = 4): Stats {
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const lastEmit = useSharedValue(0);
  const intervalMs = 1000 / hz;

  const publish = useCallback((next: Stats) => setStats(next), []);

  useAnimatedReaction(
    () => ring.get().length,
    () => {
      const t = nowMs();
      if (t - lastEmit.get() < intervalMs) return;
      lastEmit.set(t);
      runOnJS(publish)(summarise(ring.get()));
    },
    [intervalMs],
  );

  return stats;
}

/** Convenience: frames-per-second implied by a p50 inter-frame time. */
export function fpsFromFrameMs(p50: number): number {
  return p50 > 0 ? 1000 / p50 : 0;
}

/**
 * Dev-only budget warning. Fires once per breach cluster so a slow device does
 * not produce 60 warnings a second.
 */
export function useBudgetWarning(stepStats: Stats, budgetMs = 4): boolean {
  const warned = useRef(false);
  const over = stepStats.n > 20 && stepStats.p95 > budgetMs;
  useEffect(() => {
    if (over && !warned.current) {
      warned.current = true;
      console.warn(
        `[perf] model step p95 = ${stepStats.p95.toFixed(2)} ms, over the ${budgetMs} ms budget. ` +
          `Precompute or reduce steps-per-frame before adding anything to this widget.`,
      );
    }
    if (!over) warned.current = false;
  }, [over, stepStats.p95, budgetMs]);
  return over;
}
