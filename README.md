# DP-300 Exam Prep

A browser-based practice bank and exam simulator for **Microsoft DP-300 —
Administering Relational Databases on Microsoft Azure**.

The question bank is extracted from the source PDF and shipped as static
JSON, so the whole app runs in the browser with no server, no build step
and no dependencies.

## What is in here

```
index.html                       the app shell
assets/styles.css                design system
assets/app.js                    application logic
questions.json                   the extracted question bank
extracted_images/                570 images referenced by the bank
```

`questions.json` has three top-level collections:

| Collection   | Purpose |
| ------------ | ------- |
| `metadata`   | Topic and exam-category enumerations, counts and verification tables |
| `scenarios`  | The three case studies, stored **once** each and split into sections |
| `questions`  | The 422-question bank |

Questions in a case study do not repeat the narrative. Each one carries a
`scenario_id` and a hyperlink-ready `scenario_ref`:

```json
"scenario_id": "scenario_t1_litware",
"scenario_ref": {
  "id": "scenario_t1_litware",
  "href": "#scenario_t1_litware",
  "title": "Litware",
  "topic_index": 1
}
```

## Modes

### Practice

Filter the whole bank by **topic**, **exam category** and **question type**,
or tick *Answerable only* to hide diagram questions. Single-answer questions
are scored the moment you click; multi-answer questions need **Check
Answer**. The explanation and the source references are one click away, and
the navigator grid keeps every question you have reviewed colour-coded.

### Exam Simulator

60 questions in 120 minutes, built to mirror the real paper:

1. **1–2 random case studies**, taking *every* question in each one.
2. **Lab tasks** from Topic 5.
3. The remainder from **Topic 6**.

The blueprint panel shows the exact composition before you start, and the
plan previewed there is the paper you get. Answers stay hidden until you
submit or the timer expires; flagged questions are marked in the navigator.
On submission you get a score, a breakdown by topic and by exam category, and
a full question-by-question review.

## Grading

Only questions that have both a published answer key *and* visible option
text can be scored. In this source that is **243 of 422** questions. The
other 179 are diagram questions (the answer is a hotspot inside a picture)
and lab tasks (the answer is a walk-through, not a multiple-choice key).

The app never pretends otherwise: the results screen reports the score over
the graded questions and states how many could not be scored, and ungraded
questions are marked as such in the navigator.

## The navigator panel

The question/exam navigator on the right can be collapsed with the chevron
button in its header. On a desktop screen it folds into a slim vertical rail
that still shows the word *Navigator*, so the question pane gets the full
width. Below 1080px the layout is a single column and the toggle only folds
the question grid away, keeping the panel heading visible.

The choice is remembered in `localStorage` under `dp300.ui.v1` and is restored
before the first paint, so a reload never flashes the expanded layout.
Submitting an exam re-opens the panel automatically, because that is where
the score appears.

## Mobile layout

Below 820px the exam simulator becomes a thumb-first single column:

- **Sticky header** – the wordmark, the mode switch, the live timer and the
  action button stay on screen while the question scrolls under them.
- **Fixed action bar** – *Previous* and *Next* are pinned to the bottom of
  the viewport, so a question can be navigated without scrolling back up.
  The secondary actions (Clear, Flag, Check answer, Explanation) sit in a
  scrollable row just above it.
- **Navigator as a bottom sheet** – the ☰ button slides the question grid up
  from the bottom over a dimmed page. Tapping a number jumps to that question
  and dismisses the sheet; ✕, the backdrop and `Esc` close it.
- **Compact blueprint** – the four simulator settings collapse into
  label-on-the-left, control-on-the-right rows.

Landscape phones (short viewports) keep the two-column layout but get a
one-row header so it does not eat the screen.

The timer moved from the question toolbar into the header, which keeps it
visible on every screen size while an exam is running.

## Running locally

Any static file server works — the app only needs `questions.json` to be
fetchable over HTTP.

```bash
python -m http.server 8765
# then open http://127.0.0.1:8765/
```

Opening `index.html` directly with `file://` will not work, because the
browser blocks `fetch()` on the local file system.

## Deploying to GitHub Pages

The repository is set up for the **GitHub Actions** Pages workflow
(`.github/workflows/pages.yml`). Push to `main` and the site is published
from the repository root at:

```
https://albertje8118.github.io/DP-300-Exam-Prep/
```

To enable it on GitHub: **Settings → Pages → Build and deployment → Source
→ GitHub Actions**.

The `.nojekyll` file stops GitHub Pages from running Jekyll over the
folder, which would otherwise ignore the underscore-prefixed paths.

## Regenerating the bank

The extractor lives outside this repository, in the source workspace:

```bash
cd "../DP-300 Exam"
python extract_questions_json.py   # rebuild questions.json + images
python build_site.py               # copy the bank into this folder
```

`build_site.py` verifies that every image path in `questions.json` resolves
on disk and removes files that nothing references.

## Provenance

The bank was extracted from a DumpsMate DP-300 dump. It is a study aid, not
an official Microsoft product. Microsoft Learn remains the source of truth:
<https://learn.microsoft.com/credentials/certifications/exams/dp-300>
