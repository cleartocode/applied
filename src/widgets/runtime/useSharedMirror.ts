/**
 * Mirror a UI-thread shared value into React state at a bounded rate.
 *
 * Use this for anything a *human* reads (a numeric readout, a narration
 * trigger, a button label) and never for anything a *renderer* reads. The moment
 * a Skia view depends on React state, the interaction loop has a JS thread in it
 * and the whole architecture stops paying for itself.
 */

import { useCallback, useState } from 'react';
import {
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { nowMs } from '@/widgets/runtime/perf';

export function useSharedMirror<T>(source: SharedValue<T>, hz = 6): T {
  const [value, setValue] = useState<T>(source.get());
  const lastEmit = useSharedValue(0);
  const intervalMs = 1000 / hz;

  const publish = useCallback((next: T) => setValue(next), []);

  useAnimatedReaction(
    () => source.get(),
    (next) => {
      const t = nowMs();
      if (t - lastEmit.get() < intervalMs) return;
      lastEmit.set(t);
      runOnJS(publish)(next);
    },
    [intervalMs],
  );

  return value;
}

/**
 * Mirror immediately on change, with no rate limit. Only for values that change
 * a handful of times per session — flags, phase transitions.
 */
export function useSharedFlag(source: SharedValue<boolean>): boolean {
  const [value, setValue] = useState<boolean>(source.get());
  const publish = useCallback((next: boolean) => setValue(next), []);

  useAnimatedReaction(
    () => source.get(),
    (next, prev) => {
      if (next !== prev) runOnJS(publish)(next);
    },
  );

  return value;
}
