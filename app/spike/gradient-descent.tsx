/**
 * Phase 0a — the feel spike.
 *
 * Beats 1 and 2 of a real lesson (hook, then struggle), hand-built. It exists to
 * answer three questions before any of the platform gets written:
 *
 *   1. Does dragging a control and watching maths respond feel *alive* on a real
 *      device, or does it feel like a form?
 *   2. Does the model step hold under 4 ms while the frame rate holds? (HUD.)
 *   3. Can the struggle beat hand structured data to the consolidation beat?
 *      (The "Explain what just happened" button — beat 3 opens by naming what
 *      you personally did.)
 *
 * If 1 or 2 fails, the whole client architecture is wrong and it is week 3, not
 * week 30. That is the entire value of this screen.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSharedValue } from 'react-native-reanimated';
import { useRouter } from 'expo-router';

import { Button } from '@/ui/Button';
import { ink, radius, space, series, status, surface, type } from '@/theme/tokens';
import {
  divergenceThreshold,
  lossAt,
  makeDataset,
} from '@/widgets/models/gradientDescent';
import { LossSurface } from '@/widgets/views/LossSurface';
import { FitPanel } from '@/widgets/views/FitPanel';
import { PerfHud } from '@/widgets/views/PerfHud';
import { LogSlider } from '@/widgets/controls/LogSlider';
import { useModelLoop } from '@/widgets/runtime/useModelLoop';
import { useSharedFlag, useSharedMirror } from '@/widgets/runtime/useSharedMirror';
import { evaluateNarration, gradientDescentNarration } from '@/widgets/narration/rules';
import {
  beginAttempt,
  endAttempt,
  recordEtaChange,
  recordOutcome,
  recordRunStarted,
} from '@/capture/attemptStore';

const INIT = { w: -0.4, b: 2.4 };
const ETA_MIN = 0.001;
const ETA_MAX = 0.5;
const H_PAD = space.lg;

/** A change smaller than this (in log space) is a wobble, not a decision. */
const ADJUSTMENT_EPSILON = 0.05;

const TONE_COLOR: Record<string, string> = {
  neutral: ink.secondary,
  good: status.good,
  warning: status.warning,
  critical: status.critical,
};

export default function GradientDescentSpike() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();

  const dataset = useMemo(() => makeDataset(), []);
  const threshold = useMemo(() => divergenceThreshold(dataset), [dataset]);
  const initialLoss = useMemo(() => lossAt(dataset, INIT.w, INIT.b), [dataset]);
  const targetLoss = initialLoss * 0.02;

  const eta = useSharedValue(0.05);
  const runtime = useModelLoop({ dataset, eta, init: INIT, stepsPerFrame: 4 });

  const [etaSample, setEtaSample] = useState(0.05);
  const loss = useSharedMirror(runtime.loss, 6);
  const steps = useSharedMirror(runtime.stepCount, 4);
  const running = useSharedFlag(runtime.running);
  const diverged = useSharedFlag(runtime.diverged);

  const lastRecordedEta = useRef(0.05);
  const bestLoss = useRef(Number.POSITIVE_INFINITY);
  const [hasRun, setHasRun] = useState(false);

  const canvasW = screenW - H_PAD * 2;
  const surfaceH = Math.min(canvasW, 300);

  useEffect(() => {
    beginAttempt('gradient-descent-0a');
  }, []);

  // --- capture ---------------------------------------------------------
  const onEtaSample = useCallback((v: number) => {
    setEtaSample(v);
    if (Math.abs(Math.log(v) - Math.log(lastRecordedEta.current)) > ADJUSTMENT_EPSILON) {
      lastRecordedEta.current = v;
      recordEtaChange(v);
    }
  }, []);

  useEffect(() => {
    if (loss < bestLoss.current) {
      bestLoss.current = loss;
      recordOutcome({ bestLoss: loss, totalSteps: steps });
    }
    if (loss < targetLoss) recordOutcome({ reachedTarget: true });
  }, [loss, steps, targetLoss]);

  useEffect(() => {
    if (diverged) recordOutcome({ diverged: true, finalEta: etaSample });
  }, [diverged, etaSample]);

  // --- controls --------------------------------------------------------
  const toggleRun = useCallback(() => {
    if (runtime.diverged.get()) return;
    const next = !runtime.running.get();
    runtime.running.set(next);
    if (next) {
      setHasRun(true);
      recordRunStarted();
    }
  }, [runtime]);

  const reset = useCallback(() => {
    runtime.reset();
    bestLoss.current = Number.POSITIVE_INFINITY;
  }, [runtime]);

  const consolidate = useCallback(() => {
    runtime.running.set(false);
    recordOutcome({ finalEta: etaSample, totalSteps: steps });
    endAttempt(false);
    router.push('/spike/consolidate');
  }, [etaSample, router, runtime, steps]);

  const narration = evaluateNarration(gradientDescentNarration, {
    eta: etaSample,
    threshold,
    loss,
    initialLoss,
    running,
    diverged,
    steps,
  });

  const reachedTarget = loss < targetLoss;

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]}
    >
      {/* ---- BEAT 1: HOOK ------------------------------------------------ */}
      <BeatLabel n={1} name="Hook" />
      <Text style={styles.hookHead}>Your model isn&apos;t learning.</Text>
      <Text style={styles.body}>
        The loss climbs instead of falling. Your data is fine. Your architecture is fine. Your
        gradients are fine. <Text style={styles.em}>One number</Text> is wrong — and it&apos;s the
        one everybody copies from a blog post without thinking.
      </Text>

      {/* ---- BEAT 2: STRUGGLE -------------------------------------------- */}
      <BeatLabel n={2} name="Struggle" />
      <Text style={styles.body}>
        Below is the error landscape. The orange dot is your model; the aqua ring is the best it
        could possibly be. Find a step size that <Text style={styles.em}>gets there</Text> — then
        find one that <Text style={styles.em}>blows it up</Text>. Both are worth doing.
      </Text>

      <View style={styles.card}>
        <LossSurface
          dataset={dataset}
          width={canvasW - space.md * 2}
          height={surfaceH}
          w={runtime.w}
          b={runtime.b}
          traj={runtime.traj}
        />
        <View style={styles.axisRow}>
          <Text style={styles.axisLabel}>slope w →</Text>
          <Text style={styles.axisLabel}>↑ intercept b</Text>
        </View>

        <View style={styles.divider} />

        <FitPanel
          dataset={dataset}
          width={canvasW - space.md * 2}
          height={110}
          w={runtime.w}
          b={runtime.b}
        />
        <LegendRow />
      </View>

      {/* Narration: the sentence that explains what you just caused, while you
          are still causing it. */}
      <View style={styles.narrationBox}>
        <Text style={[styles.narration, { color: TONE_COLOR[narration.tone] }]}>
          {narration.text}
        </Text>
      </View>

      {/* ---- BINDING ------------------------------------------------------ */}
      <View style={styles.bindingHeader}>
        <Text style={styles.bindingLabel}>Learning rate η</Text>
        <Text style={styles.bindingValue}>{etaSample.toFixed(3)}</Text>
      </View>
      <LogSlider
        value={eta}
        min={ETA_MIN}
        max={ETA_MAX}
        width={canvasW}
        onSample={onEtaSample}
        marker={{ at: threshold, color: status.critical }}
      />
      <View style={styles.sliderScale}>
        <Text style={styles.scaleTick}>{ETA_MIN}</Text>
        <Text style={styles.scaleTick}>{ETA_MAX}</Text>
      </View>

      <View style={styles.readoutRow}>
        <Readout label="error" value={diverged ? '∞' : loss.toFixed(4)} />
        <Readout label="steps" value={String(steps)} />
        <Readout
          label="target"
          value={reachedTarget ? 'reached' : `< ${targetLoss.toFixed(3)}`}
          tone={reachedTarget ? status.good : undefined}
        />
      </View>

      <View style={styles.buttonRow}>
        <Button
          label={diverged ? 'Diverged' : running ? 'Pause' : 'Run'}
          onPress={toggleRun}
          variant="primary"
          tint={series.s2}
          disabled={diverged}
        />
        <Button label="Reset" onPress={reset} />
      </View>

      <PerfHud runtime={runtime} />

      {/* ---- GATE --------------------------------------------------------- */}
      <View style={styles.gate}>
        <Button
          label={hasRun ? 'Explain what just happened →' : 'Run it at least once first'}
          onPress={consolidate}
          variant={hasRun ? 'primary' : 'secondary'}
          disabled={!hasRun}
        />
        <Text style={styles.gateNote}>
          Blocks are gated in the lesson player, not left to the author. You cannot read the theory
          until you have earned the question it answers.
        </Text>
      </View>
    </ScrollView>
  );
}

function BeatLabel({ n, name }: { n: number; name: string }) {
  return (
    <View style={styles.beatRow}>
      <View style={styles.beatPip}>
        <Text style={styles.beatPipText}>{n}</Text>
      </View>
      <Text style={styles.beatName}>{name}</Text>
    </View>
  );
}

function LegendRow() {
  return (
    <View style={styles.legend}>
      <LegendItem color={series.s2} label="your model" />
      <LegendItem color={series.s3} label="best possible fit" />
      <LegendItem color={ink.muted} label="observations" />
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

function Readout({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View style={styles.readout}>
      <Text style={styles.readoutLabel}>{label}</Text>
      <Text style={[styles.readoutValue, tone ? { color: tone } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: surface.page },
  content: { padding: H_PAD, gap: space.md },

  beatRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  beatPip: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ink.axis,
    alignItems: 'center',
    justifyContent: 'center',
  },
  beatPipText: { color: ink.muted, fontSize: 11, fontWeight: '700' },
  beatName: {
    color: ink.muted,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontWeight: '700',
  },

  hookHead: { color: ink.primary, fontSize: 26, fontWeight: '700', lineHeight: 32 },
  body: { color: ink.secondary, fontSize: 16, lineHeight: 24 },
  em: { color: ink.primary, fontWeight: '600' },

  card: {
    backgroundColor: surface.chart,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.hairline,
    padding: space.md,
    gap: space.sm,
  },
  axisRow: { flexDirection: 'row', justifyContent: 'space-between' },
  axisLabel: { color: ink.muted, fontSize: 10 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: ink.axis, marginVertical: space.xs },

  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginTop: space.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { color: ink.muted, fontSize: 11 },

  narrationBox: { minHeight: 52, justifyContent: 'center' },
  narration: { fontSize: 15, lineHeight: 21 },

  bindingHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: space.sm,
  },
  bindingLabel: { color: ink.secondary, fontSize: 15 },
  bindingValue: {
    color: series.s2,
    fontSize: 22,
    fontFamily: type.mono,
    fontVariant: ['tabular-nums'],
  },
  sliderScale: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -space.xs },
  scaleTick: { color: ink.muted, fontSize: 10, fontVariant: ['tabular-nums'] },

  readoutRow: { flexDirection: 'row', gap: space.xl, marginTop: space.xs },
  readout: {},
  readoutLabel: {
    color: ink.muted,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  readoutValue: {
    color: ink.primary,
    fontSize: 16,
    fontFamily: type.mono,
    fontVariant: ['tabular-nums'],
  },

  buttonRow: { flexDirection: 'row', gap: space.sm },

  gate: {
    marginTop: space.lg,
    gap: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ink.axis,
    paddingTop: space.lg,
  },
  gateNote: { color: ink.muted, fontSize: 12, lineHeight: 18 },
});
