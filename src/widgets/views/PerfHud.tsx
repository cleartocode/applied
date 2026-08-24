/**
 * The gate, on screen.
 *
 * Phase 0a passes or fails on a number: model step p95 under 4 ms while the
 * frame rate holds. Putting that number in the UI — rather than behind a
 * profiler — is the difference between a budget that is enforced and a budget
 * that is aspirational. Leave this visible in dev builds forever.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ink, radius, space, status, surface, type } from '@/theme/tokens';
import { fpsFromFrameMs, useRingStats } from '@/widgets/runtime/perf';
import type { ModelRuntime } from '@/widgets/runtime/types';

const STEP_BUDGET_MS = 4;
const FPS_FLOOR = 50;

export function PerfHud({ runtime }: { runtime: ModelRuntime }) {
  const step = useRingStats(runtime.stepUs, 4);
  const frame = useRingStats(runtime.frameMs, 4);

  const stepP95Ms = step.p95 / 1000;
  const fps = fpsFromFrameMs(frame.p50);

  const stepOk = step.n < 20 || stepP95Ms <= STEP_BUDGET_MS;
  const fpsOk = frame.n < 20 || fps >= FPS_FLOOR;
  const verdictColor = stepOk && fpsOk ? status.good : status.critical;

  return (
    <View style={styles.row}>
      <Stat
        label="step p50"
        value={step.n === 0 ? '—' : `${(step.p50 / 1000).toFixed(3)}`}
        unit="ms"
      />
      <Stat
        label="step p95"
        value={step.n === 0 ? '—' : stepP95Ms.toFixed(3)}
        unit="ms"
        tone={stepOk ? undefined : status.critical}
      />
      <Stat
        label="frame"
        value={frame.n === 0 ? '—' : fps.toFixed(0)}
        unit="fps"
        tone={fpsOk ? undefined : status.critical}
      />
      <View style={[styles.badge, { borderColor: verdictColor }]}>
        <View style={[styles.dot, { backgroundColor: verdictColor }]} />
        <Text style={[styles.badgeText, { color: verdictColor }]}>
          {step.n < 20 ? 'SAMPLING' : stepOk && fpsOk ? 'IN BUDGET' : 'OVER BUDGET'}
        </Text>
      </View>
    </View>
  );
}

function Stat({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit: string;
  tone?: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValueRow}>
        <Text style={[styles.statValue, tone ? { color: tone } : null]}>{value}</Text>
        <Text style={styles.statUnit}>{unit}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    backgroundColor: surface.raised,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.hairline,
  },
  stat: { minWidth: 58 },
  statLabel: {
    color: ink.muted,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  statValue: {
    color: ink.primary,
    fontSize: 15,
    fontFamily: type.mono,
    fontVariant: ['tabular-nums'],
  },
  statUnit: { color: ink.muted, fontSize: 10 },
  badge: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.sm,
    paddingVertical: 5,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
});
