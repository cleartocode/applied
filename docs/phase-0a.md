# Phase 0a — Feel spike: gate record

**Status:** implemented, not yet run on hardware.
**Decision owed:** proceed / redirect the client architecture.

Fill this in after testing on real devices and commit it. A gate you did not write down is a gate you did not pass.

---

## The three questions

### 1. Perf — does the model step hold its budget?

| Device | Build | step p50 | step p95 | fps | Verdict |
|---|---|---|---|---|---|
| _(oldest Android you'll support)_ | release | | | | |
| _(mid Android)_ | release | | | | |
| _(your iPhone)_ | release | | | | |
| Simulator | debug | | | | *ignore — proves nothing* |

**Pass:** step p95 ≤ 4 ms and fps ≥ 50 on the oldest device, in a release build, with the descent running.

Headless baseline for comparison — `npm run bench`, this machine:

```
gdStep                 0.0166 µs/op    4.15e-4% of the 4 ms budget
4 steps/frame          0.0664 µs       1.66e-3% of budget
```

The maths is free by four orders of magnitude. Any on-device breach is worklet dispatch, shared-value churn, or Skia draw calls — not arithmetic. Fix the plumbing; do not optimise the model.

### 2. Feel — is it alive?

Not a number, but not a shrug either. Answer these in writing:

- When you drag the slider, does the fitted line move *with* your thumb or *after* it?
- Hand it to someone who has never seen it. Do they drag the slider without being told to?
- Does divergence read as *dramatic*? Watching the loss explode should feel like something happening to you, not like an error state.
- Does it survive a rotate, a background/foreground, a slow scroll?

**Redirect trigger:** if the interaction feels mediated — if there is a perceptible beat between finger and picture — the problem is the client architecture, not this widget. That is worth three weeks of finding out and it is why this spike exists.

### 3. Capture — can beat 2 feed beat 3?

Run the widget four different ways and check the consolidation screen opens with a sentence that could not have been written in advance:

| What you do | Expected opening |
|---|---|
| Push η past 0.33 and let it explode | "You pushed η to _x_ and the error exploded…" |
| Find a good η and converge | "You settled on η = _x_ and it converged in _n_ steps…" |
| Barely touch the slider | "You stayed between _a_ and _b_ — cautious…" |
| Sweep the whole range | "You swept η from _a_ to _b_ … _n_ times…" |

**Pass:** all four are distinguishable and all four are true. If the sentence is generic in any case, the clustering is wrong, and the whole productive-failure mechanic degrades into a demo followed by an unrelated lecture.

---

## Known limitations of this spike

- **Trajectory reallocates per frame.** `traj` is a plain array reassigned each frame. At 400 points that is well below the noise floor, but a widget retaining thousands of points needs a preallocated buffer.
- **No dynamic typesetting.** Maths is Unicode text. Phase 1 pre-renders LaTeX to SVG at build time; the solver renders its expression tree straight to Skia because every sub-term must be hit-testable.
- **No lesson player.** Beats are laid out by hand in one screen. The four-beat state machine (XState) and real block gating are Phase 2. The gate button demonstrates the mechanic, not the implementation.
- **Peer distribution is fabricated.** Clearly labelled as such on screen.
- **One model.** The whole point of Phase 1 is that a second, differently-shaped model (a graph, not a curve) will stress the abstraction in ways this one cannot.

## If the gate fails

**Perf fails:** measure before rewriting. Reduce `stepsPerFrame`; check whether the Skia path rebuild in `LossSurface` dominates (it rebuilds the full `SkPath` each frame — a growing path is the obvious suspect); consider capping trajectory points harder. Only if plumbing fixes fail is the framework choice in question — and re-run the same spike in Flutter before concluding anything, because the failure may be yours rather than React Native's.

**Feel fails but perf passes:** the problem is design, not architecture. Latency is not the only thing that makes an interaction feel dead — under-damped motion, missing anticipation, and a control with no sense of resistance all read as "cheap".

**Capture fails:** it is a clustering problem, not an architecture problem. The dimensions are already recorded; the rules in `clusterStrategy` are a first guess and are meant to be rewritten against real attempts.
