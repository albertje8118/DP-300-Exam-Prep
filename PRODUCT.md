# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Primary: DP-300 certification candidates — Azure database administrators and
  engineers preparing for "Administering Microsoft Azure SQL Solutions" (the
  exam's current official name; formerly "Administering Relational Databases
  on Microsoft Azure").
- Instructor: a Microsoft trainer who runs this app in live classes. Students
  answer in class; the instructor prints per-student practice reports (student
  name field, attendance-sheet workflow).
- Confirmed 2026-11-17: the app serves both solo timed practice and classroom
  projection.

## Product Purpose

A free, self-contained exam simulator and practice bank for DP-300: 422
questions with instant-feedback practice and a timed exam simulator that mirrors
the real exam's shape. Success means students walk into the real exam familiar
with its format and confident in the material.

## Positioning

Confirmed 2026-11-17: the simulator's job is to **rehearse the real Pearson VUE
Microsoft exam experience** — layout, chrome, and mechanics faithful to exam
day. The user chose fidelity over an original visual idea; the real exam
interface is the binding reference, not an anti-reference.

## Operating Context

- Static site on GitHub Pages (albertje8118/DP-300-Exam-Prep, publishes from
  `main`); also runs offline via a service worker.
- Classroom use: projected on a big screen; printable / CSV practice reports
  with a student name.
- The content workshop repo "DP-300 Exam" holds the dump extraction, reviews,
  and build tooling; the app repo is the single source of truth for the shipped
  app.

## Capabilities and Constraints

- Practice mode: full bank, filters (topic / category / type / answer state /
  search), instant feedback, explanations with Microsoft Learn references,
  per-question notes, progress report.
- Exam simulator: blueprint (1–2 case studies with every question, lab tasks,
  question count 10–120, duration 15–240 min), countdown, flag for review,
  navigator, submit-and-review results.
- Question types: single/multi-select, statement (yes/no per row),
  drag-drop/build-list, hot-area, case studies, lab tasks. 136 questions have no
  flat option list; 22 are lab tasks.
- Hard guardrails (user, 2026-11-17): no gamification (points, streaks, badges,
  hype); no heavy motion or flashy effects; real-exam mechanics must survive
  (case studies first, flagging, navigator, countdown, submit-and-review);
  readable on a classroom projector.
- Technical: vanilla HTML/CSS/JS, no framework. Element IDs and behavior are a
  test contract — 68 node tests press real buttons through a browser-faithful
  DOM stub. AA contrast, keyboard-first flow, localStorage persistence,
  LF-normalized git blobs.
- Redesign scope (user, 2026-11-17): whole app — Practice and Exam Simulator
  share the new visual world. Work happens on the `dev` branch for preview
  before any merge to `main`.

## Brand Commitments

- Name: "DP-300 Exam Prep". No logo asset beyond an inline SVG favicon (D3 mark).
- The real Pearson VUE Microsoft exam interface is the user-pinned visual
  reference for the redesign (2026-11-17). Execute at full fidelity, without
  irony or smuggled quirk.

## Evidence on Hand

- `questions.json`: 422 questions, 246 images (`extracted_images/`), 12 reviews
  applied, 1 key correction (bank promotion, commit bb836e6).
- Microsoft Learn references embedded per question.
- Prior impeccable critique snapshot (22/40) archived at
  `.impeccable/critique/2026-11-14T11-50-31Z__index-html.md` (gitignored).
- No official Pearson VUE screenshot assets in-repo; fidelity must be grounded
  in Microsoft's published exam-experience documentation and demo, not invented.

## Product Principles

1. Exam-day familiarity beats novelty: every chrome decision answers "does this
   match the real exam?"
2. The question is the hero: nothing competes with question text and options
   for attention.
3. Classroom-legible: contrast and type size hold up on a projector.
4. Calm, professional, zero hype: no gamification, no decorative motion.
5. Mechanics are sacred: case studies first, flagging, navigator, countdown,
   submit-and-review always survive.

## Accessibility & Inclusion

- AA contrast (established in the prior design pass and held by tests).
- Keyboard-first: graded options stay focusable (`aria-disabled`, not
  `disabled`); focus restore keyed on row index for statement questions.
- Screen-reader reachable verdicts (`role="status"`, `aria-live`).
