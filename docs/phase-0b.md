# Phase 0b — Solver spike: brief

**Status:** not started. Specified here so it can be picked up without re-deriving the design.

The question: **can a learner solve algebra on a phone, offline, without reaching for paper — and does it feel better than paper rather than merely possible?**

This is the strongest commercial wedge in the product. Brilliant sends you to paper, and that break is where mobile sessions die. It is also the second-largest technical unknown after the widget abstraction, which is why it gets its own kill gate.

---

## Scope — narrow it aggressively

**In:** linear equations in one unknown. `3x + 5 = 20`, `2(x − 4) = 6`, `x/3 + 1 = 5`.

**Out for the spike:** quadratics, systems, symbolic calculus, logs, matrices. All of those are in scope for the *product* (see §5.5 of the architecture) and none of them belong in a spike whose job is to answer a yes/no question.

**Out entirely, forever:** long proofs, free-form geometric construction, extended derivations where the value genuinely is in the writing. Offer an optional scratchpad; never make progress depend on it. The promise is "you never *have* to leave the app", not "you may never write anything down".

## Build only Level 2

The product has three scaffolding rungs, faded automatically as mastery rises:

1. **Step-select** — pick the next transformation from 3–4 options. Easy to build, and it does not answer the question.
2. **Drag-to-transform** — drag `+5` across the equals sign and watch it become `−5`. **This is the spike.** The gesture physically embodies the algebraic rule, which is the pedagogical payload; it is also the hardest of the three and the one that could turn out to be unworkable on a 6-inch screen.
3. **Free entry** — type the next line on a maths keyboard.

If Level 2 works, 1 and 3 are straightforward. If Level 2 does not work, knowing that early is worth the whole spike.

## Technical approach

**Expression tree, rendered directly to Skia.** Not a LaTeX image, not a WebView. Every sub-term must be independently hit-testable and draggable, which means the renderer must own the layout and know the screen-space box of every node. Budget a layout pass that returns `{node, x, y, w, h}` for the whole tree.

**Equivalence by numeric probing, not symbolic proof.** To check that two expressions are equal, evaluate both at a dozen random points. Agreement everywhere means equivalence with overwhelming probability, at a tiny fraction of the cost. It is not a proof, and it needs care around domains and singularities — but for validating a student's algebra step it is entirely sufficient, and it is almost certainly the right answer for v1 over shipping SymPy-on-WASM.

**Validation asks two questions, not one:**

1. *Equivalent* — is the new expression mathematically equal to the previous one?
2. *Progressing* — does it move measurably toward the goal form? Multiplying both sides by 1 is valid and useless; say so gently rather than accepting it silently.

**Rejection must name the misconception**, not just mark it wrong:

> "You moved the 5 across, but kept its sign. What does the equals sign promise about both halves?"

Misconception tags are authored per rewrite rule. They drive targeted remediation, and at scale they become the most valuable analytics the product generates — they tell you exactly where your teaching fails.

## The gate

| Criterion | Target |
|---|---|
| Step validation latency | **≤ 50 ms**, on device, offline — fast enough that acceptance feels instantaneous rather than adjudicated |
| Gesture accuracy | A term can be grabbed reliably with a thumb, first try, on the smallest screen you support |
| Rule coverage | Every step needed to solve the six equations in `docs/fixtures/linear.md` (write these first) |
| Misconception naming | At least four distinct wrong moves produce four distinct, correct diagnoses |
| Bundle cost | The CAS layer adds < 500 KB |

**Kill trigger:** if the drag gesture cannot be made reliable on a phone, fall back to Level 1 step-select as the product's primary solving mode and re-evaluate whether "paper-free" is still a wedge or merely a feature. That is a real possible outcome and it is better discovered in week 6 than week 60.

## Decision this spike settles

Purpose-built rewrite engine (recommended) versus WASM SymPy. Build the rewrite engine first; only reach for SymPy if the rule library is visibly exploding past what the curriculum needs. The risk with the rewrite engine is scope creep — every new topic wants new rules — so the rule library gets budgeted like content, per curriculum unit, not treated as infrastructure that is "done".
