# DP-300 Exam Prep — Project Retrospective

**Date:** 22 October 2026
**Scope:** both halves of the project — the extractor workspace (`../DP-300 Exam`) and the shipped app repo (`DP-300-Exam-Prep`)
**Format:** Sailboat (Wind / Anchor / Rocks / Island) + prioritized action items
**Method:** source and schema read, git history review, live-site smoke test, and an independent audit of the question bank

---

## Verdict

**The engineering is genuinely strong. The product loop is thin. And there is one
content defect nobody has named yet — 26 questions that accept an answer and then
say nothing back.**

This is a well-built tool that has not yet been asked "what should a student do
next?". It answers "can I test myself?" very well. It does not yet answer "what am
I bad at?" or "what should I study on Monday?".

---

## Evidence snapshot

| Metric | Value |
| --- | --- |
| Questions in the bank | 422 |
| Auto-gradable | 243 (57.6%) |
| Ungradable | 179 (42.4%) — 130 hotspot, 22 lab task, 27 MCQ |
| Scenario narratives captured | 3 (Topic 4 body is absent from the source PDF) |
| Images | 570 files, 34.6 MB |
| App code | 1,547 lines, vanilla JS, no dependencies, no build step |
| Git history | 6 commits, one clear intent each, clean tree |
| Live site | HTTP 200, **0 console errors, 0 warnings**, all 422 questions render |
| Category count cross-check | 3 independent sources agree on all 5 domains |

---

## Wind — what is propelling this forward

**1. The single-source-of-truth decision on scenarios.**
The case-study narrative is stored exactly once in `scenarios[]`; questions carry
only `scenario_id` + a hyperlink-ready `scenario_ref`. `validate_bank.py` proves
zero characters are duplicated onto the questions. Most banks get this wrong and
carry a 40 KB copy of the narrative on every one of 13 questions. This one doesn't.

**2. Three independent sources cross-check the taxonomy.**
Per-question `[Domain]` headers, the `Exam-Outline.xml` H1 headings, and the
publisher's own front-matter count table all agree — 79 / 116 / 68 / 28 / 131 =
422. When three unrelated signals agree, extraction drift is not hiding.

**3. The app refuses to lie about grading.**
Only 243 questions have both an answer key and visible option text. The results
screen scores only those and *states how many could not be scored*. Hotspot
questions get an explicit "reviewed by hand" note; lab tasks say the walk-through
is in the explanation. Most practice apps would silently score 0% of the diagram
questions or drop them without explanation. This one is honest.

**4. Zero build step, zero dependencies, no server.**
`index.html` + `assets/` + a JSON file. It will still work in five years, on any
machine, with no `npm install` archaeology. For a training deliverable you may
hand to a colleague, that is not a small win.

**5. The Pages cache trap was found and fixed correctly.**
Commit SHA stamped into `index.html` and every asset URL carries `?v=<sha>`, so
a redeploy can never pair a fresh app with stale data. That is a real production
bug that most people only hit in production.

**6. Documentation is a genuine asset.**
The schema doc is precise enough to hand to another developer as a contract
(field tables, integrity rules, rendering examples), and the README explains
grading limits, mobile behaviour and provenance without overselling.

---

## Anchor — what is holding it back

**1. 26 multiple-choice questions accept a click and return nothing. ← the real one**

This is the finding worth acting on. In practice mode:

- `checkPracticeQuestion()` (`assets/app.js:1244`) returns early when
  `!isScorable(question)`, so no result is ever stored.
- `renderQuestion()` therefore hits neither the "Correct answer" nor the
  "Wrong answer" branch — `setFeedback` is never called.
- `renderQuestionNote()` (`assets/app.js:904-916`) has four note branches:
  hotspot, simulation, image-only options, and *"key points into an image"*.
  **A question with no answer key at all matches none of them.**

So the candidate selects an option, it highlights, and nothing else happens. No
verdict, no explanation, no note. And because no result is ever stored, the
question never locks — they can re-click forever, still learning nothing.

The exact split of the 27 ungradable MCQs:

| Case | Count | What the user sees |
| --- | --- | --- |
| Has a key, options are image-only | 1 | Note: "option text lives in the image" — but still no feedback |
| **No key, visible option text** | **16** | **Click accepted, zero feedback, zero explanation** |
| **No key, zero options at all** | **10** | **Nothing to click — stem + image, dead end** |

The 10 worst are ids `127, 128, 130, 168, 178, 182, 203, 297, 392, 415` — zero
options, zero answer key, zero explanation. They are unanswerable by
construction. The app renders an empty option list and looks like it simply
forgot to load.

**2. 1,547 lines of exam logic with no automated test.**
`validate_bank.py` validates the *data*. Nothing validates the *app*. The parts
that would silently mislead a candidate are exactly the untested parts:
`isScorable`, `planExam`/`buildExam` (blueprint-must-match-paper),
`isCorrectSelection`, and the wall-clock timer. There is no test, no CI, no
`node --test`. A regression here would not crash — it would just start
reporting a wrong score to your students.

**3. The extractor workspace has no dependency declaration.**
`extract_questions_json.py` imports `fitz` (PyMuPDF) at line 59, and there is no
`requirements.txt`, no `pyproject.toml`, no `tests/`, no CI. On a fresh machine
the rebuild fails with a bare `ModuleNotFoundError`, and the 78 KB extractor
— which took real work to get right — has no safety net.

**4. All the data for a weak-area report exists; the report does not.**
Practice state persists to `localStorage` (`persistPractice` /
`restorePractice`), and every question carries `topic_index` and `category` with
the official exam weight (`20–25%` etc.). The app shows a session accuracy
number but never aggregates: no "you are weakest in Automation (28 questions,
15–20% weight)", no "questions you got wrong" queue, no weight-aware study
plan. For an exam-prep product this is the missing half.

**5. The Topic 4 gap is documented but not surfaced.**
`metadata.case_studies_without_body: [4]` exists in the bank, and the schema
doc says to *"flag them in the UI rather than showing an empty scenario panel"*.
The app does hide the panel (`renderScenario`, `assets/app.js:731`) but never
tells the candidate why. Questions 34–36 reference "Contoso Ltd Clothing Store"
requirements that are simply not on screen.

---

## Rocks — what could hurt later

**1. Provenance exposure.** The bank is a DumpsMate dump, republished as a
public GitHub Pages site with 34.6 MB of extracted content. The README
disclaims it is "a study aid, not an official Microsoft product" and links to
Microsoft Learn — that is good practice and the right posture, but a disclaimer
is not a licence. Anyone on the open internet can reach and copy it. Worth a
conscious decision before pointing students at it, particularly if this becomes
part of paid or client-facing training.

**2. The outline is a snapshot.** The category weights and descriptions were
derived from `Exam-Outline.xml` at extraction time. Microsoft revises these.
There is no check that the outline is still current, and no signal in the UI
that the blueprint could be stale. Re-extraction is manual and undiscoverable
from the app.

**3. Bus factor of one.** No issues, no roadmap, no changelog beyond the commit
log, no "report a broken question" path. Every candidate improvement currently
depends on you noticing it.

**4. The navigator builds 422 DOM buttons.** Fine on desktop; on a mid-range
phone it is 422 live buttons, every re-render. It works today, but it is the
first thing that will hurt as the bank grows.

---

## Island — where this should be heading

A DP-300 student opens the site, sits the exam, gets a topic/category
breakdown — and then the app **tells them what to study next**, weighted by the
official exam weighting, based on what they actually got wrong. Everything
needed for that already exists in the data.

---

## Action items

| Priority | Action Item | Owner | Deadline | Success Metric |
| --- | --- | --- | --- | --- |
| 1 | **Close the silent-feedback gap.** (a) Add a `renderQuestionNote` branch for "no answer key published" so all 26 MCQs explain themselves. (b) Give `checkPracticeQuestion` an explicit ungradable path that sets a neutral feedback ("This question has no published answer key — it can't be scored") and locks the selection. (c) Hide or visibly mark the 10 zero-option questions (`options.length === 0`) so they stop rendering an empty option list. | Mavis (code) | 2026-11-05 | All 26 previously-silent MCQs show either a verdict or an explicit "cannot be scored" note. Zero questions render an empty option list. |
| 2 | **Make the build reproducible and the app testable.** Add `requirements.txt` pinning PyMuPDF to the source workspace; add a `tests/` folder with a small `pytest` suite over the extractor's integrity rules (scenario ref integrity, image path resolution, category totals) and a `node --test` suite over `isScorable`, `isCorrectSelection` and the plan/paper consistency invariant. Wire both into CI on the app repo. | Mavis (code) | 2026-11-12 | A clean clone can rebuild the bank with one documented command. `planExam()` output is asserted to equal the paper actually served. |
| 3 | **Ship the weak-area report.** Aggregate persisted practice results by exam category, weighted by the official weight, and surface: weakest domain, wrong-answer queue, and a one-click "study my weakest area" drill. Pure client-side, no telemetry, no server. | Mavis (code) | 2026-11-19 | After one practice session the results panel names the candidate's weakest weighted domain and offers a drill that starts on it. |

**Two smaller items, folded into Action 1 and 2 rather than listed separately:**
surface `case_studies_without_body` as an inline note on Topic 4 questions; and
replace the 422-button navigator grid with a virtualised or windowed list.

---

## Carry-over

No previous retro on record — this is the first. Recommend a repeat after the
Action 1–3 cycle, at which point the question to bring is not "is the code
good?" but "does a student actually improve their score using it?"

---

## Notes on method

Figures above were produced by independent audit scripts run against
`questions.json`, not copied from the app's own reporting — and the app's
reporting was checked against them. The live site was loaded in a real browser:
0 console errors, 0 warnings, full bank rendered, filters and navigator
functional. The dead-end analysis replicates `renderQuestionNote()` and
`checkPracticeQuestion()` branch-for-branch from `assets/app.js`.
