# applied — working context

An applied-first learning app for maths and science. The differentiator is **sequence**: the real-world application comes first, the theory second, and the assessment returns to the real world in a *different* domain.

## Read this first

**`docs/architecture/technical-architecture-v0.2.md`** is the canonical architecture document and the reference this codebase is written against. Read it before proposing structural changes, adding a dependency, or designing anything that touches the widget runtime, the content model, or the solver.

Supporting docs, all in `docs/`:

| File | What it is |
|---|---|
| `architecture/technical-architecture-v0.2.md` | **The architecture.** Pedagogy layer, content engine, solver, client, backend, risks. |
| `roadmap.md` | Solo/part-time delivery plan. Supersedes the phase durations in §10 of the architecture. |
| `phase-0a.md` | Feel-spike gate criteria and the record to fill in. |
| `phase-0b.md` | Solver-spike brief. Not started. |

## Where the project is

**Phase 0a**, implemented, gate not yet run on hardware. The repo contains one hand-built gradient-descent widget covering lesson beats 1–3. There is no backend, no auth, no sync, no content pipeline, no YAML authoring, no FSRS, no analytics, and no beat 4 — all of that is Phase 1 and later. This is a test rig for two claims the product cannot survive being wrong about, not a small version of the product.

## Commands

```bash
npm run ios / npm run android   # dev build required; Expo Go will not work
npm start                       # attach Metro to an installed dev client
npm run typecheck               # tsc --noEmit, strict
npm run lint                    # eslint flat config
npm run bench                   # headless model-step benchmark, no device needed
```

## Invariants — do not break these without reading §6.3 of the architecture

1. **Nothing visual crosses the JS thread.** Bindings are Reanimated shared values; the model step is a worklet; Skia views read shared values per frame. JS does loading, narration, capture and analytics only, all rate-limited. If a Skia view starts depending on React state, the interaction loop has a JS thread in it and the architecture stops paying for itself.
2. **Model step budget is 4 ms.** Expensive work is precomputed at mount — the loss field is 65k cells rasterised once into a Skia image. A model that cannot separate mount-time work from per-frame work does not belong in the runtime.
3. **The struggle beat writes structured data; the consolidation beat reads it.** `src/capture/attemptStore.ts` → `app/spike/consolidate.tsx`. Anything else is a demo followed by an unrelated lecture, and it is the one thing that cannot be retrofitted.
4. **Colour follows the entity, never its rank.** Orange is the learner's current model in every panel; aqua is the best possible fit. The palette in `src/theme/tokens.ts` was validated for colour-blind separation, lightness band, chroma floor and contrast against the dark surface — re-validate before adding a fourth series rather than picking a hue that looks nice.
5. **Models are pure and React-free.** `src/widgets/models/*` must run in bare Node (that is how `npm run bench` works) and carry the `'worklet'` directive. No imports, no shared values, no side effects.

## Conventions that will trip you up

- **Shared values use `.get()` / `.set()`, never `.value`.** The React Compiler lint rules treat `sharedValue.value = x` as mutating a hook return. Do not mix styles.
- **There is no `babel.config.js`, deliberately.** `babel-preset-expo` auto-registers `react-native-worklets/plugin` when the package is installed. Adding a config that lists it registers the transform twice and breaks worklets at runtime rather than at build time. It also resolves from `node_modules/expo/node_modules/`, so a hand-written config referencing it by name fails outright.
- **Path alias `@/*` → `./src/*`.** Routes live in `app/` (expo-router); everything else in `src/`.
- **`_to_delete/` is scratch** left by a file transfer and is gitignored. Safe to remove.

## Working style

The architecture doc is opinionated and argues its positions; match that register in docs and code comments. Explain *why* a constraint exists where the reason is non-obvious — the comments in `src/widgets/runtime/useModelLoop.ts` and `src/capture/attemptStore.ts` are the house style.

Do not add dependencies casually. This is a solo, part-time project; every dependency is a maintenance obligation against a budget of a few hours a week.
