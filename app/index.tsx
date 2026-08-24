import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';

import { ink, radius, space, series, surface } from '@/theme/tokens';

export default function Home() {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>Phase 0 · de-risking spikes</Text>
      <Text style={styles.title}>applied</Text>
      <Text style={styles.sub}>
        Application first, theory second, assessment back in the real world. This build exists to
        answer two questions before the platform gets written.
      </Text>

      <Link href="/spike/gradient-descent" asChild>
        <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}>
          <View style={styles.cardHead}>
            <View style={[styles.pill, { borderColor: series.s2 }]}>
              <Text style={[styles.pillText, { color: series.s2 }]}>0a · READY</Text>
            </View>
          </View>
          <Text style={styles.cardTitle}>Feel spike — gradient descent</Text>
          <Text style={styles.cardBody}>
            Does maths responding to a finger feel alive on a real device? Does the model step hold
            under 4 ms? Can the struggle beat hand structured data to the theory beat?
          </Text>
          <Text style={styles.cardCta}>Open →</Text>
        </Pressable>
      </Link>

      <View style={[styles.card, styles.cardDim]}>
        <View style={styles.cardHead}>
          <View style={[styles.pill, { borderColor: ink.axis }]}>
            <Text style={[styles.pillText, { color: ink.muted }]}>0b · NOT STARTED</Text>
          </View>
        </View>
        <Text style={styles.cardTitle}>Solver spike — paper-free algebra</Text>
        <Text style={styles.cardBody}>
          Drag a term across the equals sign and watch it change sign. Equivalence checked on
          device in under 50 ms, offline. The strongest commercial wedge and the second-largest
          technical unknown.
        </Text>
        <Text style={[styles.cardCta, { color: ink.muted }]}>See docs/phase-0b.md</Text>
      </View>

      <Text style={styles.footnote}>
        The gate for each spike is a number, not a feeling. Both are written down in docs/.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: surface.page },
  content: { padding: space.lg, gap: space.md },
  kicker: {
    color: ink.muted,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  title: { color: ink.primary, fontSize: 40, fontWeight: '800', letterSpacing: -1 },
  sub: { color: ink.secondary, fontSize: 16, lineHeight: 24, marginBottom: space.md },

  card: {
    backgroundColor: surface.chart,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.hairline,
    padding: space.lg,
    gap: space.sm,
  },
  cardDim: { opacity: 0.6 },
  cardHead: { flexDirection: 'row' },
  pill: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: space.sm, paddingVertical: 3 },
  pillText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  cardTitle: { color: ink.primary, fontSize: 19, fontWeight: '700' },
  cardBody: { color: ink.secondary, fontSize: 15, lineHeight: 22 },
  cardCta: { color: series.s2, fontSize: 15, fontWeight: '600', marginTop: space.xs },

  footnote: { color: ink.muted, fontSize: 12, lineHeight: 18, marginTop: space.md },
});
