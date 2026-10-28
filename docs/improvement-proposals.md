# DP-300 Exam Prep — Improvement Proposals

**Date:** 23 October 2026
**Companion to:** `project-retro-2026-10-22.md`
**Evidence base:** source + schema read, live-site browser testing (desktop 1456×732 and mobile 390×844),
independent audit of all 422 questions, and direct inspection of the extracted diagram images.

---

## The headline

**The app is well built, but 69 of its 422 questions (16%) were dead ends** — a question stem,
a static diagram, no answer, no explanation, and a Microsoft Learn link the student can never click.

And that is fixable. **The source PDF publishes the answers for all 130 hotspot questions as
filled-in diagrams** — the same picture twice, once blank and once with the correct selections
marked in green. The extractor cannot parse a diagram, so it currently discards both the answer
*and* the option text. A transcription pass turns them back into real questions.

This single content project took the gradable bank from 243 (57.6%) to as many as 373 (88.4%).
**It is now at 400 (94.8%)**: 400 of the 422 questions carry a published key, and the only
22 that do not are the Topic 5 lab walk-throughs, which have no answer to mark.

---

## What "dead end" actually means in the product

| Class | Count | What the student gets today |
| --- | --- | --- |
| **A** — verdict + reasoning | 219 (52%) | Full learning loop. This is the product working. |
| **B** — verdict, no reasoning | 24 (6%) | "Wrong answer." then silence. Knows *that*, not *why*. |
| **C** — walk-through, no verdict | 23 (5%) | Lab tasks. Step-by-step solution. Fine as designed. |
| **D** — nothing at all | **22 (5%)** | **Question stem + diagram. No answer. No explanation. No reachable link.** |

Class D = the 22 lab tasks. Every question that has an answer to mark now has one.

---

## P0 — Unblock learning (the high-value work)

> **Status (26 October 2026): P0 is done.**
> The code half was shipped earlier; the content half is now complete. Every
> question that has an answer to mark carries a published key: **400 of the
> 422 questions are gradable**, and the only 22 that are not are the Topic 5
> lab walk-throughs, which have nothing to mark. All 26 of the picture-only
> *option* questions are open too.
>
> - **0.3, 0.4, 0.5, 0.6 — shipped.** 52 Microsoft Learn references that were
>   unreachable are now reachable, the 36 questions whose options live only in
>   a diagram no longer render four empty buttons, the three Topic 4
>   questions say why their case study is missing, and an attempt on a
>   question with no published key now records the attempt and locks the
>   selection instead of silently doing nothing.
> - **0.1 — every picture-only answer now has a published key.**
>   The authored document holds **157 keys**: **42 drag** questions (a list of
>   actions and an answer area - the key is the actions the answer area holds,
>   in order), **97 drop-down** questions (one choice per statement),
>   **17 Yes/No** questions (one answer per statement) and **1 choice**
>   question. The drop-down and Yes/No keys are re-derived mechanically from
>   the marked row of the published diagram; the drag keys and the 27
>   drop-down questions whose drop-down sits inside a template or a command
>   are read by eye, because the text in those diagrams is about a dozen
>   pixels tall and no OCR engine reads it reliably. Each of those was
>   confirmed against a second copy of the answer area - the one the
>   explanation prints, with the drop-downs already set.
>   `validate_authored.py` checks every one of the 157 against the source
>   images and reports **157 of 157 passing, 0 withholding problems**.
> - **The tools find the diagrams.** `tools/recover_drag.py` finds the blank
>   diagram and the published answer of every drag question - the dump prints
>   the answer copy on the same page or the page after the blank one - and
>   `tools/drag_view.py` writes a clean, enlarged picture of each answer area so
>   that it can be read by eye.
> - **The authored answers are a source document, not a runtime overlay.** The
>   hand-written keys live in `../DP-300 Exam/authored_answers.yaml`, next to
>   the PDF, and `extract_questions_json.py` merges them into `questions.json`
>   during the extraction. The app fetches one file and has no overlay
>   machinery at all; the source document is the pipeline's second input.
> - **The per-statement UI exists.** The drop-down shape and the Yes/No shape
>   are not flat lists of choices - each statement carries its own option list
>   and its own answer - so they have their own question type in the bank and
>   their own rendering in the app: one row per statement, one option list per
>   row, and a grade of "N of M statements are correct". Questions 23 (a
>   drop-down pair) and 19, 146, 226 and 292 (Yes/No grids) are published this
>   way.
> - **Ordered questions are now graded on the order.** Ten of the published
>   drag keys are sequences - the question says "arrange them in the correct
>   order", and the answer area shows the actions stacked in that order. The
>   app grades the sequence the student picked, shows a "Step 2 of 3" badge on
>   each option and a "Your order: A → C → B" line while they choose, and says
>   "Wrong order" when the set is right but the sequence is not. Grading those
>   as a set would have taught the student that the order does not matter,
>   which is the trap the question tests. The two questions that say "more than
>   one order of answer choices is correct" are published without the ordered
>   flag, because there any order of the right set is accepted.
> - **The published answer diagram is no longer shown.** The dump prints each
>   diagram question twice - the blank material and the answered copy - and
>   the app used to render both, so the answer was visible on every one of
>   those questions. It prints a third copy too: the answer sheet, a crop of
>   the answer area with the chosen values already in the boxes. That copy
>   carries no marking at all, so a scan for green or blue dashes cannot find
>   it - it was still on screen. The authored document now carries the
>   withholding map, which is derived from the layout of the PDF: a picture
>   printed below the "Answer:" heading of its question is a copy of the
>   answer. It hides the answered copy and the answer sheet on **186
>   questions**. `tools/audit_leaks.py` re-derives that from the PDF and
>   reports **0 answer images still on screen and 0 pairs of the blank and
>   the marked copy both visible**. Three pictures are deliberately kept: they
>   are the only picture their question has, and they are exhibits printed
>   inside the explanation rather than copies of the answer (question 32's
>   tumbling-window query, question 166's PolyBase table, question 264's
>   audit-log table).
> - **The authoring note no longer shows the answer.** Each authored entry
>   carries a note recording how the key was read off the published diagram,
>   and those notes name the answer. The app used to print that note with the
>   question, which handed the answer to every student who opened one of the
>   157 reconstructed questions. The note now appears in the explanation, and
>   only once the question has been answered.
> - **Images are attached to the question they belong to.** The dump prints a
>   question's diagrams inside that question's own section, and it often
>   prints the answer diagram at the top of the *following* page. The
>   extractor used to attach every image on a page to the last question on
>   that page, which moved a carried-over answer diagram onto the next
>   question: a plain multiple-choice question ended up showing the previous
>   question's answer. Every image is now resolved by its position against the
>   question headers. **228 questions** were affected, and the fix is what
>   makes the withholding map and the recovered keys line up with the
>   diagrams.
>
> **Why the rest was not automated.** The extractor
> (`tools/author_hotspot_answers.py`) reads the answer diagrams with OCR and
> recovered the "drag N actions into the answer area" shape reliably, but it
> could not be trusted for the rest:
>
> - OCR of the marked region picks up the selection handles and arrow
>   symbols, and two adjacent boxes sometimes read as one option.
>
> Every one of those failures was caught by the checks rather than shipped:
> an answer key that mis-reads the diagram would mark the right answer
> wrong, which is worse than not marking the question at all. The extractor
> therefore writes `research/answers.candidate.json` and refuses to publish
> anything it cannot read as text; only hand-confirmed keys go into
> `authored_answers.yaml`.
>
> **The OCR backend is now the Windows OCR engine** (`Windows.Media.Ocr`,
> driven by `tools/ocr_windows.ps1`) instead of Tesseract, at the instructor's
> suggestion. It reads these diagrams markedly better: it ignores the arrow
> symbols and selection handles that Tesseract turned into stray letters
> ("Create contained database users C) So)"), it keeps the "Actions" and
> "Answer Area" headings apart, and it reports a bounding box for every word.
> Swapping the backend took the automatic yield from 2 recovered keys to 12.
>
> **The drop-down and Yes/No shapes are now recovered by geometry.**
> `tools/recover_slots.py` finds the dashed green rectangle the dump draws
> around a chosen option or radio button, reads the statement and the option
> list from the geometry around it, and writes a *draft* the human then
> checks against the diagram. The Yes/No shape comes out cleanly; the
> drop-down shape is more varied and still needs a human pass over the
> remainder.

### 0.1 Transcribe the 130 hotspot questions into real questions ⭐ biggest lever

**What the source actually contains.** For every hotspot question the dump publishes:

1. the **blank** diagram — an "Actions" column with legible draggable items and an "Answer Area";
2. the **filled** diagram — the same picture with the correct items placed, marked in green.

For "which three actions" items the fill is explicit (e.g. *Create an Azure AD administrator for the
logical server* → ∧, *Create contained database users* → ∨, *Connect to the databases by using an
Azure AD account* → ⟨). For "select the appropriate option" items the fill is a dropdown with the
correct choice outlined.

**The four recoverable shapes** (measured across all 130):

| Shape | Count | Reduces to |
| --- | --- | --- |
| "Select the appropriate option(s)" | 83 | Multi-select over dropdown choices |
| "Which THREE actions" | 19 | 3-of-N multi-select |
| "Arrange them in the correct order" | 14 | Sortable sequence |
| "Yes/No statements" | 10 | Per-statement Yes/No grid |
| Drag-to-answer-area variants | 4 | Same as "which N actions" |

**How to do it.** One authored document next to the PDF, keyed by question id, holding the
option labels and the correct set. The pipeline merges it into `questions.json` as it extracts,
so the app reads one file and never fetches an overlay.
The text is legible in the images, so this is a transcription task, not a research task — and it is
the kind of task where the instructor's own answers are better than any automated guess.

**Effect:** 156 questions move from class D to class A/B. Gradable: 243 → 400.
**So far:** all 156 are published, so gradable is **243 → 400** today and
class D is down from 156 to **22** - the 22 lab walk-throughs, which have no
answer to mark.
**Effort:** L for the transcription itself (156 × ~5 min), M for the app-side renderer.
**Risk:** none to the existing bank — the authored document is a second input to
the pipeline, and the app must degrade to today's behaviour when the file is absent.

### 0.2 Author keys for the 26 MCQs with no answer key ⭐

**Correction after reading the bank:** these 26 are not multiple-choice
questions at all. Every one of them is a *"use the drop-down menus to select
the answer choice that completes each statement"* question that the extractor
mis-classified as `single_choice` / `multi_select` — their option labels
(A–D) were captured but the option text lives in the attached diagram. Ten of
them have no options at all. So P0.2 is not a separate piece of work: it is
the same diagram-answer problem as 0.1, and it is covered by the worksheet.

**Status: 26 of 26 done.** All 26 carry a published key, read off the
published answer diagram and confirmed against the copy the explanation
prints. They are counted in the 157 authored keys above.

### 0.3 Surface references unconditionally ⭐ three-line fix

`renderExplanation()` (`assets/app.js:868-875`) only enables the explanation panel when the
question is a simulation or already has a practice result:

```js
const canShow =
  state.mode === 'practice'
    ? Boolean(getPracticeResult(question.id)) || question.type === 'simulation'
    : isExamReview();
```

Ungradable questions never get a practice result, so **54 questions that carry a Microsoft Learn
reference can never have that link opened.** The references are the only teaching content those
questions have.

**Fix:** let the panel open whenever `references.length` is non-zero, independent of scorable state.

**Effect:** unlocks the only learning artifact on 54 dead-end questions, today. **Effort:** S.

### 0.4 Give the 16 no-key MCQs explicit neutral feedback, and lock them

`checkPracticeQuestion()` (`assets/app.js:1244`) returns early on `!isScorable(question)`. No result
is stored, so `renderQuestion()` hits neither the success nor the error branch — the student clicks,
the option highlights, and **nothing happens**. Because no result is stored, the question never
locks either, so they can re-click forever, still learning nothing.

**Fix:** store a `graded: false` result and render an explicit neutral banner
("No answer key is published for this question, so it can't be scored.") — then lock the selection
exactly like a graded question.

### 0.5 Hide or mark the 10 zero-option questions

`renderOptions()` (`assets/app.js:809-812`) sets `optionsList.hidden = true` when
`question.options.length === 0`, which is correct for hotspot questions. But 10 MCQs also have zero
options and no key, so the student gets a stem, an image, and an empty panel with no explanation of
why. These should carry the same "no published answer" note as 0.4, and be visually distinguished.

### 0.6 Flag the missing Topic 4 scenario inline

`metadata.case_studies_without_body: [4]` exists in the bank, and the schema doc says to flag it in
the UI. The app hides the panel (`renderScenario`, `assets/app.js:731`) but never says why. Questions
34–36 reference "Contoso Ltd Clothing Store" requirements that are simply never on screen. A one-line
note — "The Contoso Ltd Clothing Store scenario is not published in this source" — removes a mystery.

---

## P1 — Fix what is actually broken (no instructor input needed)

> **Status (26 October 2026): all five items shipped.** Each was measured
> before and after on the live site.

### 1.1 🔴 Navigating to the next question does not reset the scroll — verified live bug

**Was:** there was **no scroll management anywhere in `app.js`** — zero occurrences of
`scrollTo`, `scrollIntoView` or `scrollTop`. Measured on the live site:

| Viewport | `scrollY` before Next | after Next | question title position after Next |
| --- | --- | --- | --- |
| Desktop 1456×732 | 1399 | 328 | `top: -51` — **entirely above the viewport** |
| Mobile 390×844 | 519 | **519** (unchanged) | `top: -345` — **entirely above the viewport** |

So after reading a long question to the bottom and pressing **Next**, the student landed with the
"Question N / 422" heading, the position pill and the question-kind pill all **off-screen**.

**Now:** `scrollToQuestionTop()` puts the top of the question panel back in view, and the
question heading is below the viewport's top edge after Next on both layouts:

| Viewport | `scrollY` before Next | after Next | question title position after Next |
| --- | --- | --- | --- |
| Desktop 1440×900 | 416 | 221 | `top: +55` — **in view** |
| Phone 502×732 | 552 | 13 | `top: +161` — **in view, below the sticky header** |

The scroll is deliberately **not** inside `renderQuestion()`, which also runs for a scenario
toggle or a filter change, where a jump to the top would be wrong. It is called from
`moveQuestion()` and from the navigator chip handler — the two places where the question
actually changes.

Two details the proposal did not cover: the phone layout has a **sticky header**, so the panel
is placed just below it rather than under it, and `prefers-reduced-motion` turns the smooth
scroll into an instant one.

### 1.2 The navigator rebuilds 422 buttons and 422 listeners on every navigation

**Was:** `renderNavigator()` cleared the grid and recreated a button per question, each with its
own closure and listener, on **every question change** — 422 DOM nodes plus 422 closures per
keystroke of navigation.

**Now:** the chips are built **once per visible set** and repainted on every render. The click
handler is delegated to the grid, so there is one listener instead of 422. Verified live: the
chip elements are the same nodes before and after a navigation, and the grid is rebuilt exactly
once when the filter changes (422 → 219 → 422 chips).

### 1.3 Accessibility — four concrete defects

All four are fixed.

1. **The verdict is now announced.** `#feedback-banner` carries `role="status"` and
   `aria-live="polite"`, so click an option and get the verdict is announced, not just shown.
2. **The navigator chips carry their state.** Each chip has an `aria-label` such as *"Question
   12, answered, correct"* and an `aria-current` on the question being shown. **Note:** the
   proposal suggested `aria-pressed`; the chips navigate rather than toggle, so `aria-current`
   is the correct attribute — `aria-pressed` would tell a screen reader the chip is a toggle.
3. **The mode switch no longer fakes a tab list.** It was `role="tablist"` with `role="tab"`
   and no `aria-selected`, no `aria-controls`, no `tabpanel` and no arrow-key handling. The
   roles are gone: the container is a `role="group"` and the two buttons are toggle buttons with
   `aria-pressed`, which is what they are.
4. **The selected option carries its state.** The option buttons carry `aria-pressed`, and so do
   the per-statement option buttons.

### 1.4 Timer warnings

**Now:** the clock warns at **10 minutes** and **5 minutes**, and at **1 minute** the warning
carries a **Submit now** button, so the student submits on purpose rather than letting the clock
do it. The warning sits next to the clock and is an `aria-live` region, so it is announced.

Two changes to the way it was proposed. The 1-minute warning is **a button in the warning, not
a modal dialog**: a dialog blocks the page in the middle of an exam and cannot be styled or
read by a screen reader. And the clock now **reads the deadline** instead of counting down one
second at a time, so a throttled tab — or anything else that blocks the thread — cannot hand
the student extra time.

### 1.5 Keyboard-first answering

**Now:** `A`–`D` pick an option, `E` toggles the explanation, `F` flags the question, `←`/`→`
move between questions and `Ctrl`+`←`/`→` do the same when the plain arrows are taken by a
focused control. A hint line under every question lists the shortcuts that apply to *that*
question.

One deliberate change: **only A to D pick an option.** The bank has options labelled E and
beyond (up to K on the per-statement questions), and E and F are the explanation and the flag,
so a question with an option E would otherwise have two meanings for one key. The hint names the
options that need a click, so nothing is hidden:

> Keyboard: A, B, C, D pick an option (E, F by click) · E explanation · ←/→ next question

On a per-statement question the letter goes to the **first statement that has not been answered
yet**, so the grid can be worked down without the mouse.

The keyboard shortcut for the explanation respects the same gate as the button: it cannot open an
explanation the app is not ready to show.

---

## P2 — Close the product loop

The app answers *"can I test myself?"* well. It does not answer *"what am I bad at?"* or
*"what should I study on Monday?"*. All the data needed is already in the app.

### Status (26 October 2026): all eight items shipped

Every item below is implemented and verified live. What follows is the design as it
was written, followed by what was actually built.

**2.1 Weak-area report** ⭐ — practice results already persist to `localStorage`
(`persistPractice` / `restorePractice`), and every question carries its category *with the official
exam weight*. Aggregate per category, weight by exam weight, and surface "Your weakest area:
Automation (28 questions, 15–20% of the exam)" with a one-click drill that starts there.

> **Built.** A *Progress report* panel sits under the filters. Per category it shows the bank
> size, the exam weight, the attempts and the score, and the areas are listed worst-first.
> The priority score is **the gap multiplied by the exam weight** — the outline publishes a
> range ("20–25%"), so the midpoint stands in when two areas are compared. A gap in a
> category worth a quarter of the paper outranks the same gap in one worth a fifth.
>
> The weakest area is called out with its numbers — *"Your weakest area is Secure environment:
> 29% correct on 7 graded questions (2 of 7). It is 20–25% of the exam, across 79 questions in
> the bank."* — and **Drill Secure environment** opens that area and lands on the first
> question in it that was never answered right. Every row is a button that drills into its
> own area.
>
> Two deliberate decisions: an area needs **3 graded attempts** before it is judged, and until
> then it shows the raw count (`2/5 so far`) rather than a percentage; and the report is hidden
> entirely until something has been graded, so it never opens on an empty sentence.

**2.2 Answer-state filters** — the filter bar has Topic / Category / Type / Answerable only. Add
**Unanswered only**, **Wrong only**, **Correct only**. For a practice bank the "wrong only" view is
the single most-wanted filter and it is missing.

> **Built.** An **Answer state** select with All / Unanswered only / Wrong only / Correct only.
> The counts on the control are live (`Wrong only (12)`), because the number of questions
> waiting for the student is the point of the filter. Wrong and correct only count questions
> that were actually scored: an attempt on a question with no published key is recorded as
> answered, but it was never marked right or wrong.

**2.3 Search** — search question text, option text, explanations and references. No index exists;
one pass over 1.5 MB of JSON at load is cheap.

> **Built.** `buildSearchIndex()` makes one pass at load and stores a lower-cased haystack per
> question: the stem, the option text, the statements and their options, the explanation, the
> references, and the topic and category names. Several words combine with AND, so
> `geo replication` finds the questions that mention both. Matches are highlighted in the stem,
> the options and the explanation — with DOM nodes, not `innerHTML`, so a question containing
> markup cannot inject anything. The box is debounced by 180 ms, because every keystroke would
> otherwise rebuild the 422-chip navigator.

**2.4 Per-question notes** — let the student annotate a question for the instructor ("ask about this").
Note text persists alongside the existing practice state.

> **Built.** A note box under every question in practice mode, saved as it is typed into
> `state.practice.notes` and persisted with the practice results. A question with a note gets a
> blue corner mark in the navigator, and the note is printed with the report and included in the
> CSV — which is the point of it: the note is the thing the instructor has to act on.

**2.5 Deep links** — `#q-<id>` per question, so a question can be shared in a chat, a slide, or a
mail. The `scenario_ref` pattern already exists; questions need the same treatment.

> **Built.** `#q-306`, matching the `#scenario_t1_litware` pattern already in the bank. The
> address bar follows the question on screen (`history.replaceState`, so no `hashchange`
> loop), and **Copy Link** copies the link to the question in front of you. Opening a link jumps
> to that question and **clears the filters first** — a shared link means "show me this one", so
> it outranks whatever filter the browser had remembered. A link to a question that is not in the
> bank falls back to the question that is on screen rather than breaking the page.

**2.6 Export** — export a result as a printable summary (student, score, per-category breakdown)
and add a print stylesheet. For an instructor collecting evidence of practice, this is the
difference between a toy and a deliverable.

> **Built.** A **Report** button in the header opens a dialog with the student name, the score
> and the breakdown by exam category. **Print / Save as PDF** builds a printable record — name,
> date, mode, score, category breakdown and every attempted question with the answer, the
> correct answer, the verdict and the note — and a print stylesheet makes that record the only
> thing on the page. **Download CSV** exports the same rows with the question text included.
>
> The student name is remembered, so an instructor types it once per class. In the exam
> simulator the report lists the answered questions while the exam runs, and every question in
> the paper once it has been submitted, so the ones left blank show up as gaps in the record.

**2.7 Offline support** — the app needs 1.5 MB of JSON plus 34.6 MB of images. A service worker
caching the shell and `questions.json` (with images cached lazily on view) would make it work on
hotel wifi or a plane. Exam-day reliability for a timed simulator is a real concern.

> **Built.** `sw.js`, registered by the app. Two caches on purpose: the **shell** is served
> network-first (online you always get the current build; offline you get the last one) and the
> **images** are cache-first, because the file names carry a content hash and never change. The
> images are cached as they are viewed — 34.6 MB is never preloaded. The Pages workflow stamps
> the commit SHA into `sw.js` as well as `index.html`, so a deploy drops the previous shell
> cache instead of serving it. The footer says *Offline copy ready* once the worker is running.
>
> **Verified**: with the browser set to offline, a reload still loads all 422 questions, the
> diagram on screen and the options, from the cache.

**2.8 Dark mode** — `prefers-reduced-motion` is handled (`styles.css:990`) but `prefers-color-scheme`
is not. Night-time study is a large share of exam-prep sessions.

> **Built.** The theme control in the header cycles **Auto → Light → Dark**; *Auto* follows
> `prefers-color-scheme` and updates while the page is open.
>
> The work was the stylesheet, not the switch. Every colour in `styles.css` was a literal —
> about sixty `rgba()` tints across the sheet — so a dark theme would have meant a second
> stylesheet. Instead every colour is now composed from a set of tokens: the `-rgb` triplets are
> consumed as `rgb(var(--token-rgb) / <alpha>)`, which keeps every tint in the sheet
> expressible while letting the dark theme re-tint it. The dark palette is then a single
> `:root[data-theme='dark']` block.
>
> An inline script in the head of the page sets the theme before the first paint, so a student
> on a dark desktop never gets a white flash.

---

## P3 — Foundations and consistency

### Status (26 October 2026): all four items shipped

**3.1 `requirements.txt`** — `extract_questions_json.py` imports `fitz` (PyMuPDF) at line 59 with
no declared dependency. A clean-machine rebuild fails with a bare `ModuleNotFoundError`.

> **Built.** Two files in the source workspace, next to the extractor:
>
> - `requirements.txt` — the rebuild path: **PyMuPDF** (the `fitz` module) and **PyYAML** (the
>   authored answer keys). `pip install -r requirements.txt` is enough to extract, validate and
>   build the bank.
> - `requirements-ocr.txt` — the optional authoring toolkit: Pillow, numpy, opencv-python and
>   pytesseract. The rebuild path does not import any of them, so a machine that only rebuilds the
>   bank does not need them. pytesseract also needs the Tesseract *binary*, which is not a pip
>   package; the file says so.
>
> Every third-party import in the workspace was enumerated with `ast` and the two files cover all
> seven: `fitz`/`pymupdf`, `yaml`, `PIL`, `numpy`, `cv2`, `pytesseract`.
>
> This was not theoretical. The `python` first on `PATH` on this machine is a clean 3.15
> installation with **no** `fitz`, so `python extract_questions_json.py` fails with exactly the
> `ModuleNotFoundError` the item describes; the extractor only ever ran under the Anaconda
> interpreter. The PyMuPDF pin is `<2.0` on purpose: the scripts import `fitz`, which PyMuPDF
> still provides but already warns is deprecated in favour of `pymupdf`.

**3.2 Tests** — 1,547 lines of exam logic with zero automated tests. The parts that would *silently*
mislead a student are the untested ones: `isScorable`, `isCorrectSelection`, and the
blueprint-must-match-the-paper invariant in `planExam` / `buildExam`. A regression there would not
crash — it would just start reporting the wrong score.

> **Built.** `tests/` — 31 tests, no dependencies, run with `node --test "tests/*.test.js"`.
>
> The app is a plain browser script with no build step, so the tests load the **shipped**
> `assets/app.js` into a `vm` context and give it just enough of a browser (`tests/dom-stub.js`).
> Testing the real file rather than a copy is the point: a regression in the app has to fail the
> test, and a refactor that leaves the behaviour alone must not.
>
> Covered:
>
> - **`isScorable`** — a question with a key and visible option text; a question with no key;
>   options published only as a picture; a per-statement question missing one statement's answer;
>   and the bank invariant: **400 of 422** scorable, the other **22** being the lab tasks.
> - **`isCorrectSelection`** — the published key grades as correct for **every** scorable
>   question, and a different selection grades as wrong for every one; an empty selection; a
>   question with no key; an ordered key that rejects the right options in the wrong order; an
>   unordered key that does not care; a repeated label that cannot stand in for a missing one;
>   and a per-statement question that needs every statement right.
> - **The blueprint must describe the paper** — for 64 combinations of the blueprint settings, the
>   paper holds the number of questions asked for, holds no question twice, is made of the lab
>   tasks and Topic 6 filler it claims, and the plan's own numbers add up to the paper.
> - **The bank that is deployed** (`tests/bank.test.js`) — the metadata matches the questions, the
>   ids are unique, every question has the fields the app relies on, and **every one of the 246
>   referenced images is on disk**.
>
> **The tests found a real defect, and it was fixed.** The blueprint lied whenever the case
> studies took more of the paper than it had room for: asking for 10 questions with 2 case studies
> and 10 lab tasks produced a blueprint reading *"Litware + Contoso (27 q) + 10 lab tasks"* for a
> 10-question paper that held 10 questions from one case study and no lab tasks at all. The
> numbers did not even add up to the question count. `planExam` now takes case studies **whole**
> and only as many as fit, and caps the lab tasks to the room the case studies leave behind — so
> the preview is the paper. The default 60-question paper is unchanged.

**3.3 CI** — neither folder has any. The app repo has a Pages workflow; a test job belongs beside it.

> **Built.** A `test` job in `.github/workflows/pages.yml`, and the deploy now `needs: test`, so a
> broken build never reaches students. The job checks out the repo, sets up Node and runs
> `node --test "tests/*.test.js"`. The bank checks in `tests/bank.test.js` double as a check on the
> artifact that is about to be published.

**3.4 Copy consistency** — `index.html:40` says "Practise" while the entire rest of the product says
"Practice". Pick one for a Microsoft-branded deliverable.

> **Built.** "Practice" everywhere, and the rest of the British spellings went with it: the
> navigator caption that told students their questions "stay colour-coded" now says "color-coded",
> and the code comments follow. Both spellings were checked across `index.html`, `assets/app.js`,
> `assets/styles.css` and `sw.js`.

---

## Also worth knowing

**Every one of the 573 diagrams carries a "DumpsMate.com" watermark.** It is visible to every
student on every image — in the middle of the question, not in a corner. If this goes in front of
a client or a class, that is the detail people will notice first. It is a further argument for
redrawing the hotspot questions as real UI (0.1) rather than continuing to ship the vendor's
watermarked PNGs.

**Provenance and exposure.** The content is a third-party dump republished at a public URL. The
README's disclaimer and Microsoft Learn links are the right posture, but a disclaimer is not a
licence. Worth a deliberate decision before this is pointed at students — and especially before it
becomes part of paid or client-facing training.

---

## Recommended build order

| Order | Item | Why here |
| --- | --- | --- |
| 1 | **1.1 scroll reset** | Smallest change, most visible defect. A student hits it on the first question they navigate. |
| 2 | **0.3 references always** | Three lines; 54 dead questions gain their only learning content. |
| 3 | **0.4 / 0.5 neutral feedback + lock** | Removes 26 silent dead-ends. Same mechanism. |
| 4 | **2.2 answer-state filters** | Highest-value study feature, small UI addition. |
| 5 | **1.3 accessibility** | Verdict announcement and chip labels; four contained fixes. |
| 6 | **2.1 weak-area report** | The feature that turns a practice bank into a study tool. |
| 7 | **0.1 + 0.2 transcription project** | The big content unlock. Start it early because it is human-hours, not code-hours — then keep shipping code while it is in progress. |
| 8 | **1.2 / 3.1 / 3.2 / 3.3** | Performance and foundations. Low urgency, low risk. |

Items 1–6 are contained code changes with no dependency on the transcription project and can be
shipped while 0.1 is in progress.
