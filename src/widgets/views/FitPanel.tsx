/**
 * View: the same model state, in the domain the learner actually cares about.
 *
 * The loss surface is where the algorithm lives; this panel is where the
 * *meaning* lives — a line moving through a cloud of points. Two encodings of
 * one idea, updated from one set of shared values, is the redundancy principle
 * made concrete: manipulate it, see it, see it again somewhere else.
 *
 * Colour follows the entity across both panels: orange is the learner's current
 * model wherever it appears, aqua is the best possible fit.
 */

import React, { useCallback, useMemo } from 'react';
import { Canvas, Circle, Line, Path, Skia, vec } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { closedFormSolution, type Dataset } from '@/widgets/models/gradientDescent';
import { ink, series, surface } from '@/theme/tokens';

export interface FitPanelProps {
  dataset: Dataset;
  width: number;
  height: number;
  w: SharedValue<number>;
  b: SharedValue<number>;
}

export function FitPanel({ dataset, width, height, w, b }: FitPanelProps) {
  const { xMin, xMax, yMin, yMax } = useMemo(() => {
    let xlo = Infinity;
    let xhi = -Infinity;
    let ylo = Infinity;
    let yhi = -Infinity;
    for (let i = 0; i < dataset.n; i += 1) {
      xlo = Math.min(xlo, dataset.xs[i]);
      xhi = Math.max(xhi, dataset.xs[i]);
      ylo = Math.min(ylo, dataset.ys[i]);
      yhi = Math.max(yhi, dataset.ys[i]);
    }
    const padY = (yhi - ylo) * 0.15;
    return { xMin: xlo, xMax: xhi, yMin: ylo - padY, yMax: yhi + padY };
  }, [dataset]);

  const toPxX = useCallback(
    (x: number) => ((x - xMin) / (xMax - xMin)) * width,
    [xMin, xMax, width],
  );
  const toPxY = useCallback(
    (y: number) => ((yMax - y) / (yMax - yMin)) * height,
    [yMin, yMax, height],
  );

  const optimum = useMemo(() => closedFormSolution(dataset), [dataset]);

  const points = useMemo(
    () => dataset.xs.map((x, i) => ({ cx: toPxX(x), cy: toPxY(dataset.ys[i]) })),
    [dataset, toPxX, toPxY],
  );

  const gridPath = useMemo(() => {
    const p = Skia.Path.Make();
    for (let i = 0; i <= 4; i += 1) {
      const y = (i / 4) * height;
      p.moveTo(0, y);
      p.lineTo(width, y);
    }
    return p;
  }, [width, height]);

  // The learner's line, clamped in y so a diverged model does not draw a
  // near-vertical streak across the panel and swamp everything else.
  const p1 = useDerivedValue(() => {
    const y = w.get() * xMin + b.get();
    const clamped = Math.max(yMin - 100, Math.min(yMax + 100, y));
    return vec(((xMin - xMin) / (xMax - xMin)) * width, ((yMax - clamped) / (yMax - yMin)) * height);
  }, [width, height, xMin, xMax, yMin, yMax]);

  const p2 = useDerivedValue(() => {
    const y = w.get() * xMax + b.get();
    const clamped = Math.max(yMin - 100, Math.min(yMax + 100, y));
    return vec(width, ((yMax - clamped) / (yMax - yMin)) * height);
  }, [width, height, xMin, xMax, yMin, yMax]);

  return (
    <Canvas style={{ width, height }}>
      <Path path={gridPath} style="stroke" strokeWidth={1} color={ink.grid} />

      {/* Best possible fit, shown from the start: the learner can see what they
          are converging on, which is what makes "not converging" legible. */}
      <Line
        p1={vec(0, toPxY(optimum.w * xMin + optimum.b))}
        p2={vec(width, toPxY(optimum.w * xMax + optimum.b))}
        strokeWidth={2}
        color={series.s3}
        opacity={0.55}
      />

      {points.map((pt, i) => (
        <React.Fragment key={i}>
          <Circle cx={pt.cx} cy={pt.cy} r={4.5} color={surface.chart} />
          <Circle cx={pt.cx} cy={pt.cy} r={3} color={ink.muted} />
        </React.Fragment>
      ))}

      <Line p1={p1} p2={p2} strokeWidth={2.5} color={series.s2} />
    </Canvas>
  );
}
