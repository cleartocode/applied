/**
 * The interaction loop.
 *
 * Cheap educational apps feel dead for one reason: ~100 ms of latency between
 * dragging a control and seeing the consequence. The fix is structural, not a
 * matter of optimisation later:
 *
 *   - the binding (eta) lives in a Reanimated shared value on the UI thread;
 *   - the model step runs in a worklet on the UI thread, reading that value
 *     directly — no JS round-trip, ever;
 *   - Skia views read the same shared values per frame;
 *   - the JS thread does loading, narration, capture and analytics only, all
 *     throttled.
 *
 * Everything in this file exists to keep that invariant. If a future model needs
 * data the JS thread owns, precompute it at mount and hand the worklet a plain
 * value — do not reach across per frame.
 */

import { useCallback, useMemo } from 'react';
import {
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { gdStep, lossAt, type Dataset } from '@/widgets/models/gradientDescent';
import { nowMs, pushSample, useRing } from '@/widgets/runtime/perf';
import type { ModelRuntime } from '@/widgets/runtime/types';

export interface UseModelLoopOptions {
  dataset: Dataset;
  /** The learner's learning rate, driven straight from the pan gesture. */
  eta: SharedValue<number>;
  /**
   * Model steps executed per rendered frame. Above 1 the descent is visible in
   * seconds rather than minutes; it also gives the timer something long enough
   * to measure, since a single step is far below clock resolution.
   */
  stepsPerFrame?: number;
  init?: { w: number; b: number };
  /** Trajectory points retained for drawing (one per frame). */
  maxTrajPoints?: number;
  /** Loss multiple past which the run is called diverged. */
  divergeFactor?: number;
}

export function useModelLoop({
  dataset,
  eta,
  stepsPerFrame = 4,
  init = { w: -0.4, b: 2.4 },
  maxTrajPoints = 400,
  divergeFactor = 25,
}: UseModelLoopOptions): ModelRuntime {
  const initialLoss = useMemo(() => lossAt(dataset, init.w, init.b), [dataset, init.w, init.b]);

  const w = useSharedValue(init.w);
  const b = useSharedValue(init.b);
  const loss = useSharedValue(initialLoss);
  const traj = useSharedValue<number[]>([init.w, init.b]);
  const running = useSharedValue(false);
  const diverged = useSharedValue(false);
  const stepCount = useSharedValue(0);

  const stepUs = useRing();
  const frameMs = useRing();

  useFrameCallback((info) => {
    'worklet';

    if (info.timeSincePreviousFrame != null && info.timeSincePreviousFrame > 0) {
      pushSample(frameMs, info.timeSincePreviousFrame);
    }

    if (!running.get()) return;

    const t0 = nowMs();

    let cw = w.get();
    let cb = b.get();
    let cl = loss.get();
    const currentEta = eta.get();

    for (let i = 0; i < stepsPerFrame; i += 1) {
      const s = gdStep(dataset, cw, cb, currentEta);
      cw = s.w;
      cb = s.b;
      cl = s.loss;
    }

    // Total elapsed divided by the batch: a single step is well under the
    // clock's resolution, so timing one in isolation measures the clock.
    pushSample(stepUs, ((nowMs() - t0) * 1000) / stepsPerFrame);

    const blewUp = !isFinite(cl) || !isFinite(cw) || !isFinite(cb) || cl > initialLoss * divergeFactor;

    if (blewUp) {
      // Commit the last finite state so the path visibly flies off the surface
      // instead of vanishing — the explosion is the thing the learner is meant
      // to see — then stop before anything renders NaN.
      if (isFinite(cw) && isFinite(cb)) {
        w.set(cw);
        b.set(cb);
        loss.set(isFinite(cl) ? cl : initialLoss * divergeFactor);
        const t = traj.get();
        traj.set(t.length >= maxTrajPoints * 2 ? [...t.slice(2), cw, cb] : [...t, cw, cb]);
      }
      diverged.set(true);
      running.set(false);
      return;
    }

    w.set(cw);
    b.set(cb);
    loss.set(cl);
    stepCount.set(stepCount.get() + stepsPerFrame);

    // One trajectory point per frame, not per step: 60 points a second draws a
    // smooth path and bounds the array without a ring-buffer dance.
    const t = traj.get();
    traj.set(t.length >= maxTrajPoints * 2 ? [...t.slice(2), cw, cb] : [...t, cw, cb]);
  }, true);

  const reset = useCallback(() => {
    w.set(init.w);
    b.set(init.b);
    loss.set(initialLoss);
    traj.set([init.w, init.b]);
    stepCount.set(0);
    diverged.set(false);
    running.set(false);
    stepUs.set([]);
  }, [b, diverged, init.b, init.w, initialLoss, loss, running, stepCount, stepUs, traj, w]);

  return { w, b, loss, traj, running, diverged, stepCount, stepUs, frameMs, reset };
}
