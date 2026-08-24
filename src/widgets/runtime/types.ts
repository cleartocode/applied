/**
 * The widget contract.
 *
 *   Widget := { model, bindings, views, capture }
 *
 * In Phase 0a the gradient-descent widget is hand-built against these types
 * rather than authored from YAML — the point of the spike is to prove the
 * *runtime* is fast and feels alive, not to prove the authoring format.
 *
 * But the types live here from day one, because Phase 1's job is to make a YAML
 * document compile down to exactly this shape. If the hand-built widget cannot
 * be expressed in these terms, the declarative engine will not work either, and
 * that is a thing worth finding out in week 3 rather than week 20.
 */

import type { SharedValue } from 'react-native-reanimated';

/** A parameter the learner can move. */
export interface Binding<T = number> {
  id: string;
  label: string;
  domain: readonly [T, T];
  default: T;
  control: 'slider' | 'stepper' | 'toggle' | 'drag-point';
  /** Log scale matters for anything spanning orders of magnitude, e.g. eta. */
  scale?: 'linear' | 'log';
  unit?: string;
  precision?: number;
}

/**
 * What the struggle beat records.
 *
 * This is the load-bearing piece of the whole pedagogy. Beat 3 has to open with
 * "you set eta to 0.42 and the loss exploded", not with a generic lecture, and
 * that is only possible if beat 2 wrote structured data somewhere beat 3 can
 * read it. Retrofitting this is what turns the product into a demo followed by
 * an unrelated explanation.
 */
export interface CaptureSpec {
  /** Terminal values of named bindings. */
  finalValues: readonly string[];
  /** Boolean predicates evaluated over the run. */
  predicates: readonly { id: string; describe: string }[];
  /** Dimensions fed to the strategy clusterer. */
  clusterOn: readonly ('adjustmentCount' | 'directionChanges' | 'timeToFirstChangeMs' | 'spanTried')[];
}

/** A narration rule: fires in the moment the learner causes the condition. */
export interface NarrationRule<Ctx> {
  id: string;
  /** Higher wins when several rules match. */
  priority: number;
  when: (ctx: Ctx) => boolean;
  text: (ctx: Ctx) => string;
  /** Optional visual emphasis for rules that describe a failure state. */
  tone?: 'neutral' | 'warning' | 'critical' | 'good';
}

/**
 * Everything a view needs to render, and everything the JS thread needs to
 * observe. Values a renderer reads every frame are SharedValues so they never
 * cross the bridge; anything sampled for the HUD or analytics is read through a
 * throttled reaction instead.
 */
export interface ModelRuntime {
  /** Live model state, written on the UI thread. */
  w: SharedValue<number>;
  b: SharedValue<number>;
  loss: SharedValue<number>;
  /** Flat [w0, b0, w1, b1, ...] descent path in model space, capped in length. */
  traj: SharedValue<number[]>;
  running: SharedValue<boolean>;
  diverged: SharedValue<boolean>;
  stepCount: SharedValue<number>;
  /** Rolling microsecond samples of the model step cost. */
  stepUs: SharedValue<number[]>;
  /** Rolling millisecond samples of inter-frame time. */
  frameMs: SharedValue<number[]>;
  reset: () => void;
}
