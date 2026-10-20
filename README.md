# VS Code Motion Audit

An interactive audit of motion patterns in the VS Code Agents Window. The site combines component studies, product recordings, and coordination timelines to show where simultaneous motion appears and why it may compete for attention.

## Public site

The planned GitHub Pages URL is:

`https://oliviatyu.github.io/vscode-motion/`

The public build includes:

- **Phase 1:** the existing Findings, Coordination, Principles, and Next steps.
- **Phase 2:** Current motion, Component motion, Interface transitions, Animated icons, and Opportunities.

It excludes the hidden Inventory, hidden research tables, editing dialog, and local Component Explorer links.

## Phase 2 foundation

Use the phase buttons in the header to switch between the original audit and
the new foundation. Each phase retains its last selected page during the visit.

Current motion groups existing audit evidence into Components, Transition
states, and Delights. Recordings and live Component Explorer previews are
paused by default. Each card reports **individual-animation CPU cost**:
animation name, High/Moderate/Low, extra CPU percentage points, on/off CPU,
paired range, and optimization priority. Logo and shimmer are measured
separately, not assigned a whole-component score. High means prioritize
optimization, Moderate means consider optimization, and Low means low overhead.
Tests and component links use Light for the two Light-only multi-diff loading
fixtures, and Dark for the other fixtures.

The earlier whole-fixture 124-fixture inventory contains 78 verified sustained-motion
screens: 21 High, 43 Moderate, and 14 Inconclusive CPU results. The other 46
fixtures remain Unverified (action/state replay, unsupported motion detection,
or a fixture error). None met this screen's repeatable input-delay or
frame-scheduling-delay threshold. The 64 CPU candidates are fixture states,
often sharing the same motion family, not 64 independently attributed product
problems. Native follow-up is partial and described below.
Component motion proposes role-based timing, easing,
behavior, and constraints as working hypotheses rather than approved tokens.

Opportunities pairs each problem with recorded or screenshot evidence and a
proposed solution. The chat-header status case includes three annotated
screenshots in a manual carousel: use Previous/Next or the left/right arrow keys
while focused inside it. Select a screenshot to open the full-size image.
The carousel does not advance automatically or animate between images.

The three guidance pages share a reading order: **Principles**, **Choose a motion role**
(or **Choose a transition pattern**), **Shared guidelines**, and **Supporting evidence**.
They use the same proposal label, section navigation, and evidence disclosure.
Component motion keeps its comparison table, Interface transitions keeps its
interactive schematics and prototype values, and Animated icons keeps its
role cards. Where applicable, pattern details use **Use when**, **Behavior**,
**Avoid**, and **Reduced Motion**. Evidence remains separate from recommendations;
the structure does not imply equal research coverage across the three pages.

### Library motion benchmark

The Current motion page presents **CPU cost**, not proven product slowdown.
All three categories (Components, Transition states, Delights) use the same
individual-animation rating. The filters are All, Low, Moderate, and High;
a component containing differently rated animations can appear in multiple
filters. A dash means no reliable individual rating, never a Low score.
Whole-component measurements in `assets/library-performance.json` are retained
as historical context, but cannot populate these individual ratings.

Run the individual-animation inventory with:

```bash
BENCHMARK_ISOLATE=1 npm run benchmark:library-performance
```

This writes `assets/library-animation-performance.json` without replacing the
earlier fixture data. Each visible sustained animation or SVG Draw logo
instance is measured separately. The coordinated dot timelines of one Pixel
spinner are one visual animation, not separate dot ratings. Other Web Animations are paused; other SVG
logos are stopped using their existing reduced-motion control. The full CPU
window and both verification windows reject unrelated DOM updates or advancing
animation timelines. Fixture content must match between paired conditions.
Multiple demonstration instances are not divided or extrapolated into a
single-animation estimate. Each instance has its own comparison.

High requires every paired CPU increase to be at least 5 percentage points;
Moderate requires every increase to be at least 1; Low requires all paired
differences strictly between -1 and +1. These are audit prioritization
thresholds, not universal performance budgets or percentages of product
slowdown. Variable results and unsupported one-shot transitions display a dash.
One-shot transitions need a matched action replay to receive a rating; they
are not rated from an idle-state measurement. Undetected JS/canvas motion and
other unattributable work are not assumed to be free.

The completed individual-animation inventory attempted all 124 fixture
references and discovered 196 animation instances. Of these, 127 passed the
isolated paired measurements: 6 High, 112 Moderate, and 9 too variable for a
rating; none met the Low rule. Another 69 instances failed isolation or state
validation, and 31 fixture references had no independently measurable sustained
target or a fixture-level error. These show a dash. Counts include repeated
instances of shared animation families, not 196 different designs. The SVG
working logo and thinking-text shimmer are the main rated families; each
fixture's instance and size retain their own measurements.

Run the benchmark while the local audit and Component Explorer servers are
available:

```bash
npm run benchmark:library-performance
```

The default origin is `http://localhost:4180`; set `BENCHMARK_ORIGIN` if needed.
The runner uses one dedicated Chrome instance and an embedded **interactive**
Explorer host (real timers). It renders each supported-theme fixture with motion paused,
awaits the explicit render-complete message, and waits two more seconds before
testing. Each on/off pair uses the same mounted fixture: **no reload or startup
work is included**. Motion is toggled through Explorer's `enableAnimations`
input, which also notifies JavaScript-driven logos. CSS animation activity and
Draw SVG path changes verify that motion runs when enabled and stops when
disabled. Fixture assertions and console errors invalidate the result.

Three five-second pairs alternate on/off order. Actual elapsed time is used for
CPU utilization; raw pairs, signed differences (including negative values), and
their min/max range are retained in `assets/library-performance.json`. These
ranges are not confidence intervals. A raw CPU High rating requires **every** pair to add
at least 5 CPU percentage points; Moderate requires every pair to add at least
1 point. Low requires all deltas strictly between -1 and 1 point. Other results
are Inconclusive, not forced into a misleading rating.

The same synthetic click probe runs in both conditions. The runner separately
records input delay, click-to-next-animation-frame p95, parent-frame rAF
intervals, and main-frame long tasks. These are scheduling proxies, **not**
physical-display frame measurements, real editor typing latency, or a proven
causal chain from CPU to user slowdown. CPU covers renderer processes/threads
in the dedicated browser, not GPU or total system usage. Headless Chrome,
machine load, demo copy count, and the instrumentation can affect results.

One-shot transitions, state-changing scenarios, undetected JavaScript motion,
failed motion controls, missing fixtures, and render failures remain
**Unverified** with reasons. They need scenario-specific action replay, not a
settled-state zero score. A recording without a matching fixture is not tested.
All fixtures are attempted serially and results are saved after each one.
An unresponsive renderer triggers a dedicated-browser restart so it cannot
poison later fixtures. Legacy startup measurements are never reused as verified
evidence. Interruptions preserve completed results and close only the runner's
own browser. `BENCHMARK_RESUME=1` can retain screened version-2 raw pairs only
when the method, sample settings, browser and platform match; all unverified
and missing fixtures are retried. Keep the fixture server on the same source
snapshot while running/resuming. Per-fixture timestamps identify retained data.

For a targeted repeat (use a separate output file to keep the full inventory):

```bash
BENCHMARK_FIXTURE=chat/widget/chatWidget/PersistentProgress/ToolChains/MixedConfirmation \
BENCHMARK_OUTPUT=/tmp/mixed-confirmation-performance.json \
BENCHMARK_RUNS=5 BENCHMARK_SECONDS=8 BENCHMARK_PROFILE=1 npm run benchmark:library-performance
```

`BENCHMARK_PROFILE=1` adds separate five-second on/off JavaScript profiles,
including raw Chrome profiles and sampled self-time by function. These help
locate a candidate's JS work; profiler samples are not the paired renderer CPU
metric and cannot attribute GPU/paint work or prove input slowdown.

Run the statistics/label regression tests with:

```bash
node --test scripts/library-performance-utils.test.mjs scripts/library-animation-isolation.test.mjs
```

**Product validation is a separate gate.** Reproduce a flagged motion in a
running VS Code build using an isolated profile and a repeatable workload. Keep
content, extension activity, and request/tool work unchanged; change only the
animation treatment. Repeat CPU and actual editor interaction measurements
with motion on/off and preserve build/version, settings, raw pairs, and any
blocked scenarios. Reduced Motion is a broad accessibility treatment and must
not be described as isolating a single animation. A fixture candidate alone
does not justify a “slowing VS Code down” claim.

### Native product follow-up (19 October 2026)

A separate, signed-in Insiders 1.143.0 instance (commit
`341e0fa9346520e7a6a09803a80c5ecd3027f3cb`, arm64) was checked using only
synthetic scratch-workspace requests. Five alternating five-second pairs
paused/played **only the actual logo's Web Animation**, leaving tool work and
other product motion unchanged. The two states were a timed terminal command
running and a real structured question waiting for an answer. The composer
received synthetic native key events; input-to-next-rAF timings are a scheduling
probe, not physical-display latency or a full editor-model benchmark.

The running-command logo test recorded a median +0.75 CPU percentage points
(paired range -1.50 to +3.44) and +0.8 ms input-to-frame difference. The
waiting-question test recorded approximately 0.0 CPU points (range -5.02 to
+5.28) and +0.6 ms input-to-frame difference. Both CPU results are Inconclusive;
neither demonstrated consistent input slowdown. This is not proof of zero cost.
The shared machine and concurrent fixture run were not controlled.

Crucially, the installed product used a **sprite-atlas Web Animation**
(`chat-working-logo-atlas-sheet`), while the local fixture source updates SVG
Draw paths. Some logo fixtures also display several demonstration sizes.
These are not identical workloads or implementations. Do not transfer fixture
CPU numbers directly to shipping VS Code or attribute a whole chat fixture's
cost to one element. Logo-only product tests do not validate shimmer, spinner,
image-generation, or exact confirmation/approval scenarios.

Native raw pairs and build provenance are attached to the full benchmark data
after the inventory run finishes. Remaining scenario/replay gaps stay explicit.

### Fixture repeat and profiling

Mixed Confirmation was screened again in a fresh dedicated browser with
separate on/off JavaScript profiles. The first three-pair CPU screen was High;
the fresh three-pair repeat was Moderate (+8.28 points median, range +4.04 to
+9.44). The displayed result uses the fresh repeat and retains the previous
screen's raw pairs and summary separately. Content fingerprints differed
between sessions, so the batches were not pooled. A High label did not survive
repetition; the CPU increase still merits investigation.

The profiles contain SVG path work but much of the additional sampled time is
unattributed `(program)` time. They do not establish which animation or
paint/GPU operation caused the whole fixture's CPU increase. Raw profiles are
retained with the result; the paired CPU windows do not include profiling.

Interface transitions and Animated icons contain draft guidance for review.
Interface transitions also includes live observations from Insiders
1.143.0, commit `341e0fa9346520e7a6a09803a80c5ecd3027f3cb`, on macOS arm64.
On October 19, 2026, 18 real UI actions were measured with
`workbench.reduceMotion` off and on in an isolated profile. CDP Animation
events, DOM transition events, Web Animations timings, and frame-by-frame
layout bounds distinguished surface motion from incidental scrollbar and
status-icon effects. No surface transition was detected for the tested view,
folder, Panel, Quick Open, side-bar, split, tab, or definition-navigation actions.
The Find widget used a 200 ms linear transform in both directions, suppressed
with Reduced Motion. Absence of interpolation does not imply zero processing
latency. Chat disclosure, chat selection, state handoffs, Panel maximization,
typing, and drag-resizing were not measured in this run. The isolated Chat
view was read-only; prior audit evidence is not relabeled as current validation.

Interface transitions proposes motion patterns for VS Code's persistent
workspace. Its seven reversible schematics cover content replacement,
expansion and collapse, surface entrance and exit, layout changes, connected
navigation, state handoffs, and instant changes. Each pattern includes multiple
representative VS Code scenarios, links to official interaction documentation
or existing audit evidence, and explicit no-animation exceptions. Evidence
verifies the interaction, not the proposed motion.
Each includes a Reduced Motion preview, and browser Reduced Motion
preferences always suppress the animation. Examples and timings are proposals,
not production evidence or approved specifications.
Each example documents animated properties, timing, the exact easing curve,
range and direction, and focus. Playback, interruption, and Reduced Motion
are documented once under Shared guidelines.
The displayed timing and easing are driven by the same values as the demo.
These are labeled Prototype values, separate from the live observations.
Connected navigation applies motion only to an optional destination highlight;
the navigation itself is immediate. Layout demos animate discrete commands,
never pointer-driven resizing. The state-handoff demo is a manual, static-status
simulation and does not run a tool or approval.

The seven-pattern set is a coverage proposal, not a finalized product standard.

Opportunities documents current product cases that could better follow the
guidance. Both phases are included in the local and public builds; adding
Phase 2 does not itself publish the changes.

## Animated icons

Choose **Phase 2** in the header, then **Animated icons** in the navigation to explore the proposed VS Code guidance.
The page leads with proposed principles, three purpose-based motion roles (indeterminate activity, attention needed, and live input/output feedback), and shared usage guidelines. These are a synthesis of current product research, not a classification copied from implementations or an existing shipped standard. Each direction links to its supporting observations and distinguishes a proposal from what the product currently does.

The main page is deliberately concise: three principles, three compact role cards, one technical table, and three shared rules. Within Shared guidelines, **Technical motion guidance** proposes testing **1,500 ms per activity cycle**, based on existing Codicon rotation, across comparable rotation/ring/grid indicators. It initially retains the working logo's observed **2,667 ms** Draw cycle as an exception, proposes **0 ms** static attention, and keeps live feedback signal-driven. Equal durations do not imply equal perceived speed or a shared easing curve; steps, keyframes, and holds remain mechanism-specific. These are review proposals, not product changes or approved tokens.

A collapsed comparison and implementation checklist retains rhythm comparisons against the current **1,200 ms** ring and **1,820 ms** grid, mechanism specifications, lifecycle/interruption, accessibility, and live-signal validation. Evidence links reveal the appropriate appendix and nested checklist. Linear rotation and ease-out settling are conditional prototype candidates, not claims about every existing icon. New cue durations and live-signal smoothing values require contextual validation before standardization.

Recordings, implementation details, static/source-only cases, and review coverage are retained in a collapsed research appendix. Links from the guidelines expand that appendix to reveal the relevant evidence. The page uses existing product or fixture recordings and local Component Explorer links, not invented disclosure or sync demonstrations. Attention-needed guidance proposes a stable, non-looping status; live audio feedback remains a direction to validate, not a claimed live observation.

Evidence video players reserve a stable, contained preview area before playback. The Working logo uses the full-window poster from its streaming-response recording, not the narrow frame strip used for the separate logo sequence.

The 19 October 2026 review enumerated the complete local registry, then rendered every Dark-theme state in ten icon-relevant fixture groups, regardless of animation labels: 522 states. There were 506 renders without reported errors and 16 persistent-progress cases with Draw-path assertions; those cases are flagged rather than treated as clean confirmations. Shared implementations and related source consumers were checked separately. This is bounded coverage, not an audit of every VS Code icon, theme, extension, or released build.

Ten targeted states were also checked under both browser motion preferences and a separate reduced-motion CSS-class probe. JavaScript-driven logo motion was checked through SVG path changes, not CSS animation counts alone. Fixture overrides and synthetic service defaults are distinguished from end-to-end product settings.

The observed implementation families include the working logo, grid/ring PixelSpinner, and rotating Codicons. The page also retains static compact loaders and voice/download/source-only gaps. Proposals are informed by functional, consistent, and accessible motion guidance; implementation timings are observations, not approved tokens. Supporting design references are [Fluent motion](https://fluent2.microsoft.design/motion), [icon guidance](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/animated-icon), and [progress guidance](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/progress-controls). These are research references, not descriptions of VS Code's current behavior.

Local fixture links open the actual Component Explorer state. The public build retains fixture labels and recorded evidence without linking to an unavailable local server.

## Run the full local version

The local version retains developer references to Component Explorer.

```bash
python3 server.py
```

Open `http://localhost:4173/`.

Component Explorer references require the VS Code Component Explorer to be running separately on `http://localhost:5123/`. The audit and its recordings work without it.

The preview server serves Library performance JSON locally, including `assets/library-animation-performance.json`, which is required during app startup. Keep these data paths in `LOCAL_FILES` rather than proxying them to Component Explorer; restart the preview server after changing its routes.

## Build the public version

Node.js 22 or newer is recommended. No npm packages need to be installed.

```bash
npm run build
```

The generated site is written to `_site/`. To preview it locally:

```bash
npm run preview
```

Then open `http://localhost:4174/`.

## Publishing

The included GitHub Actions workflow builds `_site/` and deploys it to GitHub Pages whenever the `main` branch is pushed.

Before the first publish:

1. Review all screenshots and recordings for information that should not be public.
2. Create a public repository named `vscode-motion` under the `oliviatyu` account.
3. Push the reviewed `main` branch.
4. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions** if it is not selected automatically.

Visitor changes are stored only in that visitor's browser and are not shared with other visitors.
