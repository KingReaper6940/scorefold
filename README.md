# Scorefold

[Open scorefold](https://scorefold.vercel.app)

**Compare your options. Keep the unknowns.**

A local weighted decision scorecard that leaves unanswered ratings as ranges. See which options could still lead, identify the missing information with the largest potential score swing, and try assumptions without changing your saved inputs.

![Scorefold local browser workspace, compact screenshot](docs/workspace.jpg)

## What it does

- Compare **2–6 options** against **1–8 criteria**, with a relative weight for each criterion.
- Score each option from **0 to 5**, or explicitly leave a rating **unknown**.
- Keep a short note or rationale beside every rating.
- Show a lower/upper score bound and weighted input coverage for each option.
- Identify a clear lead only when one lower bound exceeds all competing upper bounds.
- Sort unanswered questions by the maximum score range their rating can resolve.
- Test one unknown rating in an isolated **what-if scenario**.
- Save/reopen JSON projects, paste a saved project, and export CSV or a Markdown discussion brief.
- Run entirely in your browser with no account, uploads, analytics, or cloud storage.

## Run locally

Requires Node.js 20 or newer. There are no dependencies to install.

```sh
git clone https://github.com/KingReaper6940/scorefold.git
cd scorefold
npm run dev
```

Open **http://127.0.0.1:4183**. The fictional team-knowledge example is ready to edit.

1. Name your options and criteria.
2. Give criteria whole-number weights from 0 to 100. They do not need to sum to 100.
3. Rate each option from 0 to 5. **Higher always means more preferred**: use a criterion such as “affordability” rather than an ambiguous “cost.”
4. Choose **? · Unknown** when you do not have a rating. Zero is a real score, not a missing value.
5. Review the bounds and questions before drawing a conclusion.
6. Download a project to retain the inputs, or a Markdown brief to take the reasoning into a discussion.

**Inputs are not saved automatically.** Reloading restores the example. New scorecard, Load example, and successful imports replace the current in-memory scorecard; downloaded files are unchanged. Save before replacing your work.

## How the bounds work

For known ratings, the weighted contribution is:

```text
contribution = weight × rating / 5
lower score  = 100 × sum(known contributions) / sum(all weights)
upper score  = lower score + 100 × sum(unknown weights) / sum(all weights)
```

The lower bound treats every unknown as 0; the upper bound treats every unknown as 5. These are mathematical bounds conditional on your scorecard, **not probabilities, confidence intervals, or verified quality scores**.

A rating at a zero-weight criterion contributes nothing and creates no uncertainty. At least one weight must be positive.

**Weighted coverage** is the share of criterion weight with known ratings. It describes input completeness, not confidence in the evidence.

**Could lead** means an option's upper bound reaches or exceeds the highest current lower bound. It can include a tie. Options remain in input order rather than being ranked by an invented midpoint.

**Clear lead** requires one option's lower bound to be strictly higher than every other upper bound, within a small numerical tolerance. Complete equal top scores are reported as an exact tie.

### Example

The included fictional example uses weights 4, 4, 3, and 2:

| Option | Lower | Upper | Could lead? |
| --- | ---: | ---: | --- |
| Open-source wiki | 56.92 | 72.31 | No |
| Shared documents | 81.54 | 81.54 | Yes |
| Lightweight portal | 55.38 | 86.15 | Yes |

No option has a clear lead across those bounds. The portal's missing “Control over data” rating accounts for up to **30.77 points** of range; the wiki's missing “Low maintenance” rating accounts for **15.38 points**. Resolving the larger range first may be useful, but this is not a prediction that it will change the decision.

All sample names, ratings, and notes are illustrative. They make no claims about real products.

## Test an assumption

Under **What would change your mind?**, choose an unanswered positive-weight rating and an assumed score.

In the example, assuming the portal's missing rating is **5** gives the portal a clear lead. Assuming **0** gives shared documents a clear lead. The baseline remains open in both tests.

What-if results are temporary and excluded from all exports. To adopt an assumption, deliberately edit the baseline rating and record its rationale. Opening a new scorecard clears the temporary scenario.

## Save, reopen, and export

| Format | Contains |
| --- | --- |
| Project JSON | Title, option/criterion IDs and names, weights, ratings, notes, version |
| Input CSV | One row per option/criterion with weight, rating or `unknown`, and note |
| Markdown brief | Score bounds, coverage, possible leaders, questions, and all input rationale |

**Inspect export before downloading** shows the exact output. CSV quotes embedded commas/newlines and prefixes formula-like text with an apostrophe. Markdown escapes user markup rather than treating notes as executable or embedded content. Review spreadsheet import behavior and exported content before sharing.

Reopen a saved file with **Open project**, or use **Paste JSON** to paste its contents. Invalid imports leave the current scorecard intact. Exported projects preserve unknowns as JSON `null`; they are never converted to zero.

Included examples:

- [Fictional scorecard](examples/team-knowledge.json)
- [Full-precision result](examples/ranges.json)
- [Input CSV](examples/inputs.csv)
- [Discussion brief](examples/brief.md)

Regenerate them with `node scripts/examples.mjs`.

## Limits and interpretation

- 2–6 options; 1–8 criteria; integer weights 0–100; integer ratings 0–5 or unknown.
- Title: 80 characters. Distinct option and criterion names: 40 characters each. Notes: 200 characters.
- Project JSON: at most 50,000 JavaScript string characters, with a 200 KB file-read cap.
- Version 1 projects must include one rating per option/criterion pair, unique valid IDs, and distinct names. Unknown metadata is discarded.
- Invalid edits hide results and clear export previews until corrected.
- Scores assume the criteria can be combined additively. Strong performance can compensate for weak performance. Mandatory requirements, vetoes, dependencies, correlations, and nonlinear preferences are not modeled.
- Missing ratings may range independently over the full 0–5 scale. The app does not infer ratings, fetch facts, verify notes, choose weights, or make the decision.
- Displayed numbers are rounded; calculations and JSON result examples retain full precision.

This is a way to expose judgments and gaps in a comparison, not an assessment of whether a real-world option is suitable.

## Privacy and architecture

The app loads only its static files. Content Security Policy blocks network connections, and there are no storage APIs, cookies, analytics, external fonts, or backend. Names and notes stay in page memory until replaced or the page closes. Files you download may contain sensitive discussion details; no encryption or secure memory-erasure claim is made.

`src/core.mjs` validates scorecards, calculates bounds, and runs isolated scenarios. `src/files.mjs` handles normalized JSON, CSV, and Markdown. `src/app.mjs` renders text through DOM value/text properties. Browser extensions, the operating system, and any host serving altered source remain outside the app's control.

## Test and build

```sh
npm test
npm run build
```

The 16 Node tests cover zero versus unknown, ignored criteria, clear leads, ties, weight-scaling invariance, input bounds, normalization, isolated scenarios, JSON round trips, safe export formatting, and every one of the **36 completions** of the example's two unknown ratings. The exhaustive check verifies both score bounds and the set of possible leaders.

Browser verification checked baseline ranges, a scenario changing the leading option while exported baseline data remains unchanged, invalid-weight export blocking, successful pasted-project import, non-destructive invalid import, and responsive table scrolling. At a 390px viewport, the page remained within its viewport while the scorecard table scrolled inside its own container. Native file chooser and final downloaded-file handling were not verified end-to-end.

GitHub Actions runs tests and builds on Node 20/22 on Windows/Linux. The build checks browser-module syntax and emits the static site into `dist/`.

## Manual Vercel deployment

Import the repository in your Vercel dashboard:

| Setting | Value |
| --- | --- |
| Framework | Other |
| Root directory | `./` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Install command | Empty; no dependencies |

`vercel.json` includes the build/output settings. No environment variables, database, paid APIs, or server functions are needed. Other static hosts work if they serve `.mjs` files as JavaScript.

MIT licensed. See [LICENSE](LICENSE).
