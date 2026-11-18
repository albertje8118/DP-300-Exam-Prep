---
name: DP-300 Exam Prep
description: The exam room, rebuilt — a faithful rehearsal of the Pearson VUE Microsoft certification exam interface.
colors:
  exam-navy: "#2a4464"
  exam-navy-dark: "#75b6e7"
  window-white: "#ffffff"
  window-dark: "#202020"
  ink: "#323130"
  ink-dark: "#ffffff"
  on-navy: "#ffffff"
  on-navy-dark: "#091f2c"
  tool-rail: "#f4f3f5"
  tool-rail-dark: "#404040"
  cs-gray: "#5a5a5a"
  cs-gray-dark: "#d2d2d2"
  base-gray: "#a2a2a2"
  track-gray: "#b3b3b3"
  paper-border: "#d4d4d4"
  paper-border-dark: "#505050"
  form-gray: "#f5f5f5"
  form-hover: "#e8e8e8"
  focus-blue: "#5f91ec"
  marker-border: "#919191"
  question-header: "#121212"
  preexam-bg: "#f3f2f1"
  success: "#107c10"
  success-bg: "#dff6dd"
  success-text: "#0e6b0e"
  success-dark: "#6ccb5f"
  error: "#a4262c"
  error-bg: "#fde7e9"
  error-text: "#8e1f26"
  error-dark: "#f1707b"
  warning: "#9a5b13"
  warning-bg: "#fff4ce"
  warning-border: "#d9a441"
  warning-dark: "#e0a85c"
typography:
  headline:
    fontFamily: "Segoe UI, Segoe UI Web (West European), -apple-system, BlinkMacSystemFont, Roboto, Helvetica Neue, sans-serif"
    fontSize: "1.3rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0em"
  title:
    fontFamily: "Segoe UI, sans-serif"
    fontSize: "1.15rem"
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: "Segoe UI, Segoe UI Web (West European), -apple-system, BlinkMacSystemFont, Roboto, Helvetica Neue, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "0.03em"
  label:
    fontFamily: "Segoe UI, sans-serif"
    fontSize: "0.7rem"
    fontWeight: 600
    letterSpacing: "0.06em"
  clock:
    fontFamily: "Segoe UI, sans-serif"
    fontSize: "1.6rem"
    fontWeight: 400
    lineHeight: 1
    fontFeature: "tabular-nums"
rounded:
  none: "0"
  chip: "2px"
  bar: "999px"
  marker: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  section: "32px"
components:
  button-primary:
    backgroundColor: "{colors.exam-navy}"
    textColor: "{colors.on-navy}"
    rounded: "{rounded.none}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.window-white}"
    textColor: "{colors.exam-navy}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.exam-navy}"
    rounded: "{rounded.none}"
    padding: "10px 16px"
  button-ghost-hover:
    backgroundColor: "{colors.tool-rail}"
    textColor: "{colors.exam-navy}"
  nav-chip:
    backgroundColor: "{colors.window-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.chip}"
    padding: "9px 0"
  field-select:
    backgroundColor: "{colors.window-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "8px 10px"
  summary-bar:
    backgroundColor: "{colors.track-gray}"
    rounded: "{rounded.bar}"
    height: "8px"
  feedback-success:
    backgroundColor: "{colors.success-bg}"
    textColor: "{colors.success-text}"
    rounded: "{rounded.none}"
    padding: "14px 16px"
  feedback-error:
    backgroundColor: "{colors.error-bg}"
    textColor: "{colors.error-text}"
    rounded: "{rounded.none}"
    padding: "14px 16px"
---

# Design System: DP-300 Exam Prep

## Overview

**Creative North Star: "The Exam Room, Rebuilt"**

This app is not a study dashboard that happens to contain questions. It is the
Pearson VUE Microsoft certification exam room, reconstructed at full fidelity so
that exam day holds no visual surprises. Every chrome decision answers one
question: does this match the real exam? The palette, the square corners, the
Segoe UI voice, the lettered option rows, the gray navigator rail and the navy
countdown are transcribed from Microsoft's official exam sandbox
(`Microsoft_ReplacementUI_v7`), not invented around it.

The room is calm by doctrine. One accent — exam navy — carries every primary
action and every progress fill; state colors appear only where they carry
meaning (a verdict, a flag, a low-time warning). Motion is a single authored
moment: the header's status bars easing as answers land. Nothing else moves
unless the student moves it. The question is the hero; the chrome is the
instrument cluster around it, and it stays put while the paper scrolls.

The system serves two scenes at once: a candidate drilling alone at a laptop,
and an instructor projecting the app in a classroom. Contrast and type size
hold up on a projector; functional text never drops below 11.2px. Dark theme is
a token swap on the same selectors — the exam's own dark values — never a
second stylesheet.

**Key Characteristics:**
- Sandbox-exact palette: white window, `#323130` ink, navy `#2a4464` hotlight; dark `#202020` window, `#75b6e7` hotlight.
- Square corners everywhere except the exam's own pill status bars, 2px navigator chips, and round radio markers.
- One accent, one motion moment, zero gamification.
- Header in thirds: identity left, status figures with progress bars center, commands and the running-only countdown right.
- Dark theme as a pure token swap; browser-drawn surfaces (selection, caret, scrollbars, focus) themed too.

## Colors

The exam's own palette: a white window, near-black ink, and a single navy
hotlight, surrounded by a family of grays that do the structural work.

### Primary
- **Exam Navy** (`#2a4464`, dark `#75b6e7`): the hotlight. Primary button fill, active mode tab, progress-bar fill, selected markers, links, the countdown digits, focus-adjacent emphasis. In dark mode it lightens to the exam's own `#75b6e7` and button text flips to `#091f2c`.

### Neutral
- **Window White** (`#ffffff`, dark `#202020`): the page field and every paper surface.
- **Ink** (`#323130`, dark `#ffffff`): body text and option text.
- **Question Header** (`#121212`, dark `#ffffff`): headings, one step deeper than body ink.
- **Tool Rail Gray** (`#f4f3f5`, dark `#404040`): the navigator rail and ghost-button hover — the exam's toolbar tone.
- **CS Gray** (`#5a5a5a`, dark `#d2d2d2`): secondary text, micro-labels, metadata pills.
- **Base Gray** (`#a2a2a2`): chip borders, scrollbar thumb, hover borders.
- **Track Gray** (`#b3b3b3`, dark `#404040`): the status-bar track under every navy fill.
- **Paper Border** (`#d4d4d4`, dark `#505050`): every 1px structural border — paper, toolbar, action row, fields.
- **Form Gray / Form Hover** (`#f5f5f5` / `#e8e8e8`): input-adjacent fills and quiet hovers.
- **Marker Border** (`#919191`, dark `#d2d2d2`): unselected radio/checkbox strokes.
- **Focus Blue** (`#5f91ec`): the exam's focus highlight, 2px outlines only.

### State (meaning only)
- **Success** (`#107c10` on `#dff6dd`, text `#0e6b0e`; dark `#6ccb5f` at 14% tint): correct verdicts and correct chips.
- **Error** (`#a4262c` on `#fde7e9`, text `#8e1f26`; dark `#f1707b` at 14% tint): wrong verdicts, wrong chips, the ≤5-minute clock.
- **Warning** (`#9a5b13` on `#fff4ce`, border `#d9a441`; dark `#e0a85c`): the flag dot and time warnings.

### Named Rules
**The Hotlight Rule.** Navy is the only accent. It marks actions, progress, and selection — never decoration. State colors appear only on verdicts, flags, and warnings; a screen with no verdict carries no green or red.
**The Token Swap Rule.** Dark theme redefines the same custom properties on `:root[data-theme='dark']`. No selector forks on theme except the dark-mode status-bar outline (the exam's own). New components must read tokens, never hard-code a light value.

## Typography

**Display/Body Font:** Segoe UI (with the exam's own fallback stack: "Segoe UI Web (West European)", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", sans-serif)

**Character:** The system face is the promise, not a shortcut — the real exam sets Segoe UI at 16px with 0.03em tracking, and this app reproduces both exactly (0.48px at 16px). Weight steps 400/600/700 do all the hierarchy work; there is no second face.

### Hierarchy
- **Headline** (700, 1.3rem, 1.2): the exam identity in the header (`DP-300`).
- **Title** (700, 1.15rem, 1.25, balanced): the question heading; section headings 1rem.
- **Body** (400, 16px, 1.25, 0.03em): question text and options at 1rem/1.5–1.6 for reading; the paper is the measure.
- **Label** (600, 0.7rem = 11.2px, 0.06em, uppercase): status-figure labels, field labels, clock caption, table headers.
- **Clock** (400, 1.6rem, tabular-nums, line-height 1): the countdown; 700 + error color under five minutes.
- Figures and chips always set `font-variant-numeric: tabular-nums`.

### Named Rules
**The 11px Floor Rule.** Functional text — labels, captions, table headers, buttons — never renders below 0.7rem (11.2px). Decorative letterspacing does not exempt a label from legibility.
**The Question Voice Rule.** Question text and options outweigh the chrome around them: chrome labels are 0.7–0.85rem, the paper reads at 1rem+ with 1.5+ line height.

## Layout

The shell is a sticky header over a scrolling paper, with the navigator as a
right rail — the exam's own topology.

- **Header** (`.topbar`): sticky, one row at ≥1280px, in thirds — brand (order 1), mode switch (2), summary strip (3, `flex: 1 1 276px`, gap 18px, cards min-width 80px), command strip (4). Padding 14px 24px, column gap 16px. 79–80px tall in every mode.
- **Content** (`.content-shell`): grid `minmax(0,1fr) minmax(320px,400px)`, gap 24px, padding 24px 32px, max-width 1600px centered.
- **Paper** (`.question-panel`): bordered column, `min-height: calc(100vh - 200px)`; toolbar, filters/blueprint, question, verdict, sticky action row (`bottom: 0`, z20), report, explanation — in that order.
- **Navigator**: sticky rail (`top: 96px`, max-height 780px), collapsible to 62px; on phones it becomes a bottom sheet (z60, max-height 78vh, 260ms slide) over a backdrop (z55).
- **Breakpoints**: ≤820px phone (single column, fixed `.actions-primary` bottom bar z30, app-shell bottom clearance 88px, header reflows to brand+commands / mode / summary); 821–960px tighter header gap; 821–1080px single column, static navigator; 821–1360px short "New Exam" label; landscape ≤560px height compresses the header to one nowrap row.
- **Rhythm**: 4/8/12/16/24/32px steps. Tight groups (3–5px inside a status card), generous separation (18–24px between zones). More space above a heading than below it.

## Elevation & Depth

The room is flat by default. Depth is drawn with 1px borders and tonal layering
(window → form gray → tool rail), not shadows. The single shadow in the system
is the exam's own dialog drop — an offset shadow with a soft blur, used only on
the confirmation/export dialogs and the mobile sheet's top edge.

### Shadow Vocabulary
- **Exam dialog** (`box-shadow: 4px 4px 4px rgb(0 0 0 / 0.2)`, dark `rgb(0 0 0 / 0.5)`): modal dialogs only.
- **Sheet lift** (`box-shadow: 0 -8px 24px rgb(0 0 0 / 0.25)`): the mobile navigator sheet's top edge.

### Named Rules
**The Flat Room Rule.** Surfaces are flat at rest. No hover lifts, no ambient glows, no zero-offset halos. If a surface needs to read as above another, a border or a tonal step says it.

## Shapes

Square is the language. Buttons, papers, panels, fields, dialogs, feedback
banners: `border-radius: 0`. Three exceptions are the exam's own forms, not
decorations: the pill status bars (`999px`, the sandbox's `.pb-bar`), the
navigator chips (`2px`, near-square), and the round radio marker (`50%`, 20px,
2px stroke). Multi-select markers are the same 20px box with square corners and
a drawn check mask. Icons are drawn SVG/masks in one stroke weight (1.75px,
round caps); no glyph icons, no emoji.

## Components

### Buttons
- **Shape:** square (0), 1px border, padding 10px 16px (small: 6px 10px), 0.95rem, 700.
- **Primary (`.solid-button`):** navy fill, window-colored border, on-navy text, min-width 7em. Hover inverts: window fill, navy text, navy border. Submit/Confirm wear the same navy — the confirmation dialog carries the gravity, not the color.
- **Ghost (`.ghost-button`):** transparent, navy bold text; hover draws tool-rail fill + base-gray border.
- **Transitions:** 120ms ease-out on background/color/border only. Disabled: opacity 0.5, not-allowed.

### Option rows (signature)
- Grid `24px 26px minmax(0,1fr)`, gap 10px: marker, letter cell, outlined content cell.
- Marker: 20px circle (single) or square (multi), 2px marker-border stroke; selected = navy ring + 5px navy dot (single) or navy fill + drawn check (multi).
- Letter cell right-aligned with a `.` separator, as the exam sets it.
- Content cell: 1px paper-border outline; hover/focus draws 2px focus-blue. Graded: correct/wrong outline + tint on the cell, never on text contrast; options lock with `aria-disabled`, staying focusable and legible.

### Navigator chips
- 2px radius, 1px base-gray border, tabular numerals, full-width cells.
- States: current = double navy ring + 700; answered = 16% navy tint; correct/wrong = state tints; ungraded = dashed border on form gray; flag = 7px warning dot top-right; note = 7px navy dot top-left.

### Status figures + bars (signature)
- Label (0.7rem uppercase CS gray) over value (1.05rem 700 tabular) over an 8px pill bar: track-gray track, navy fill, `width` eased 240ms `cubic-bezier(0.16,1,0.3,1)` — the one authored motion moment. Dark mode adds a 1px hotlight outline (the exam's own). Bars are `aria-hidden`; the number above carries the meaning.

### Countdown (signature)
- Uppercase caption over 1.6rem navy tabular digits, right-aligned in the command strip. Exists only while an exam runs; ≤300s turns error-text 700. The whole block leaves the header when the clock is hidden (`:has(#exam-clock[hidden])`).

### Fields
- Square selects/inputs, 1px paper-border, window fill, 0.92rem; hover base-gray border; focus 2px focus-blue offset 1px. Uppercase 0.7rem label above.

### Feedback banner
- Square, 14px 16px padding, 600 weight. Success/error/info tints from state tokens; info is an 8% navy tint. Always revealed into the strip between the sticky header and the action bar — a verdict nobody can see is a verdict that did not happen.

## Do's and Don'ts

### Do:
- **Do** ground every chrome decision in the official sandbox evidence (`research/exam-ui-reference`); fidelity is the brief.
- **Do** keep case studies first in every exam paper — sections concatenate scenario → lab → misc with randomness only inside each section.
- **Do** keep the header on one row at ≥1280px in every mode; the summary strip's 276px basis is the measured threshold.
- **Do** land the verdict between header and action bar, honoring `prefers-reduced-motion`.
- **Do** theme the browser-drawn parts: selection, caret, scrollbars, focus rings, underline offset, tabular numerals.
- **Do** keep element IDs and the node tests green — behavior is a test contract.

### Don't:
- **Don't** add gamification (points, streaks, badges, hype) or decorative motion; one authored moment is the budget.
- **Don't** round the chrome into cards, pills, or gradients — the square paper and navy fill are the identity.
- **Don't** introduce a second accent or use state colors where no verdict/flag/warning exists.
- **Don't** hard-code light-theme values; dark must remain a token swap.
- **Don't** render functional text below 0.7rem (11.2px), or let a label strand without its figure (the orphan-clock lesson).
- **Don't** dilute the restraint: the status-bar signature, running-only countdown, case-studies-first order, and verdict strip are the keep-list from the finish review.