/**
 * Beat 3 — Consolidate. The architectural proof, not just a content screen.
 *
 * Everything on this page that matters is derived from what the learner
 * personally did thirty seconds ago. Nothing here is a generic lecture placed
 * after a generic activity — the strongest fidelity criterion in the
 * productive-failure research is that instruction must build on the learner's
 * *own* generated solution, and that is a data-flow requirement, not a writing
 * tip.
 *
 * The maths is set in Unicode here because the spike has no typesetting
 * pipeline yet. Phase 1 pre-renders LaTeX to SVG at build time (fast, offline,
 * no WebView); the solver in Phase 0b renders its expression tree straight to
 * Skia because every sub-term has to be independently hit-testable.
 */

import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Button } from '@/ui/Button';
import { ink, radius, space, series, status, surface, type } from '@/theme/tokens';
import { divergenceThreshold, makeDataset } from '@/widgets/models/gradientDescent';
import {
  PEER_DISTRIBUTION,
  clusterStrategy,
  useAttempt,
  type Attempt,
  type StrategyCluster,
} from '@/capture/attemptStore';

export default function Consolidate() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const attempt = useAttempt();
  const cluster = clusterStrategy(attempt);
  const threshold = useMemo(() => divergenceThreshold(makeDataset()), []);
  const [showRaw, setShowRaw] = useState(false);

  const opening = openingLine(attempt, cluster, threshold);

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]}
    >
      <View style={styles.beatRow}>
        <View style={styles.beatPip}>
          <Text style={styles.beatPipText}>3</Text>
        </View>
        <Text style={styles.beatName}>Consolidate</Text>
      </View>

      {/* The whole point: this sentence could not have been written in advance. */}
      <Text style={styles.opening}>{opening}</Text>

      <View style={styles.rule} />

      <Text style={styles.body}>
        Every step you watched did the same thing. It looked at the slope of the error where the
        model currently sits, and moved <Text style={styles.em}>against</Text> it — downhill. The
        only decision is how far to move.
      </Text>

      <View style={styles.mathBlock}>
        <Text style={styles.math}>w ← w − η · ∂L/∂w</Text>
        <Text style={styles.mathNote}>
          η is the only free choice in that line. Everything else is dictated by the data.
        </Text>
      </View>

      <Text style={styles.body}>
        Now the notation earns its keep. <Text style={styles.em}>∂L/∂w</Text> is the slope you
        watched the dot roll down. <Text style={styles.em}>η</Text> is the number you were
        dragging. The arrow is one frame of the animation. You already know what each symbol
        means, because you moved it.
      </Text>

      <Text style={styles.h2}>Why big steps explode</Text>
      <Text style={styles.body}>
        The slope tells you which way is downhill — it does not tell you how far away the bottom
        is. Take a step larger than the valley is wide and you land further up the opposite wall
        than you started. Repeat that and the error grows geometrically. It is not instability in
        your data; it is arithmetic.
      </Text>

      <View style={styles.mathBlock}>
        <Text style={styles.math}>converges ⟺ η &lt; 2 / λ_max</Text>
        <Text style={styles.mathNote}>
          λ_max is the curvature of the steepest direction in the landscape. For the dataset you
          just used, that puts the cliff edge at η ≈ {threshold.toFixed(3)}
          {attempt.maxEtaTried > threshold
            ? ' — which is exactly where yours went over.'
            : '. You stayed under it the whole time.'}
        </Text>
      </View>

      <Text style={styles.h2}>Why the path zig-zagged</Text>
      <Text style={styles.body}>
        The valley is far steeper across than along — about 28× steeper. The step size that is
        safe across is far too small along, so the path bounces between the walls while creeping
        towards the bottom. Every technique you have heard of — momentum, Adam, learning-rate
        schedules — exists to fix that one geometric fact.
      </Text>

      <PeerPanel cluster={cluster} />

      <View style={styles.nextBox}>
        <Text style={styles.beatName}>Beat 4 — Apply</Text>
        <Text style={styles.body}>
          In a real lesson this is where you would meet the same idea in a different domain — a
          drug clearing through two metabolic stages, or a control loop overshooting its setpoint.
          Transfer, not repetition. That beat is out of scope for this spike, and its exercise
          would be authored against a <Text style={styles.em}>different</Text> application from the
          hook — CI enforces it.
        </Text>
      </View>

      <Button label="← Back to the widget" onPress={() => router.back()} />

      <Button
        label={showRaw ? 'Hide captured attempt' : 'Show what the app recorded'}
        variant="ghost"
        onPress={() => setShowRaw((s) => !s)}
      />
      {showRaw ? (
        <View style={styles.rawBox}>
          <Text style={styles.rawText}>{JSON.stringify({ ...attempt, cluster }, null, 2)}</Text>
          <Text style={styles.rawNote}>
            In Phase 3 this becomes a row in `struggle_attempts`, written local-first and flushed
            through the outbox. It is also the raw material for the metric no competitor
            instruments well: beat-4 transfer performance segmented by struggle outcome.
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function openingLine(a: Attempt, cluster: StrategyCluster, threshold: number): string {
  const eta = a.finalEta.toFixed(3);
  const lo = isFinite(a.minEtaTried) ? a.minEtaTried.toFixed(3) : eta;
  const hi = isFinite(a.maxEtaTried) ? a.maxEtaTried.toFixed(3) : eta;

  switch (cluster) {
    case 'blew-it-up':
      return `You pushed η to ${eta} and the error exploded. Here is exactly why that had to happen.`;
    case 'found-it':
      return `You settled on η = ${eta} and it converged in ${a.totalSteps} steps. Here is the rule you found without being told it.`;
    case 'timid':
      return `You stayed between ${lo} and ${hi} — cautious. Here is what was waiting on either side of that.`;
    case 'systematic':
      return `You swept η from ${lo} to ${hi} and watched the path change shape ${a.adjustmentCount} times. Here is the rule underneath what you saw.`;
    default:
      return `You have not tried it yet. Go back and move the slider first — this page is written against what you actually do, and right now there is nothing to talk about.`;
  }
}

function PeerPanel({ cluster }: { cluster: StrategyCluster }) {
  const rows: { key: StrategyCluster; label: string }[] = [
    { key: 'blew-it-up', label: 'Drove it past the cliff' },
    { key: 'systematic', label: 'Swept the range methodically' },
    { key: 'found-it', label: 'Found a good value and stopped' },
    { key: 'timid', label: 'Barely moved it' },
  ];

  return (
    <View style={styles.peerBox}>
      <Text style={styles.h3}>How other people approached this</Text>
      {rows.map((r) => {
        const pct = Math.round((PEER_DISTRIBUTION[r.key] ?? 0) * 100);
        const mine = r.key === cluster;
        return (
          <View key={r.key} style={styles.peerRow}>
            <View style={styles.peerBarTrack}>
              <View
                style={[
                  styles.peerBarFill,
                  { width: `${pct}%`, backgroundColor: mine ? series.s2 : ink.axis },
                ]}
              />
            </View>
            <Text style={[styles.peerLabel, mine && { color: ink.primary }]}>
              {r.label}
              {mine ? '  ← you' : ''}
            </Text>
            <Text style={styles.peerPct}>{pct}%</Text>
          </View>
        );
      })}
      <Text style={styles.peerNote}>
        Placeholder distribution. Collaboration is the one fidelity criterion a solo app cannot
        deliver directly — showing clustered peer attempts recovers part of it, and costs nothing
        extra once attempts are already structured.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: surface.page },
  content: { padding: space.lg, gap: space.md },

  beatRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
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

  opening: { color: ink.primary, fontSize: 22, fontWeight: '700', lineHeight: 30 },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: ink.axis, marginVertical: space.xs },

  h2: { color: ink.primary, fontSize: 18, fontWeight: '700', marginTop: space.md },
  h3: { color: ink.secondary, fontSize: 14, fontWeight: '700' },
  body: { color: ink.secondary, fontSize: 16, lineHeight: 24 },
  em: { color: ink.primary, fontWeight: '600' },

  mathBlock: {
    backgroundColor: surface.chart,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.hairline,
    padding: space.md,
    gap: space.sm,
  },
  math: {
    color: ink.primary,
    fontSize: 20,
    fontFamily: type.mono,
    textAlign: 'center',
    paddingVertical: space.xs,
  },
  mathNote: { color: ink.muted, fontSize: 13, lineHeight: 19 },

  peerBox: {
    backgroundColor: surface.chart,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.hairline,
    padding: space.md,
    gap: space.sm,
    marginTop: space.md,
  },
  peerRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  peerBarTrack: {
    width: 64,
    height: 8,
    borderRadius: 4,
    backgroundColor: surface.raised,
    overflow: 'hidden',
  },
  peerBarFill: { height: 8, borderRadius: 4 },
  peerLabel: { color: ink.muted, fontSize: 13, flex: 1 },
  peerPct: {
    color: ink.muted,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  peerNote: { color: ink.muted, fontSize: 11, lineHeight: 17, marginTop: space.xs },

  nextBox: {
    borderLeftWidth: 2,
    borderLeftColor: status.warning,
    paddingLeft: space.md,
    gap: space.sm,
    marginVertical: space.md,
  },

  rawBox: {
    backgroundColor: surface.chart,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  rawText: { color: ink.secondary, fontSize: 11, fontFamily: type.mono },
  rawNote: { color: ink.muted, fontSize: 11, lineHeight: 17 },
});
