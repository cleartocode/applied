/**
 * Binding control: a log-scale slider driven entirely on the UI thread.
 *
 * The gesture writes straight into the shared value the model loop reads. There
 * is no state, no re-render, and no bridge crossing between the finger moving
 * and the picture changing — which is the entire difference between a control
 * that feels connected to the thing it controls and one that feels like a form
 * field.
 *
 * The JS thread hears about the value at 20 Hz, for narration and capture only.
 * Nothing visual depends on that channel.
 */

import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { ink, radius, series, surface } from '@/theme/tokens';
import { nowMs } from '@/widgets/runtime/perf';

const TRACK_HEIGHT = 6;
const THUMB_SIZE = 30;

export interface LogSliderProps {
  value: SharedValue<number>;
  min: number;
  max: number;
  width: number;
  /** Called at `hz`, on the JS thread. Never used for rendering. */
  onSample?: (v: number) => void;
  hz?: number;
  /** Optional model-space marker, e.g. the divergence threshold. */
  marker?: { at: number; color: string };
  disabled?: boolean;
}

export function LogSlider({
  value,
  min,
  max,
  width,
  onSample,
  hz = 20,
  marker,
  disabled = false,
}: LogSliderProps) {
  const trackWidth = width - THUMB_SIZE;
  const lnMin = useMemo(() => Math.log(min), [min]);
  const lnMax = useMemo(() => Math.log(max), [max]);
  const lastEmit = useSharedValue(0);
  const intervalMs = 1000 / hz;

  const emit = useCallback((v: number) => onSample?.(v), [onSample]);

  const setFromX = useCallback(
    (x: number) => {
      'worklet';
      const t = Math.min(1, Math.max(0, x / trackWidth));
      value.set(Math.exp(lnMin + t * (lnMax - lnMin)));
    },
    [lnMax, lnMin, trackWidth, value],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!disabled)
        .minDistance(0)
        .onBegin((e) => {
          'worklet';
          setFromX(e.x - THUMB_SIZE / 2);
        })
        .onChange((e) => {
          'worklet';
          setFromX(e.x - THUMB_SIZE / 2);
        }),
    [disabled, setFromX],
  );

  useAnimatedReaction(
    () => value.get(),
    (v) => {
      if (!onSample) return;
      const t = nowMs();
      if (t - lastEmit.get() < intervalMs) return;
      lastEmit.set(t);
      runOnJS(emit)(v);
    },
    [intervalMs, onSample],
  );

  const thumbStyle = useAnimatedStyle(() => {
    const t = (Math.log(Math.max(value.get(), 1e-9)) - lnMin) / (lnMax - lnMin);
    return { transform: [{ translateX: Math.min(1, Math.max(0, t)) * trackWidth }] };
  }, [lnMin, lnMax, trackWidth]);

  const fillStyle = useAnimatedStyle(() => {
    const t = (Math.log(Math.max(value.get(), 1e-9)) - lnMin) / (lnMax - lnMin);
    return { width: Math.min(1, Math.max(0, t)) * trackWidth + THUMB_SIZE / 2 };
  }, [lnMin, lnMax, trackWidth]);

  const markerLeft =
    marker != null
      ? ((Math.log(marker.at) - lnMin) / (lnMax - lnMin)) * trackWidth + THUMB_SIZE / 2
      : null;

  return (
    <GestureDetector gesture={pan}>
      {/* Hit area is deliberately taller than the track — a 6px target is a
          6px target no matter how nice it looks. */}
      <View style={[styles.hit, { width }]} collapsable={false}>
        <View style={[styles.track, { width, opacity: disabled ? 0.4 : 1 }]}>
          <Animated.View style={[styles.fill, fillStyle]} />
        </View>

        {markerLeft != null && marker != null ? (
          <View style={[styles.marker, { left: markerLeft - 1, backgroundColor: marker.color }]} />
        ) : null}

        <Animated.View style={[styles.thumb, thumbStyle, { opacity: disabled ? 0.4 : 1 }]} />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  hit: {
    height: 44,
    justifyContent: 'center',
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: ink.axis,
    overflow: 'hidden',
  },
  fill: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: series.s2,
  },
  marker: {
    position: 'absolute',
    top: 6,
    width: 2,
    height: 32,
    borderRadius: 1,
    opacity: 0.9,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radius.lg,
    backgroundColor: series.s2,
    borderWidth: 3,
    borderColor: surface.chart,
  },
});
