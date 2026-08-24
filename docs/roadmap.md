# Delivery plan — solo, part-time

The phase durations in `technical-architecture-v0.2.md` are **team-weeks**. Multiplying them by four to get part-time weeks gives roughly two years to a closed beta, which is not a plan, it is a way to quit in month nine.

The right adjustment is to **cut scope, not stretch the schedule**, and to reorder so the two things most likely to be wrong get tested first and cheaply. What follows is that reordering.

---

## Now — get 0a onto hardware

Everything else waits on this. Estimated 1–2 part-time weeks, most of it fighting native build tooling rather than writing code.

1. `npm install`, then `npm run ios` (needs Xcode) and `npm run android` (needs Android Studio). First build is slow; after that Metro attaches in seconds.
2. Beg, borrow or buy **the worst Android phone you intend to support**. This is the single most useful piece of equipment in the project and a used one costs less than a month of any SaaS you will sign up for. The simulator will pass every budget and tell you nothing.
3. Run the gate in `docs/phase-0a.md`, in a release build, and fill the table in.
4. Commit the filled-in gate record. Decide: proceed, or redirect.

---

## Next — the cheap experiment nobody does

Before writing another line of engine, spend **one week** testing the thesis.

The architecture doc rates "application-first is charming but hollow" as a *high* risk and proposes measuring beat-4 transfer from Phase 2 — that is, after roughly six months of part-time work. You can get most of that signal now, for about a week, and solo you cannot afford not to.

The design:

- Take one concept you can write two ways. Learning rate is already half-built.
- **Version A:** the app as it stands — hook, struggle, then theory that names what they did.
- **Version B:** the same theory *first*, then the same widget as a demonstration. Ten minutes of work: reorder the screens, cut the capture-derived opening line.
- Recruit 20 people who don't know gradient descent — Reddit, a Discord, your network. Random-assign.
- Both groups then answer the same three **transfer** questions in a domain neither version mentioned. Compound interest with a changing rate. A control loop overshooting. Not "what is a learning rate" — that measures recall, and recall is not the claim.

If A beats B, you have your wedge, in your own data, on your own content, and you can say so in every piece of marketing you ever write. If A does not beat B, you have learned the most important thing about your product for the price of a week, and you can fix the lessons rather than the codebase.

The failure mode this guards against is the one that actually kills apps like this: learners have a nice time and cannot do anything afterwards.

---

## Then — 0b, timeboxed hard

`docs/phase-0b.md` has the brief. **Six part-time weeks, hard stop.** If drag-to-transform is not working by then, ship Level 1 step-select as the primary solving mode and move on. The point of a spike is to buy information, and a spike with no end date buys none.

---

## After the spikes — resist the engine

The architecture says Phase 1 builds the declarative widget engine and gates on "an author rebuilds the 0a widget from YAML in under a day", with a further gate at 10 diverse lessons. That ordering is right for a team. Solo, it has a trap in it: you would be designing a schema against one known widget and nine imagined ones, and you are the only person who pays for guessing wrong.

Invert it. **Hand-build three more lessons first**, chosen to be as structurally *unlike* the gradient-descent widget as possible:

- a **graph-shaped** one — shortest path / routing. Nodes and edges, not curves. This is the one that will break assumptions the current runtime doesn't know it is making.
- a **stochastic** one — a seeded Monte Carlo. Forces the question of reproducibility, which the deterministic PRNG in `makeDataset` only half-answers.
- a **discrete-step** one — an algorithm the learner single-steps through rather than watching run.

Four hand-built widgets is enough to see the shape of the abstraction. Then write the schema, and it will be a description of something real instead of a prediction. Budget the hand-built lessons at a week each and treat the wasted-looking effort as schema research, because that is what it is.

Only after that: the YAML compiler, the author preview harness, and the CI rules that enforce pedagogy rather than syntax (every application sourced; all four beats present; **every beat-4 exercise bound to a different application than the hook** — that rule is what mechanically stops the product drifting back into an abstract quiz app).

**Protect the author preview loop above everything.** An author — which is you — must see a widget running, in-app, in under five seconds. If that loop is slow, the content engine has failed no matter how elegant the schema is, and solo you will simply stop writing lessons.

---

## Re-scoped phases

| Phase | Part-time estimate | What it is | Gate |
|---|---|---|---|
| 0a | 1–2 wks | On hardware, gate filled in | step p95 ≤ 4 ms, feels alive |
| **P** | 1 wk | Pedagogy A/B on 20 people | A beats B on transfer |
| 0b | 6 wks, hard stop | Drag-to-transform, linear equations | ≤ 50 ms validation, reliable thumb grab |
| 1a | 3–4 wks | Three more hand-built widgets, deliberately unalike | You can name what they share |
| 1b | 6–8 wks | Schema, compiler, preview harness, pedagogy CI | Rebuild a hand-built widget from YAML in a day |
| 2 | 10–12 wks | 10 Track B lessons, four-beat player, local progress, no auth | Beat-4 transfer measured on real users |
| 3 | 10–12 wks | Supabase, auth, sync, mastery + FSRS, analytics, OTA | Closed beta, Track B only |
| 4+ | — | Track A, scale, monetisation | — |

Roughly 10–12 months of part-time work to a closed beta, with three real kill gates before month four. That is a schedule that can survive contact with a job.

---

## Decisions to take now, cheaply

These are open questions in the architecture doc that block work if left open, and that cost nothing to close.

**Track B only, for a long time.** Do not build Track A. Serving under-18s means age gating, consent-gated analytics, EU data residency, parental flows, verified deletion cascades across Postgres *and* the warehouse, and counsel review. That is a workstream, and solo it is a workstream you would be doing instead of the product. Track B is smaller, higher-intent, cheaper to reach, and carries none of it. Revisit when there is a team.

**English only at launch.** Extract i18n strings from day one — that is free if done from the start and expensive later — but do not localise. Humour and cultural hooks localise badly, and they are load-bearing in the Head First voice.

**Voice: dial it down for Track B.** The Head First register is polarising and professionals have less tolerance for it than teenagers. Ship a voice-intensity setting, default it low for Track B, tune it with real users. Keep jokes in swappable blocks, never load-bearing in an explanation.

**Defer monetisation, but not the entitlement seam.** Decide before Phase 3, not now. Leave a single place where "is this lesson unlocked" is answered so the answer can change later without touching sixty call sites.

**On-device code sandbox for Track B exercises.** Offline, limited language support, no server bill. Server execution is a Phase 5 problem if it is ever a problem.

---

## The metric to watch, once there is content

**Lessons shipped per author-week**, tracked as an engineering metric, not a content metric. Solo, you are the author, and the moment that number drops the engine has failed regardless of how good the architecture diagram looks.

And, once beat 4 exists: **transfer performance segmented by struggle outcome**. Did learners who failed productively in beat 2 outperform those who succeeded immediately? No competitor instruments this well. If the answer is yes, it is both a product signal and, eventually, the marketing.
