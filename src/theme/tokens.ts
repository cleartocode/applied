/**
 * Design tokens.
 *
 * The categorical + sequential values come from a validated palette (colour-blind
 * separation, lightness band, chroma floor, and contrast-vs-surface all verified
 * for the dark surface below). Series slots are assigned in fixed order and are
 * never cycled — a fourth series folds into "other" or gets its own panel.
 *
 * Keep this file free of React imports: it is read from worklets.
 */

export const surface = {
  /** Page plane behind the cards. */
  page: '#0d0d0d',
  /** Chart / widget surface. All contrast ratios are measured against this. */
  chart: '#1a1a19',
  /** Raised control chrome. */
  raised: '#232322',
} as const;

export const ink = {
  primary: '#ffffff',
  secondary: '#c3c2b7',
  muted: '#898781',
  grid: '#2c2c2a',
  axis: '#383835',
  hairline: 'rgba(255,255,255,0.10)',
} as const;

/** Fixed-order categorical slots. Assign by entity, never by rank. */
export const series = {
  s1: '#3987e5', // blue   — reserved for the loss field (sequential ramp below)
  s2: '#d95926', // orange — descent path
  s3: '#199e70', // aqua   — fitted model
} as const;

export const status = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
} as const;

/**
 * Sequential blue ramp, light -> dark, for continuous magnitude (the loss field).
 * Index 0 = near-zero magnitude and is allowed to recede toward the surface.
 */
export const sequentialBlue = [
  '#cde2fb',
  '#b7d3f6',
  '#9ec5f4',
  '#86b6ef',
  '#6da7ec',
  '#5598e7',
  '#3987e5',
  '#2a78d6',
  '#256abf',
  '#1c5cab',
  '#184f95',
  '#104281',
  '#0d366b',
] as const;

/** The same ramp pre-parsed to RGB, for rasterising a pixel buffer. */
export const sequentialBlueRgb: readonly (readonly [number, number, number])[] =
  sequentialBlue.map((hex) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]);

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
} as const;

export const type = {
  family: undefined, // system sans
  mono: 'Menlo',
} as const;
