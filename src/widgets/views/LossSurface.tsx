/**
 * View: the loss landscape, with the descent path drawn over it.
 *
 * Two rendering strategies, and the split is the whole lesson of this file:
 *
 *   - The field is **rasterised once at mount** into a Skia image. 65k cells of
 *     magnitude cannot be recomputed per frame and must not be tried; the
 *     closed-form loss makes each cell O(1), so the whole surface costs a few
 *     milliseconds, once.
 *   - The path and the marker are **animated from shared values** and never
 *     touch the JS thread.
 *
 * Any model that cannot separate its work this way will blow the frame budget.
 * That constraint belongs in the widget schema, not in a code review comment.
 */

import React, { useMemo } from 'react';
import {
  Canvas,
  Circle,
  Group,
  Image,
  Path,
  Skia,
  vec,
  AlphaType,
  ColorType,
  type SkImage,
} from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { closedFormSolution, lossAt, type Dataset } from '@/widgets/models/gradientDescent';
import { ink, sequentialBlueRgb, series, surface } from '@/theme/tokens';

/** Model-space extent of the plotted region. */
export const W_MIN = -1.5;
export const W_MAX = 4.5;
export const B_MIN = -3.5;
export const B_MAX = 3.5;

const GRID = 256;

function rasteriseLossField(dataset: Dataset): SkImage | null {
  const pixels = new Uint8Array(GRID * GRID * 4);

  // Two passes: find the dynamic range, then map. Loss spans several orders of
  // magnitude across this window, so the ramp is applied in log space —
  // linear mapping would render the entire valley as one flat colour.
  let lo = Number.POSITIVE_INFINITY;
  let hi = Number.NEGATIVE_INFINITY;
  const values = new Float64Array(GRID * GRID);

  for (let j = 0; j < GRID; j += 1) {
    const b = B_MAX - (j / (GRID - 1)) * (B_MAX - B_MIN);
    for (let i = 0; i < GRID; i += 1) {
      const w = W_MIN + (i / (GRID - 1)) * (W_MAX - W_MIN);
      const v = Math.log1p(Math.max(0, lossAt(dataset, w, b)));
      values[j * GRID + i] = v;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
  }

  const span = hi - lo || 1;
  const steps = sequentialBlueRgb.length;

  for (let k = 0; k < GRID * GRID; k += 1) {
    const t = (values[k] - lo) / span;
    const idx = Math.min(steps - 1, Math.max(0, Math.round(t * (steps - 1))));
    const [r, g, bl] = sequentialBlueRgb[idx];
    const o = k * 4;
    pixels[o] = r;
    pixels[o + 1] = g;
    pixels[o + 2] = bl;
    pixels[o + 3] = 255;
  }

  const data = Skia.Data.fromBytes(pixels);
  return Skia.Image.MakeImage(
    { width: GRID, height: GRID, colorType: ColorType.RGBA_8888, alphaType: AlphaType.Opaque },
    data,
    GRID * 4,
  );
}

export interface LossSurfaceProps {
  dataset: Dataset;
  width: number;
  height: number;
  w: SharedValue<number>;
  b: SharedValue<number>;
  traj: SharedValue<number[]>;
}

export function LossSurface({ dataset, width, height, w, b, traj }: LossSurfaceProps) {
  const image = useMemo(() => rasteriseLossField(dataset), [dataset]);
  const optimum = useMemo(() => closedFormSolution(dataset), [dataset]);

  const optX = ((optimum.w - W_MIN) / (W_MAX - W_MIN)) * width;
  const optY = ((B_MAX - optimum.b) / (B_MAX - B_MIN)) * height;

  const path = useDerivedValue(() => {
    const p = Skia.Path.Make();
    const t = traj.get();
    if (t.length < 2) return p;
    const sx = width / (W_MAX - W_MIN);
    const sy = height / (B_MAX - B_MIN);
    p.moveTo((t[0] - W_MIN) * sx, (B_MAX - t[1]) * sy);
    for (let i = 2; i < t.length; i += 2) {
      p.lineTo((t[i] - W_MIN) * sx, (B_MAX - t[i + 1]) * sy);
    }
    return p;
  }, [width, height]);

  const head = useDerivedValue(
    () =>
      vec(
        ((w.get() - W_MIN) / (W_MAX - W_MIN)) * width,
        ((B_MAX - b.get()) / (B_MAX - B_MIN)) * height,
      ),
    [width, height],
  );

  const gridPath = useMemo(() => {
    const p = Skia.Path.Make();
    for (let gw = Math.ceil(W_MIN); gw <= W_MAX; gw += 1) {
      const x = ((gw - W_MIN) / (W_MAX - W_MIN)) * width;
      p.moveTo(x, 0);
      p.lineTo(x, height);
    }
    for (let gb = Math.ceil(B_MIN); gb <= B_MAX; gb += 1) {
      const y = ((B_MAX - gb) / (B_MAX - B_MIN)) * height;
      p.moveTo(0, y);
      p.lineTo(width, y);
    }
    return p;
  }, [width, height]);

  return (
    <Canvas style={{ width, height }}>
      {image ? <Image image={image} x={0} y={0} width={width} height={height} fit="fill" /> : null}

      <Path path={gridPath} style="stroke" strokeWidth={1} color={ink.grid} opacity={0.35} />

      {/* Target: where the closed-form solution sits. A ring, not a dot, so the
          descent head can land on it without either mark disappearing. */}
      <Group>
        <Circle cx={optX} cy={optY} r={9} style="stroke" strokeWidth={2} color={surface.chart} opacity={0.7} />
        <Circle cx={optX} cy={optY} r={9} style="stroke" strokeWidth={2} color={series.s3} />
      </Group>

      {/* Path drawn twice: a wide translucent under-stroke reads as a trail and
          keeps the 2px line legible against the darkest steps of the ramp. */}
      <Path path={path} style="stroke" strokeWidth={6} strokeCap="round" strokeJoin="round" color={series.s2} opacity={0.25} />
      <Path path={path} style="stroke" strokeWidth={2} strokeCap="round" strokeJoin="round" color={series.s2} />

      {/* 2px surface ring under the head — the overlapping-marks rule. */}
      <Circle c={head} r={7} color={surface.chart} />
      <Circle c={head} r={5} color={series.s2} />
    </Canvas>
  );
}
