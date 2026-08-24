# Applied Mathematics & Sciences App — Technical Architecture

> **Canonical copy.** This file is the reference the code is written against. A mirror lives in the Claude project at `architecture/technical-architecture-v0.2.md`; v0.1 is kept there as history. If the two ever disagree, this one wins — edit here, then push the change up.

**Version** 0.2 (draft for discussion) · **Date** 19 August 2026 · **Status** Proposed
**Changes from v0.1:** pedagogy promoted to a first-class architectural layer (§2); lesson structure inverted to application-first (§2.2); Head First interaction patterns specified (§2.4); paper-free solving engine added as a third pillar (§5); content model, exercise types, roadmap and risks updated throughout.

---

## 1. What we are actually building

An applied-first learning app for maths and science, for two audiences: students aged 14–19 (Track A) and technology professionals (Track B).

The differentiator is not "gamified lessons" — Duolingo and Brilliant own that. It is a specific claim about *sequence*: **the real-world application comes first, the theory second, and the assessment returns to the real world.** You do not learn the chain rule and then see it applied to backpropagation. You are dropped into a neural network that is training badly, you try to fix it, you fail in an interesting way, and *then* you are taught the chain rule as the thing that explains what you just experienced.

Three commitments follow from that, and together they define the architecture:

1. **Application-first sequencing** (§2.2) — theory is the payoff, not the premise.
2. **Head First-style engagement** (§2.4) — conversational, visual, surprising, narrative, mandatory participation.
3. **Never leave the app to solve** (§5) — no reaching for paper. Problems are solved by manipulating maths on screen.

Each of these is normally treated as a content or design concern. All three are architectural here, because each imposes requirements the system must be built to satisfy and cannot be retrofitted.

### 1.1 The two tracks

One app, one engine, two tracks that diverge at onboarding and in tone, not in infrastructure.

| | **Track A — Students (14–19)** | **Track B — Tech professionals** |
|---|---|---|
| Motivation | Curiosity, exam relevance, streaks | Applied capability, career leverage |
| Session length | 5–10 min | 10–25 min |
| Hook style | "Why does Instagram's filter do that?" | "Why does your optimiser diverge at lr=0.3?" |
| Struggle tolerance | Lower — shorter struggle, faster rescue | Higher — let them sit in it |
| Example module | Rates of change → braking distance | Gradient descent → learning-rate pathology |
| Regulatory weight | **High** (minors: COPPA / GDPR-K) | Standard |

Track is a *dimension of content*, not a fork of the app. A concept node carries multiple framings and hooks; the client selects those matching the learner's track. Never build `if (track === 'student')` into components.

---

## 2. The pedagogy layer

This section is new in v0.2 and it now sits above everything else, because the pedagogy determines the data model rather than the other way round.

### 2.1 What the evidence actually says

Your instinct — application first, theory second — is well supported, with two boundary conditions that matter enormously for how we build.

**The supporting evidence.** Problem-solving-before-instruction (the research literature calls the high-fidelity version *Productive Failure*) outperforms instruction-first teaching on conceptual understanding and transfer: Hedges' *g* = 0.36, rising to 0.87 once publication bias is accounted for, and 0.37–0.58 when implemented with high fidelity. For learners aged roughly 11–16 the effect is *g* = 0.50; for undergraduates *g* = 0.28. Both of our tracks sit inside the range where it works. It is strongest in mathematics and the sciences — our exact domain.

**Boundary condition 1 — it does not help procedural fluency.** The same meta-analysis finds *g* = −0.03 for procedural knowledge. Struggling first helps you understand *why* the chain rule exists; it does nothing to help you *execute* it faster. For procedural objectives the worked-example effect applies instead: show a fully worked solution, then fade the scaffolding.

> **Architectural consequence.** Every `Concept` carries an `objective_type`: `conceptual` or `procedural`. That field selects the lesson template. Conceptual → struggle-first. Procedural → worked-example-first with fading. Getting this wrong in either direction wastes learner time: floundering through a mechanical drill is demoralising, and being handed the answer to a conceptual puzzle destroys the insight.

**Boundary condition 2 — struggle without consolidation is just failure.** The single strongest fidelity criterion in the research is that *instruction must build on the learner's own generated solution*. Not generic instruction after a generic attempt — instruction that explicitly references what this specific learner just did.

> **Architectural consequence, and it is a big one.** The learner's struggle attempt must be **captured as structured data** and made available to the teaching phase. When someone sets η = 0.4 and watches the loss explode, the theory screen must open with *"You set η = 0.4 and the loss exploded. Here is why."* This is not a content-authoring nicety; it is a data-flow requirement running from the widget runtime into the lesson player into the content renderer. Design it in now or the product's core mechanic degrades into "a demo followed by an unrelated lecture."

A third fidelity criterion — collaborative group work — we cannot deliver directly in a solo app. We can approximate it, and cheaply, because we will already have the data: after the struggle phase, show **three anonymised approaches other learners took**, clustered by strategy. "41% of people tried what you tried. 22% tried this instead." This restores some of the social comparison that makes productive failure work, and it is free once attempts are structured.

### 2.2 The lesson spine

Four beats. Every conceptual lesson follows this shape.

```
┌──────────────────────────────────────────────────────────────┐
│ 1. HOOK          30–60 s    The real-world situation.        │
│                             Concrete, specific, surprising.  │
│                             No notation yet. Ends on a       │
│                             question the learner wants       │
│                             answered.                        │
├──────────────────────────────────────────────────────────────┤
│ 2. STRUGGLE      2–5 min    They attempt it before being     │
│                             taught. Predict, tune, sort,     │
│                             estimate, or solve badly.        │
│                             ► ATTEMPT IS CAPTURED            │
│                             Failure is expected and safe.    │
├──────────────────────────────────────────────────────────────┤
│ 3. CONSOLIDATE   3–8 min    The theory — introduced as the   │
│                             explanation of what they just    │
│                             experienced, referencing their   │
│                             captured attempt by name.        │
│                             Notation arrives here, last.     │
├──────────────────────────────────────────────────────────────┤
│ 4. APPLY         3–8 min    Assessment in a DIFFERENT real-  │
│                             world context. Transfer, not     │
│                             repetition.                      │
└──────────────────────────────────────────────────────────────┘
```

Beat 4 is where most competitors quietly revert to abstract exercises. The rule is that **assessment items must be authored against an `Application`, not against a bare concept**, and CI enforces it (§4.3). If the practice is abstract, the product's promise is broken regardless of how good the hook was.

Worked example — the chain rule, Track B:

| Beat | Content |
|---|---|
| Hook | A two-layer network won't learn. You can see the output error but you need to know how much the *first* layer's weight is to blame. |
| Struggle | Sliders on both weights. Learner hunts for the blame assignment by hand. It is fiddly and they develop a felt need for a rule. Attempt captured: which weight they moved first, how many adjustments, whether they found the coupling. |
| Consolidate | "You noticed that changing w₁ changes the input to layer 2, which changes the error. That chaining is exactly what the chain rule formalises." Then the notation. |
| Apply | Different domain entirely — compound interest with a variable rate, or drug concentration through two metabolic stages. Same structure, new clothes. |

And your limits example, Track A: the hook is a genuinely funny one — a coffee cooling towards room temperature and never quite getting there, or Zeno's pizza slice halved forever. Humour is not decoration here; emotionally salient material encodes better, which is precisely why Head First uses it.

### 2.3 Where the theory actually goes

"Theory secondary" needs a precise reading, or we build something charming and useless. Secondary means **secondary in sequence and in framing, not in rigour**. The chain rule still gets stated properly. The learner still sees ∂L/∂w₁ = ∂L/∂a · ∂a/∂w₁.

What changes is that by the time the notation appears, every symbol in it already has a referent in something the learner personally manipulated ninety seconds ago. Notation stops being arbitrary. That is the whole trick, and it is why we can be *more* rigorous than a theory-first app rather than less.

The failure mode to guard against: lessons that are all hook and struggle, where learners have a nice time and cannot do anything afterwards. Guard rail — every lesson declares its concepts, and mastery is measured in beat 4. A lesson with a great hook and poor beat-4 performance is a broken lesson, and the content dashboard should surface that.

### 2.4 Head First patterns, translated to a phone

The Head First series is built on: visual intensity, conversational tone, narrative and recurring characters, humour and surprise, deliberate redundancy across modalities, metacognitive prompting, mandatory (never optional) activities, and depth over coverage. Translating each into a mobile app:

| Head First principle | App implementation |
|---|---|
| Conversational tone | Second person, contractions, direct address. The content voice is a house style enforced in review, not a per-author choice. Write **"you"**, never "the student". |
| Recurring characters | A small cast reappearing across lessons — an ops manager routing a delivery fleet, an ML engineer debugging a model, a physio analysing gait. Gives continuity, makes "real world" concrete, and gives authors a voice to write in. Cast is a content entity so characters stay consistent. |
| Visual intensity | **Adapted, not copied.** A dense Head First page does not survive a 6-inch screen — it becomes cognitive overload. Sequence instead: one idea per card, swipe forward. Preserve the *density of ideas per minute*, drop the density of ideas per square inch. |
| Humour & surprise | First-class. A `surprise` block type that violates an expectation the learner has just formed. Emotionally salient content encodes better; this is a real mechanism, not garnish. |
| Redundancy | The same concept in several modalities: manipulate it, see it, hear it named, say it back. The engine already supports this — a widget, a plot, prose, and a retrieval prompt are four encodings of one idea. |
| Metacognition | **Predict-then-check** as a required interaction before any simulation runs. "Where do you think the loss goes if I double η?" This is generation effect plus retrieval practice, and it costs one screen. |
| Activities not optional | Blocks are **gated**. You cannot scroll past a widget without interacting with it. This is enforced in the lesson player state machine, not left to the author. |
| Depth over coverage | Content strategy: 60 excellent lessons beat 400 thin ones. Resist curriculum-completeness pressure. |

Two honest cautions. First, the Head First voice is polarising — some readers find it grating, and the tolerance is lower for Track B professionals than for teenagers. Ship a **voice intensity setting** for the two tracks, tune it with real users, and be willing to dial Track B down. Second, jokes age badly and localise even worse; humour should sit in swappable content blocks, never load-bearing in an explanation.

### 2.5 Retention

Unchanged from v0.1 in mechanism, sharpened in application:

- **FSRS** scheduling over concepts (not flashcards), which outperforms the older SM-2 family.
- **Reviews re-encounter the concept through a different `Application`.** Same idea, new real-world dress. This is interleaving and varied-context practice, both well-evidenced, and it is exactly on-brand — the review *is* another real-world example rather than a repeat.
- **Interleave concepts** within review sessions rather than blocking them, accepting that it feels harder to learners while producing better retention. Flag it in the UI so the difficulty reads as intentional.

---

## 3. The content velocity problem

*(Unchanged in substance from v0.1 — restated because it still governs everything.)*

A hand-built interactive costs an engineer 2–5 days. A competitive library needs 300–600. That is 4–8 engineer-years, with every fix gated behind an app-store release. Content production becomes gated on engineering and the roadmap dies.

The architecture must answer: **how does a non-engineer ship an interactive lesson on a Tuesday afternoon?**

| Approach | Ship without app release | Perf | Authoring cost | Verdict |
|---|---|---|---|---|
| Bespoke native widgets, shipped over-the-air | Yes (minutes) | Excellent | 2–5 days, engineer | Escape hatch only |
| Web widgets in a WebView | Yes (instant) | Mediocre — 200–400 ms init, gesture conflicts | 1–2 days, web dev | Rejected as primary |
| **Declarative primitives + config** | **Yes** | **Excellent (native)** | **1–4 h, author only** | **Recommended** |

---

## 4. The content engine

### 4.1 Widget = Model + Bindings + Views

A *widget*, in this document, means the interactive machine embedded in a lesson — the gradient-descent slider, the routing graph. Almost all of them are one shape:

```
Widget := {
  model:    pure step function (state, params) -> state'
  bindings: declared parameters, each with a range and a control affordance
  views:    renderers subscribed to model state
  capture:  what to record from the learner's interaction   ← new in v0.2
}
```

The `capture` block is new and exists to serve §2.1. It declares what the struggle phase records: final parameter values, trajectory of adjustments, time to first change, whether a target predicate was met, which strategy cluster the attempt falls into. Without it, beat 3 cannot reference beat 2 and productive failure collapses into ordinary instruction.

```yaml
widget: model-explorer
model:
  builtin: gradient-descent
  loss: "0.5*(w*x - y)^2"
  init: { w: 2.4 }
bindings:
  - { id: eta, label: "Learning rate η", domain: [0.001, 0.5], default: 0.05, control: slider, scale: log }
views:
  - { type: plot2d, of: loss_surface, overlay: descent_path }
  - { type: readout, of: [w, loss, grad], precision: 3 }
capture:
  - { id: final_eta, from: eta }
  - { id: diverged, predicate: "loss[-1] > loss[0]" }
  - { id: strategy, cluster: [adjustment_count, direction_changes, time_to_first_change] }
narration:
  - when: "eta > 0.3"
    text: "η = {{eta}} overshoots — the step jumps past the minimum and the loss climbs."
```

The `narration` rules are the contextual summaries from your original brief, and they are the highest-leverage cheap feature in the product: they explain *what the learner just caused*, in the moment they caused it.

### 4.2 Built-in model library

1. `gradient-descent` — AI track flagship
2. `shortest-path` (Dijkstra / A*, stepped) — programmer track flagship
3. `expression-manipulator` — **new in v0.2**, see §5
4. `ode-integrator` — physics, growth, epidemiology
5. `regression-fit` — statistics, ML intuition
6. `monte-carlo` (seeded) — probability, risk
7. `queue-sim` — ops, systems, latency
8. `matrix-transform` — linear algebra, graphics
9. `network-flow` — logistics, capacity
10. `signal` (sampling, aliasing) — DSP, sensors
11. `constraint-solver` (small LP) — scheduling

Ten to eleven models plausibly cover 70–80% of the library. The rest take the escape hatch — bespoke React Native components shipped over-the-air, **capped at roughly one per ten lessons**. Without a cap the escape hatch silently becomes the default and §3 reopens.

### 4.3 Content model

```
Concept        atomic idea; node in the skill DAG; has prerequisites
               + objective_type: conceptual | procedural      ← new, drives lesson template
Application    real-world scenario bound to Concepts; domain, summary,
               source citation, "why this matters" hook
Character      recurring cast member (name, role, domain, voice notes)  ← new
Lesson         hook → struggle → consolidate → apply; targets 1–3 Concepts
Block          prose | widget | exercise | prediction | surprise | checkpoint
Exercise       typed, gradeable (§4.4); tagged to Concepts AND to an Application
Attempt        captured struggle data; feeds consolidation and analytics   ← new
Bundle         immutable, content-hashed unit of publication
```

`Application` earns its own entity because it is the reason the product exists — making it queryable lets us surface the same concept through a different application on review, and gives us a place to enforce sourcing so the real-world claims are actually true.

CI rules that enforce the pedagogy rather than merely the schema:

- Every `Application` must carry a source. No citation, no publish.
- Every `Lesson` must have all four beats present and non-empty.
- Every beat-4 `Exercise` must reference an `Application` **different from** the lesson's hook Application. This is what mechanically prevents drift back to abstract practice.
- Every `Concept` must declare `objective_type`, and the lesson template must match it.
- The concept graph must remain acyclic.

### 4.4 Exercise types

| Type | Grading | Notes |
|---|---|---|
| `predict` | none — always "correct" | Metacognitive. Records the prediction, then shows reality. Never punished; being wrong here is the point. |
| `choice` | exact | Distractors carry diagnostic tags → targeted feedback |
| `numeric` | tolerance + units | Unit-aware; accepts symbolic input |
| `interact` | predicate on widget state | "Set η so the loss diverges" — graded on the model |
| `manipulate` | **CAS equivalence per step** | **New in v0.2 — the paper-free solver, §5** |
| `order` | sequence match | Algorithm steps, derivation ordering |
| `code` | sandboxed execution + tests | Track B; on-device runtime, offline |
| `derivation` | multi-step, per-step check | Scaffolded proof with hints |

`interact` and `manipulate` are the two types that make this different from a quiz app. Prioritise both.

### 4.5 Authoring pipeline

```
Author writes MDX + YAML in Git
   → Zod / JSON-Schema validation + pedagogy CI rules (§4.3)
   → compile: resolve widget refs, pre-render LaTeX to SVG, extract i18n
   → immutable content-hashed bundle
   → object storage + CDN
   → client pulls delta, caches to SQLite, works offline
```

Git-based authoring is right at this stage: free versioning, review, rollback, no CMS to build. **Protect the author preview loop above all else** — an author must see their widget running, in-app, in under five seconds. If that loop is slow, the content engine has failed no matter how elegant the schema is. Revisit a headless CMS past ~100 lessons, when non-technical authors outnumber technical ones.

---

## 5. The paper-free solving engine

Your third point is, commercially, the strongest of the three. Brilliant sends you to paper; that break is where sessions die, and it is why their mobile retention leaks. Solving on-screen is a genuine wedge.

### 5.1 The core: manipulation, not typing

The engine holds the expression as a **real syntax tree backed by a computer algebra system**, and the learner transforms it by direct manipulation. Every step is validated for **mathematical equivalence**, never string equality — so `2x`, `x + x` and `x·2` are all accepted.

This is not speculative. Graspable Math has shipped gesture-based dynamic algebra notation for years, and the research finds it improves understanding of equivalence versus paper, while capturing rich data on *how* students solve — pause durations, operation order, strategy selection. That last part matters to us doubly, because it feeds §2.1's attempt capture.

### 5.2 Three scaffolding levels, faded by mastery

Your two suggestions are not alternatives — they are adjacent rungs on one ladder.

**Level 1 — Step-select (the Duolingo pattern).** The learner picks the correct next transformation from 3–4 options. Highest scaffolding, lowest friction, ideal for a phone and for a first encounter.

```
3x + 5 = 20
  What's the move?
  [ subtract 5 from both sides ]   [ divide both sides by 3 ]   [ add 5 to both sides ]
```

**Level 2 — Drag-to-transform (the Graspable pattern).** The learner drags the `+5` across the equals sign and it *becomes* `−5`. Tap a coefficient to distribute. Drag like terms together to combine. The gesture physically embodies the algebraic rule, which is the pedagogical payload — you are not just saving paper, you are making the rule kinaesthetic.

**Level 3 — Free entry.** Type the next line on a purpose-built maths keyboard; the CAS checks both equivalence and progress toward the goal. For advanced learners and Track B.

The learner is promoted through these levels **automatically as concept mastery rises**. This is fading scaffolding, and it is exactly what the expertise-reversal literature prescribes: heavy support helps novices and actively *hurts* experts. The mastery model (§7.4) already carries the signal needed to drive it.

### 5.3 Validation is two questions, not one

A step is accepted only if:

1. **Equivalent** — the new expression is mathematically equal to the previous one. (CAS.)
2. **Progressing** — it moves measurably toward the goal form. Multiplying both sides by 1 is valid and useless; the app should say so gently rather than accept it silently.

And when a step is rejected, the response must **name the misconception**, not just mark it wrong:

> "You moved the 5 across, but kept its sign. What does the equals sign promise about both halves?"

Misconception tags are authored per rule, feed targeted remediation, and are some of the most valuable analytics the product will generate — they tell you exactly where your teaching fails, at scale.

### 5.4 Technical risk — the honest part

This needs a CAS **on the device**: offline solving is a requirement, and a server round-trip per algebra step would make the interaction feel dead.

Options, none of them free:
- **math.js / Nerdamer** (JavaScript) — light, bundle-friendly, but limited for symbolic manipulation beyond basic algebra.
- **SymPy or SymEngine compiled to WebAssembly** — far more capable, materially heavier, needs careful lazy-loading.
- **A purpose-built rewrite engine** — implement only the transformation rules our curriculum actually needs, with equivalence checking via numeric probing at random points plus a normal form. Smaller, faster, fully controlled, and honestly the most likely right answer for v1 — but it is real work and it is where the schedule risk lives.

Numeric probing deserves a note because it is the pragmatic trick: to check whether two expressions are equivalent, evaluate both at a dozen random points. Agreement everywhere means equivalence with overwhelming probability, at a tiny fraction of the cost of symbolic proof. It is not a *proof*, and it needs care around domains and singularities, but for validating a student's algebra step it is entirely sufficient.

**This engine gets its own de-risking spike (Phase 0b, §8).** It is the second-largest technical unknown in the project after the widget abstraction, and it is on the critical path for the product's most differentiating feature.

### 5.5 Scope discipline

Solve on-screen for: linear and quadratic equations, systems, algebraic rearrangement, symbolic differentiation and integration by rule, logarithm and exponent manipulation, vector and matrix operations.

Do **not** attempt on-screen: long proofs, free-form geometric construction, extended derivations where the value genuinely is in the writing. For those, offer an optional scratchpad with stylus support — but never make progress depend on it. The promise is "you never *have* to leave the app", not "you may never write anything down".

---

## 6. Client architecture

### 6.1 Stack: React Native + Expo

Both frameworks draw fast graphics — `react-native-skia` uses the same Skia engine Flutter does, with GPU shaders and 60–120 fps on 1000+ point datasets. The tiebreaker is elsewhere:

| Criterion | RN + Expo | Flutter | Weight |
|---|---|---|---|
| Custom graphics | Skia, GPU, SkSL shaders | Native Skia/Impeller | High → tie |
| **Shared web target** | One widget codebase for app, marketing site, and author preview | Flutter Web is heavy, poor SEO, awkward text | **Decisive → RN** |
| Content pipeline language | MDX, Zod, remark, KaTeX — all JS | Parallel Dart toolchain needed | High → RN |
| CAS libraries (§5.4) | math.js, Nerdamer, WASM SymPy | Thinner | **High → RN** |
| Over-the-air updates | EAS Update, mature | More constrained | High → RN |
| Hiring | Pool reported ~10–15× larger | — | High → RN |
| Out-of-box UI consistency | Requires discipline | Better by default | Low — we draw our own canvas |

The web-target argument settles it: the author preview harness, the marketing site, and SEO top-of-funnel all want to run the *same* widget code as the app. One codebase in RN, two in Flutter. The CAS ecosystem argument, new in v0.2, reinforces it.

**Baseline:** Expo SDK 57, React Native New Architecture (Fabric + TurboModules) from day one, React 19, TypeScript strict.

### 6.2 Layers

```
┌──────────────────────────────────────────────────────┐
│  Screens          Expo Router                        │
├──────────────────────────────────────────────────────┤
│  Lesson Player    four-beat state machine (XState),  │
│                   block gating, attempt capture      │
├──────────────────────────────────────────────────────┤
│  Widget Runtime   model → bindings → views → capture │
│    ├ model executor    (worklet / isolate)           │
│    ├ binding layer     (Reanimated shared values)    │
│    └ view renderers    (Skia canvas)                 │
├──────────────────────────────────────────────────────┤
│  Solver Runtime   expression tree, CAS, gesture      │
│                   transforms, step validation  ← new │
├──────────────────────────────────────────────────────┤
│  Content Store    SQLite (bundles, assets)           │
│  Learner Store    SQLite (attempts, mastery, outbox) │
├──────────────────────────────────────────────────────┤
│  Sync Engine      outbox, delta pull                 │
├──────────────────────────────────────────────────────┤
│  Platform         auth, analytics, updates, payments │
└──────────────────────────────────────────────────────┘
```

### 6.3 The interaction loop

Cheap educational apps feel dead because of a 100 ms lag between dragging and seeing. Prevent it structurally:

- Slider value lives in a **Reanimated shared value** on the UI thread.
- Model step runs in a **worklet** on the UI thread — no JS round-trip.
- Skia reads shared values directly per frame.
- JS thread handles only loading, narration evaluation (debounced ~100 ms), capture, analytics, persistence.

Budget: **model step ≤ 4 ms**. Models exceeding it must precompute — rasterise the loss surface once at mount, animate only the path. Enforce with a dev-mode frame budget warning and a CI check on a real low-end Android device.

For the solver, the equivalent budget is **step validation ≤ 50 ms** — fast enough that acceptance feels instantaneous rather than adjudicated.

### 6.4 Rendering

- **Canvas, plots, graphs** — `react-native-skia` (~3–5 MB bundle cost; worth it). Normal RN views for layout.
- **Maths typesetting** — pre-render LaTeX to SVG at **build time** via KaTeX in the pipeline. Fast, offline, no WebView. The solver needs *dynamic* typesetting, so it renders its expression tree directly to Skia — which we want anyway, since every sub-term must be independently hit-testable and draggable.
- **3D** — defer. Most "3D" intuitions read better as 2D projections with a rotation control.

---

## 7. Backend

### 7.1 Supabase + edge functions + CDN

Serverless with a relational core. The data is genuinely relational — a concept DAG, prerequisite traversal, mastery rollups, cohort analytics — and a document store makes those queries painful within months. Firestore in particular fights the skill graph and prices exactly our access pattern badly.

```
Clients → Supabase (Auth, Postgres + RLS, Edge Functions, Realtime)
              ↓
       Object storage + CDN  (content bundles, SVG, media)
              ↓
       Warehouse (BigQuery/ClickHouse) ← events, nightly rollups
```

Edge functions do only what the client cannot be trusted with: entitlements, high-stakes grading, mastery recomputation, streak integrity, manifest signing.

### 7.2 Offline-first sync

Content is read-only and immutable, which removes 90% of the sync problem.

- **Content:** pull-only, content-hashed, cached in SQLite. Never conflicts.
- **Learner state:** local-first writes, append-only **outbox**, flushed on connectivity.
- **Conflicts:** progress is monotonic; mastery is derived server-side from the event log, never merged.

Use `expo-sqlite` (or `op-sqlite`) with a hand-rolled outbox rather than adopting WatermelonDB / PowerSync / ElectricSQL on day one — they solve a harder problem than we have, at the cost of a large dependency. Revisit if classroom or collaborative features arrive.

### 7.3 Data model sketch

```sql
concepts(id, slug, title, domain, difficulty, objective_type)
concept_edges(prereq_id, concept_id, strength)
applications(id, title, domain, summary, source_url, source_note)
application_concepts(application_id, concept_id)
characters(id, name, role, domain, voice_notes)
lessons(id, slug, track, bundle_version, concept_ids[], hook_application_id)
exercises(id, lesson_id, beat, type, concept_ids[], application_id, payload jsonb)

users(id, track, locale, age_band, created_at)
attempts(id, user_id, exercise_id, correct, ms, hints_used, payload jsonb, at)
struggle_attempts(id, user_id, lesson_id, captured jsonb, strategy_cluster, at)
solver_steps(id, user_id, exercise_id, step_n, from_expr, to_expr,
             accepted, misconception_tag, ms, at)
mastery(user_id, concept_id, p_known, stability, difficulty, last_seen, due_at)
events(id, user_id, name, props jsonb, at)
```

`age_band` rather than date of birth is deliberate data minimisation (§9). `solver_steps` is a research-grade dataset almost nobody else has — it records not just whether learners can solve equations but *how they try*, which is the raw material for genuinely adaptive remediation later.

### 7.4 Learner model

Two mechanisms, deliberately not conflated:

- **Mastery** (do they understand it?) — Bayesian Knowledge Tracing per concept, or Elo for simpler self-calibrating item difficulty. Propagates through the DAG. **Also drives solver scaffolding level (§5.2).**
- **Retention** (when do they see it again?) — **FSRS**, scheduling concepts rather than cards, with reviews re-dressed in a different Application.

Session generator: *k* due reviews + *n* frontier concepts, sized to track. Keep it rule-based and legible for v1 — it will be wrong in interesting ways and you want to be able to read why.

---

## 8. Analytics

**PostHog** as the single instrumentation layer (RN SDK, feature flags, experiments, session replay, self-hostable, EU residency), streamed to the warehouse. Flags and analytics in one SDK matters because the core product question is always "did this pedagogical change improve retention of concept X?"

Event taxonomy, defined before the first `track()` call:

```
lesson_started / completed / abandoned    {lesson_id, track, beat}
beat_completed                            {beat, dwell_ms}
prediction_made                           {predicted, actual, was_right}
struggle_captured                         {lesson_id, strategy_cluster, gave_up}
widget_interacted                         {widget_id, binding_id, value_bucket, count}
narration_fired                           {rule_id}
solver_step                               {accepted, misconception_tag, level, ms}
exercise_attempted                        {exercise_id, beat, correct, ms, hints}
concept_mastered                          {concept_id, attempts_to_mastery}
review_due / review_done                  {concept_id, interval_days, grade}
```

`widget_interacted` and `solver_step` are the highest-value and most dangerous events — a slider drag can emit hundreds per second. **Aggregate on device**: batch per widget mount, emit value *buckets* and counts, never a raw stream. Getting this wrong will dominate your event bill.

The pedagogically important metric, which no competitor instruments well: **beat-4 transfer performance segmented by struggle outcome.** Did learners who failed productively in beat 2 outperform those who succeeded immediately? If yes, the thesis is working and you can prove it. That is both a product signal and, eventually, marketing.

---

## 9. Regulatory constraint (Track A)

Serving under-18s is an architectural input, not a legal footnote.

- **Age gate at onboarding**, storing `age_band` only — never a birthdate we do not need.
- **Consent-gated analytics.** Under-16 learners get a reduced event set: no session replay, no autocapture, no third-party identifiers, no behavioural advertising ever. Verify the SDK supports a restricted init mode in Phase 3, not Phase 4.
- **EU data residency** for EU minors — a reason to prefer self-hostable or region-pinnable vendors.
- **Deletion must actually work** — cascading across Postgres, warehouse and analytics vendor. Design the deletion path alongside the schema; retrofitting it across a warehouse is genuinely hard.

General engineering guidance, not legal advice — get counsel review before Track A launch.

---

## 10. Delivery

| Phase | Duration | Goal | Ships |
|---|---|---|---|
| **0a — Feel spike** | 3–4 wks | Does it feel alive? | Hand-built gradient-descent widget, RN + Skia + Reanimated, on device. Prove ≤4 ms step. **Kill/redirect gate.** |
| **0b — Solver spike** | 3–4 wks | Is paper-free real? | Drag-to-transform on linear equations, CAS equivalence, ≤50 ms validation. Run 0a and 0b in parallel if staffing allows. **Second kill gate.** |
| **1 — Engine** | 6–8 wks | Does the abstraction hold? | Widget schema v1 with capture, 3 built-in models, view renderers, author preview harness. Test: an author rebuilds the 0a widget from YAML in under a day. |
| **2 — Vertical slice** | 6–8 wks | One track, end to end | 10 Track B lessons in full four-beat form, lesson player with gating and attempt capture, 4 exercise types incl. `manipulate`, local progress, no auth. |
| **3 — Platform** | 8–10 wks | Make it a product | Supabase, auth, sync, mastery + FSRS, scaffolding fade, analytics, OTA pipeline. Closed beta, Track B only. |
| **4 — Track A** | 6–8 wks | Second audience | Student framings and hooks, consent and age gating, parental flows, heavier scaffolding, streaks. |
| **5 — Scale** | ongoing | Content velocity | Remaining models, CMS evaluation, localisation, monetisation, experiments. |

Ship Track B first. Smaller, higher-intent, cheaper to reach, and carrying none of the minors-compliance weight — which lets Phases 0–3 move fast. Track A then lands on a platform that already works, and compliance becomes a workstream rather than a tax on everything.

**Phase 2 carries a pedagogy gate as well as a technical one:** run the ten lessons past real users and measure beat-4 transfer. If application-first is not beating a theory-first control on your own content, find out at ten lessons, not at three hundred.

> **Solo/part-time adjustment.** The durations above are team-weeks. The re-scoped sequencing actually being followed — including the reordering that puts a cheap pedagogy experiment before the engine, and hand-built widgets before the schema — is in `docs/roadmap.md`.

---

## 11. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| **Widget schema too rigid** — real lessons keep needing the escape hatch | **Highest** | Phase 1 gate: build 10 *diverse* lessons against it before locking. If >3 need custom code, redesign then. |
| **Solver scope explodes** — every new topic needs new rewrite rules | **High** (new in v0.2) | Ruthless §5.5 scope discipline. Rule library grows per curriculum unit, budgeted like content. Numeric-probing equivalence over full symbolic proof. |
| **Application-first is charming but hollow** — good hooks, poor learning | **High** (new in v0.2) | Beat-4 transfer measurement from Phase 2. Mastery measured in beat 4 only. A lesson with a great hook and poor beat-4 scores is a broken lesson and the dashboard must say so. |
| Content velocity collapses | High | Protect the <5 s author preview loop. Track lessons-shipped-per-author-week as an engineering metric. |
| Real-world claims wrong or stale | High | Sourcing enforced in CI. Domain-expert review for Track B — a wrong claim in front of professionals is fatal to trust. |
| Head First voice alienates Track B | Medium (new in v0.2) | Voice intensity per track, tuned with real users. Humour in swappable blocks, never load-bearing. |
| Struggle phase frustrates rather than motivates | Medium (new in v0.2) | Cap struggle duration; always offer an exit to consolidation; never score beat 2. Frustration is the failure mode that kills retention, and Track A tolerance is much lower than Track B. |
| Perf degrades on low-end Android | Medium | Frame budget in CI on real hardware from Phase 1. |
| Analytics cost surprise | Medium | On-device aggregation, per-session event budget, cost alerting from Phase 3. |

---

## 12. Open questions

1. **Monetisation** — freemium with paywalled Track B? Free for students? Affects entitlement architecture; decide before Phase 3.
2. **Launch locales** — English only, or English + Spanish? The pipeline should extract i18n strings from day one regardless, but humour and cultural hooks localise badly and that changes authoring cost materially.
3. **CAS strategy** — purpose-built rewrite engine (recommended for v1) versus WASM SymPy. Phase 0b should settle this.
4. **Track B code exercises** — on-device sandbox (offline, limited) or server execution (any language, needs connectivity)? Recommend on-device for v1.
5. **The second flagship module** — routing is a good candidate precisely because it stresses the widget schema differently (graph-shaped, not curve-shaped). Confirm before Phase 1.
6. **Anonymised peer attempts** (§2.1) — worth building in Phase 3, or defer? It recovers a real fidelity criterion cheaply, but needs enough users to be non-creepy and non-empty.

---

## Appendix — Decision summary

| Decision | Choice | Confidence | Revisit if |
|---|---|---|---|
| Lesson structure | Four beats: hook → struggle → consolidate → apply | High | Beat-4 data disproves it |
| Struggle-first scope | Conceptual objectives only; procedural gets worked examples | High | — |
| Attempt capture | Structured, feeds consolidation | High | — |
| Voice | Head First register, intensity tuned per track | Medium | Track B users reject it |
| Paper-free solving | Three faded levels: step-select → drag → free entry | Medium-High | Phase 0b fails |
| CAS | Purpose-built rewrite engine + numeric probing | Medium | Phase 0b shows WASM SymPy is viable |
| Client framework | React Native + Expo (SDK 57, New Arch) | High | Web target stops mattering |
| Graphics | react-native-skia + Reanimated worklets | High | — |
| Widget authoring | Declarative primitives; native escape hatch, capped | Medium-High | Phase 1 gate fails |
| Maths typesetting | Build-time KaTeX → SVG; Skia for dynamic solver | Medium-High | — |
| Content source | Git + MDX/YAML + Zod + pedagogy CI | High | >100 lessons, non-technical authors dominate |
| Backend | Supabase (Postgres, RLS, edge functions) | Medium-High | Scale or cost forces a move |
| Offline | expo-sqlite + hand-rolled outbox | Medium | Collaborative features arrive |
| Retention | FSRS over concepts, re-dressed applications | High | — |
| Mastery | BKT (or Elo) over the DAG; drives scaffolding fade | Medium | Poor calibration in data |
| Analytics | PostHog, on-device aggregation | Medium | Minors' consent mode insufficient |
| Launch order | Track B first | High | — |

---

### Sources

**Learning science**
- [Sinha & Kapur (2021), *When Problem Solving Followed by Instruction Works: Evidence for Productive Failure*, Review of Educational Research](https://journals.sagepub.com/doi/10.3102/00346543211019105)
- [Kapur & Roll, *Productive Failure* (BOLD Science)](https://boldscience.org/wp-content/uploads/2025/04/Productive-Failure.pdf)
- [Robust effects of explicit failure-driven scaffolding in problem-solving prior to instruction (ScienceDirect)](https://www.sciencedirect.com/science/article/pii/S0959475221000475)
- [The Expertise Reversal Effect and its instructional implications (Instructional Science)](https://link.springer.com/article/10.1007/s11251-009-9102-0)
- [Desirable Difficulties — Bjork's principles](https://www.structural-learning.com/post/desirable-difficulties)
- [The Effectiveness of Spaced Learning, Interleaving, and Retrieval Practice: A Systematic Review (JACR)](https://www.jacr.org/article/S1546-1440(23)00646-4/fulltext)
- [A systematic review of interleaving as a concept learning strategy (Review of Education)](https://bera-journals.onlinelibrary.wiley.com/doi/10.1002/rev3.3266)
- [FSRS vs SM-2 comparison — open-spaced-repetition](https://deepwiki.com/open-spaced-repetition/fsrs-optimizer/7.3-comparison-with-sm-2)

**Head First**
- [Head First Design Patterns, 2nd Edition — "How to use this book" (O'Reilly)](https://www.oreilly.com/library/view/head-first-design/9781492077992/)
- [Head First (book series) — Wikipedia](https://en.wikipedia.org/wiki/Head_First_(book_series))

**Manipulable mathematics**
- [Grasping Patterns of Algebraic Understanding: Dynamic Technology Facilitates Learning (Springer)](https://link.springer.com/chapter/10.1007/978-3-031-31848-1_12)
- [Graspable Math: Towards Dynamic Algebra Notations that Support Learners Better than Paper (IEEE)](https://ieeexplore.ieee.org/document/7821641/)
- [Asking students to solve equations — STACK documentation on CAS-based step validation](https://docs.stack-assessment.org/en/CAS/Equations/)

**Engineering**
- [React Native vs Flutter: A Production Engineering Comparison](https://www.bolderapps.com/blog-posts/react-native-vs-flutter-2026)
- [React Native Skia: GPU graphics, shaders, animations](https://reactnativerelay.com/article/react-native-skia-tutorial-gpu-graphics-shaders-animations-expo)
- [Expo SDK upgrade documentation](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)
- [EAS Update — Expo](https://docs.expo.dev/eas-update/introduction/)
- [Supabase vs Firebase 2026 comparison](https://www.digitalapplied.com/blog/supabase-vs-firebase-2026-backend-comparison-guide)
- [Best Mobile App Analytics Tools 2026 (Amplitude)](https://amplitude.com/compare/best-mobile-app-analytics-tools)
