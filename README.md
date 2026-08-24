# applied

An applied-first learning app for maths and science. The differentiator is not gamification — it is **sequence**: the real-world application comes first, the theory second, and the assessment returns to the real world in a *different* domain.

This repository is currently **Phase 0**: two de-risking spikes that exist to kill or confirm the architecture before the platform gets built. Spike 0a is implemented. Spike 0b is specified and not started.

Full architecture: `architecture/technical-architecture-v0.2.md` in the Claude project.

---

## Running it

You need a **development build**. Expo Go will not work — `@shopify/react-native-skia` and `react-native-worklets` are native modules that are not bundled into it, and Skia is the entire point of the spike.

```bash
npm install

# iOS — needs Xcode + CocoaPods
npm run ios

# Android — needs Android Studio + an SDK and an attached device/emulator
npm run android
```

`expo run:*` generates the native projects on first run (`ios/`, `android/` — both gitignored) and builds them. That first build takes a while; afterwards `npm start` attaches the Metro bundler to the installed dev client in seconds.

```bash
npm run typecheck   # tsc --noEmit, strict
npm run lint        # eslint flat config
npm run bench       # headless model-step benchmark, no device needed
```

`npm run bench` runs with Node's built-in type stripping (Node 22.6+) and does not need `node_modules` at all.

### Two things that will confuse you later

**There is no `babel.config.js`, on purpose.** `babel-preset-expo` auto-registers `react-native-worklets/plugin` when the package is installed. Adding a config that lists the plugin explicitly registers the transform twice and breaks worklets in ways that surface as baffling runtime errors rather than build failures. `babel-preset-expo` also lives under `node_modules/expo/node_modules/`, so a hand-written config referencing it by name fails to resolve from the project root. Leave it absent.

**Shared values use `.get()` / `.set()`, never `.value`.** The React Compiler lint rules treat `sharedValue.value = x` as mutating a hook return. `.get()`/`.set()` is the compiler-safe Reanimated API and it is used consistently throughout. Don't mix the two styles.

---

## What Phase 0a is testing

Open the app → **Feel spike — gradient descent**.

| # | Question | How it is answered | Gate |
|---|---|---|---|
| 1 | Does maths responding to a finger feel *alive* on a real device? | Drag the η slider. Watch the fitted line move with your thumb, not after it. | Subjective, but honest — if it feels like a form field, the architecture is wrong. |
| 2 | Does the model step hold its budget? | The HUD above the gate button. `step p95`, live. | **p95 ≤ 4 ms** with frame rate ≥ 50 fps, on the worst device you intend to support. |
| 3 | Can beat 2 hand structured data to beat 3? | Press **Explain what just happened**. The first sentence names what *you* did. | The opening line is derived, never authored. |

Question 3 is the one most likely to be skipped and the most expensive to retrofit. The productive-failure research is unambiguous that instruction must build on the learner's own generated solution — generic instruction after a generic attempt produces none of the effect. That makes attempt capture a data-flow requirement running widget runtime → lesson player → content renderer, not a content-authoring nicety.

### Running the gate properly

The iOS simulator will pass every budget trivially and tell you nothing. Test on:

- the **oldest Android phone** you are willing to support, in a **release** build (`npx expo run:android --variant release`);
- with the device warm, not freshly rebooted;
- with the descent running, not paused.

Record `step p50`, `step p95` and `fps` from the HUD. If p95 is over 4 ms, run `npm run bench` — it measures the maths in isolation. The gap between the two numbers is plumbing (worklet dispatch, shared-value churn, Skia draw calls), and plumbing is what you would then go fix.

---

## Repository map

```
app/                          expo-router routes
  _layout.tsx                 stack, dark theme, gesture root
  index.tsx                   spike menu
  spike/gradient-descent.tsx  BEATS 1-2: hook + struggle
  spike/consolidate.tsx       BEAT 3: theory, opened by naming your attempt

src/
  theme/tokens.ts             validated palette; read from worklets, keep React out
  widgets/
    models/gradientDescent.ts pure step function — no React, no shared values
    runtime/
      types.ts                Widget := model + bindings + views + capture
      useModelLoop.ts         the frame loop. The invariant lives here.
      perf.ts                 ring buffers, percentiles, budget warning
      useSharedMirror.ts      UI-thread value -> React state, rate limited
    views/
      LossSurface.tsx         Skia: field rasterised once, path animated
      FitPanel.tsx            Skia: same state, second encoding
      PerfHud.tsx             the gate, on screen
    controls/LogSlider.tsx    pan gesture -> shared value, zero JS in the loop
    narration/rules.ts        "you just caused this" sentences, as data
  capture/attemptStore.ts     structured struggle data + strategy clustering
  ui/Button.tsx

bench/step-budget.ts          headless step benchmark
docs/                         phase gates and the solo delivery plan
```

## The invariants

Four rules the code is built around. Breaking any of them re-opens a problem this phase exists to close.

1. **Nothing visual crosses the JS thread.** Bindings are shared values; the model step is a worklet; Skia reads shared values per frame. JS does loading, narration, capture, analytics — all rate-limited. The moment a Skia view depends on React state, the interaction loop has a JS thread in it.
2. **Expensive work is precomputed at mount.** The loss field is 65k cells rasterised once into a Skia image. A model that cannot separate mount-time work from per-frame work will blow the budget, and that constraint belongs in the widget schema.
3. **The struggle beat writes structured data.** Beat 3 reads it. Anything else is a demo followed by an unrelated lecture.
4. **Colour follows the entity, never its rank.** Orange is the learner's current model in every panel; aqua is the best possible fit. The palette in `tokens.ts` was validated for colour-blind separation, lightness band, chroma floor, and contrast against the dark surface — re-run that validation before adding a fourth series rather than picking a hue that looks nice.

## What is deliberately missing

No backend, no auth, no sync, no content pipeline, no YAML authoring, no FSRS, no analytics vendor, no beat 4. All of that is Phase 1 and later. The spike is not a small version of the product; it is a test rig for the two claims the product cannot survive being wrong about.
