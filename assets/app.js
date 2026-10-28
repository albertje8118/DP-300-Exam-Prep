/* DP-300 Exam Prep - static single-page app.
 *
 * Data source: questions.json (produced by extract_questions_json.py).
 *   metadata  - topic / category enumerations for the filter dropdowns
 *   scenarios - one entry per case study, referenced by questions
 *   questions - the bank itself
 *
 * No build step and no framework: the folder can be published to GitHub
 * Pages as-is.
 */

const DEFAULTS = {
  examQuestions: 60,
  examMinutes: 120,
  scenarioCount: 2,
  labCount: 10,
};

/* Build stamp injected into index.html by the Pages workflow. It keeps the
   bank and the app on the same version, so a redeploy never pairs a fresh
   app.js with a stale questions.json. */
const BUILD_VERSION =
  document.querySelector('meta[name="build-version"]')?.content || 'dev';

const STORAGE = {
  practice: 'dp300.practice.v1',
  filters: 'dp300.filters.v1',
  exam: 'dp300.exam.v1',
  ui: 'dp300.ui.v1',
  theme: 'dp300.theme.v1',
};

const TYPE_LABELS = {
  single_choice: 'Multiple choice',
  multi_select: 'Multiple choice',
  hotspot: 'Diagram question',
  simulation: 'Lab task',
};

const state = {
  bank: null,
  questions: [],
  byId: new Map(),
  scenariosById: new Map(),
  mode: 'practice',
  currentIndex: 0,
  visibleExplanations: new Set(),
  practice: {
    selections: new Map(),
    results: new Map(),
    // The student's own annotation of a question, keyed by question id.
    notes: new Map(),
  },
  filters: {
    topic: 'all',
    category: 'all',
    type: 'all',
    answerableOnly: false,
    answerState: 'all',
    search: '',
  },
  // Lower-cased searchable text per question id, built once when the bank
  // loads. 422 questions over 1.5 MB of JSON is a single cheap pass.
  searchIndex: new Map(),
  ui: {
    navigatorCollapsed: false,
    navigatorOpen: false,
    // The name printed on the report - the instructor fills it in.
    studentName: '',
  },
  // 'auto' follows the operating system; 'light' and 'dark' are explicit.
  theme: 'auto',
  exam: {
    questions: [],
    answers: new Map(),
    flagged: new Set(),
    status: 'idle',
    remainingSeconds: DEFAULTS.examMinutes * 60,
    deadline: 0,
    timerId: null,
    // The thresholds the clock has already warned about, so each one fires
    // once per exam.
    warnings: new Set(),
    scenarios: [],
    plan: null,
    settings: {
      scenarioCount: DEFAULTS.scenarioCount,
      labCount: DEFAULTS.labCount,
      questionCount: DEFAULTS.examQuestions,
      durationMinutes: DEFAULTS.examMinutes,
    },
  },
};

const el = {
  modePractice: document.getElementById('mode-practice'),
  modeExam: document.getElementById('mode-exam'),
  modeDescription: document.getElementById('mode-description'),
  summaryStrip: document.getElementById('summary-strip'),
  resetProgress: document.getElementById('reset-progress'),
  startExam: document.getElementById('start-exam'),
  newExam: document.getElementById('new-exam'),
  submitExam: document.getElementById('submit-exam'),
  sessionLabel: document.getElementById('session-label'),
  questionTitle: document.getElementById('question-title'),
  questionPosition: document.getElementById('question-position'),
  selectionMode: document.getElementById('selection-mode'),
  questionKind: document.getElementById('question-kind'),
  themeToggle: document.getElementById('theme-toggle'),
  themeToggleLabel: document.getElementById('theme-toggle-label'),
  examClock: document.getElementById('exam-clock'),
  examWarning: document.getElementById('exam-warning'),
  filterBar: document.getElementById('filter-bar'),
  filterTopic: document.getElementById('filter-topic'),
  filterCategory: document.getElementById('filter-category'),
  filterType: document.getElementById('filter-type'),
  filterAnswerState: document.getElementById('filter-answer-state'),
  filterSearch: document.getElementById('filter-search'),
  filterAnswerable: document.getElementById('filter-answerable'),
  filterSummary: document.getElementById('filter-summary'),
  filterReset: document.getElementById('filter-reset'),
  progressReport: document.getElementById('progress-report'),
  reportHeadline: document.getElementById('report-headline'),
  reportTotals: document.getElementById('report-totals'),
  reportLead: document.getElementById('report-lead'),
  reportDrill: document.getElementById('report-drill'),
  reportRows: document.getElementById('report-rows'),
  exportOpen: document.getElementById('export-open'),
  exportDialog: document.getElementById('export-dialog'),
  exportTitle: document.getElementById('export-title'),
  exportClose: document.getElementById('export-close'),
  exportStudent: document.getElementById('export-student'),
  exportSummary: document.getElementById('export-summary'),
  exportBreakdown: document.getElementById('export-breakdown'),
  exportNote: document.getElementById('export-note'),
  exportPrint: document.getElementById('export-print'),
  exportCsv: document.getElementById('export-csv'),
  printReport: document.getElementById('print-report'),
  examBlueprint: document.getElementById('exam-blueprint'),
  examScenarios: document.getElementById('exam-scenarios'),
  examLab: document.getElementById('exam-lab'),
  examCount: document.getElementById('exam-count'),
  examDuration: document.getElementById('exam-duration'),
  blueprintSummary: document.getElementById('blueprint-summary'),
  scenarioPanel: document.getElementById('scenario-panel'),
  scenarioToggle: document.getElementById('scenario-toggle'),
  scenarioTitle: document.getElementById('scenario-title'),
  scenarioBody: document.getElementById('scenario-body'),
  questionText: document.getElementById('question-text'),
  questionPanel: document.getElementById('question-panel'),
  questionMedia: document.getElementById('question-media'),
  questionNote: document.getElementById('question-note'),
  keyboardHint: document.getElementById('keyboard-hint'),
  questionNotes: document.getElementById('question-notes'),
  noteText: document.getElementById('note-text'),
  noteStatus: document.getElementById('note-status'),
  optionsList: document.getElementById('options-list'),
  prevButton: document.getElementById('prev-button'),
  nextButton: document.getElementById('next-button'),
  clearSelection: document.getElementById('clear-selection'),
  flagQuestion: document.getElementById('flag-question'),
  checkButton: document.getElementById('check-button'),
  copyLink: document.getElementById('copy-link'),
  toggleExplanation: document.getElementById('toggle-explanation'),
  explanationPanel: document.getElementById('explanation-panel'),
  explanationText: document.getElementById('explanation-text'),
  explanationMedia: document.getElementById('explanation-media'),
  explanationReferences: document.getElementById('explanation-references'),
  feedbackBanner: document.getElementById('feedback-banner'),
  navigatorTitle: document.getElementById('navigator-title'),
  navigatorCaption: document.getElementById('navigator-caption'),
  navigatorToggle: document.getElementById('navigator-toggle'),
  navigatorPanel: document.getElementById('navigator-panel'),
  navClose: document.getElementById('nav-close'),
  navBackdrop: document.getElementById('nav-backdrop'),
  mobileNavigator: document.getElementById('mobile-navigator'),
  questionGrid: document.getElementById('question-grid'),
  examResults: document.getElementById('exam-results'),
  loadingOverlay: document.getElementById('loading-overlay'),
  loadingText: document.getElementById('loading-text'),
  footerCount: document.getElementById('footer-count'),
  footerImages: document.getElementById('footer-images'),
  footerOffline: document.getElementById('footer-offline'),
};

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function formatTime(seconds) {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  const rest = Math.max(0, seconds) % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

/**
 * Put the top of the question panel back in view.
 *
 * Reading a long question to the bottom and pressing Next used to leave the
 * student looking at the middle of the *next* question, with its heading
 * above the viewport - the panel simply did not move. This is called when
 * the question changes, not on every render: a render also happens for a
 * scenario toggle or a filter change, where jumping to the top would be
 * wrong.
 *
 * The phone layout has a sticky header, so the panel is placed just below it
 * rather than under it.
 */
function scrollToQuestionTop() {
  const panel = el.questionPanel;
  if (!panel) {
    return;
  }
  const header = document.querySelector('.topbar');
  const sticky = header && getComputedStyle(header).position === 'sticky';
  const offset = sticky ? header.getBoundingClientRect().height : 0;
  const top = panel.getBoundingClientRect().top + window.scrollY - offset - 8;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: Math.max(0, top), behavior: reduced ? 'auto' : 'smooth' });
}

/**
 * A per-statement question: one answer per statement.
 *
 * The dump publishes two of these shapes - a drop-down per statement and a
 * Yes/No grid - and neither is a flat list of choices, so they carry their
 * own type in the bank and their own rendering.
 */
function isStatementQuestion(question) {
  return Boolean(question && question.type === 'statement');
}

/** A question can be auto-scored only when it has both a key and visible options. */
function isScorable(question) {
  if (!question) {
    return false;
  }
  if (isStatementQuestion(question)) {
    const statements = question.statements || [];
    return (
      statements.length > 0 &&
      statements.every(
        (statement) => statement.options && statement.options.length && statement.answer
      )
    );
  }
  return Boolean(
    question &&
      question.answer &&
      question.answer.labels.length &&
      question.options.some((option) => option.text)
  );
}

/** How many of the statements the student got right. */
function statementScore(question, selected) {
  const statements = question.statements || [];
  let correct = 0;
  statements.forEach((statement, index) => {
    if (selected[index] && selected[index] === statement.answer) {
      correct += 1;
    }
  });
  return { correct, total: statements.length };
}

function isMultiSelect(question) {
  return question.type === 'multi_select' || question.choose_count > 1;
}

/**
 * Grade a selection against the published key.
 *
 * Most questions only care *which* options were picked, but the diagram
 * questions the dump published as a picture often ask for the actions to be
 * "arranged in the correct order". Those carry `answer.ordered`, and the
 * sequence itself is what is graded: the right actions in the wrong order is
 * still the wrong answer. Scoring them as a set would teach the student that
 * the order does not matter, which is the trap the question is testing.
 */
function isCorrectSelection(question, selected) {
  if (isStatementQuestion(question)) {
    const statements = question.statements || [];
    if (selected.length !== statements.length) {
      return false;
    }
    return statements.every((statement, index) => selected[index] === statement.answer);
  }
  const expected = question.answer.labels;
  if (!expected.length) {
    return false;
  }
  if (question.answer.ordered) {
    return (
      selected.length === expected.length &&
      selected.every((label, index) => label === expected[index])
    );
  }
  const wanted = new Set(expected);
  // The *set* of picked labels has to match the set of the key. Comparing
  // the picked count with the size of the key would let a repeated label
  // stand in for a missing one: with the key "A, B" a selection of "B, B"
  // has two entries and both of them are in the key, so it would pass.
  const picked = new Set(selected);
  if (picked.size !== wanted.size) {
    return false;
  }
  return selected.every((label) => wanted.has(label));
}

/**
 * The selection as it should be displayed and compared.
 *
 * An ordered question keeps the order the student chose in; a per-statement
 * question keeps one slot per statement. Every other question keeps the old
 * alphabetical order so nothing else changes.
 */
function orderedSelection(question, labels) {
  if (
    question &&
    (isStatementQuestion(question) || (question.answer && question.answer.ordered))
  ) {
    return [...labels];
  }
  return [...labels].sort();
}

/** The key as prose: "A, B, D" for a plain key, "E → C → A" for an ordered one. */
function formatAnswer(question) {
  if (isStatementQuestion(question)) {
    const statements = question.statements || [];
    return `${statements.length} statement${statements.length === 1 ? '' : 's'}`;
  }
  const labels = (question.answer && question.answer.labels) || [];
  return question.answer && question.answer.ordered ? labels.join(' → ') : labels.join(', ');
}

function loadJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

function saveJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    /* storage full or blocked - progress simply is not persisted */
  }
}

/* ------------------------------------------------------------------ */
/* bank loading                                                       */
/* ------------------------------------------------------------------ */

async function loadBank() {
  el.loadingText.textContent = 'Loading the question bank...';
  const response = await fetch(`questions.json?v=${encodeURIComponent(BUILD_VERSION)}`);
  if (!response.ok) {
    throw new Error(`Could not load questions.json (HTTP ${response.status})`);
  }
  const data = await response.json();

  state.bank = data;
  state.questions = data.questions || [];
  state.byId = new Map(state.questions.map((q) => [q.id, q]));
  state.scenariosById = new Map((data.scenarios || []).map((s) => [s.id, s]));


  buildFilterOptions();
  buildSearchIndex();
  restorePractice();
  restoreFilters();
  restoreExam();

  el.footerCount.textContent = String(state.questions.length);
  el.footerImages.textContent = String(countImages());

  el.loadingOverlay.hidden = true;

  // A shared link opens the question it points at, whatever filters the
  // browser had remembered.
  const deepLink = questionIdFromHash();
  if (deepLink !== null && state.byId.has(deepLink)) {
    clearFiltersForDeepLink();
    const index = getFilteredQuestions().findIndex((question) => question.id === deepLink);
    if (index >= 0) {
      state.currentIndex = index;
    }
  }

  renderQuestion();
  if (deepLink !== null && state.byId.has(deepLink)) {
    scrollToQuestionTop();
  }
}

function countImages() {
  const paths = new Set();
  for (const question of state.questions) {
    for (const image of question.question.images) {
      paths.add(image.path);
    }
    for (const option of question.options) {
      for (const image of option.images) {
        paths.add(image.path);
      }
    }
  }
  for (const scenario of state.scenariosById.values()) {
    for (const image of scenario.images) {
      paths.add(image.path);
    }
  }
  return paths.size;
}

/* ------------------------------------------------------------------ */
/* search highlighting                                                 */
/* ------------------------------------------------------------------ */

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Fill an element with text, wrapping any search hit in a <mark>.
 *
 * The text is copied node by node rather than through innerHTML, so a
 * question containing markup cannot inject anything into the page.
 */
function setSearchableText(node, text, terms) {
  node.textContent = '';
  const source = text || '';
  if (!terms.length || !source) {
    node.textContent = source;
    return;
  }
  const pattern = terms.map(escapeRegExp).join('|');
  const regex = new RegExp(pattern, 'gi');
  let cursor = 0;
  let match;
  while ((match = regex.exec(source)) !== null) {
    if (match[0].length === 0) {
      regex.lastIndex += 1;
      continue;
    }
    if (match.index > cursor) {
      node.appendChild(document.createTextNode(source.slice(cursor, match.index)));
    }
    const mark = document.createElement('mark');
    mark.className = 'search-hit';
    mark.textContent = match[0];
    node.appendChild(mark);
    cursor = match.index + match[0].length;
  }
  if (cursor < source.length) {
    node.appendChild(document.createTextNode(source.slice(cursor)));
  }
}

/* ------------------------------------------------------------------ */
/* export: printable report and CSV                                    */
/* ------------------------------------------------------------------ */

/**
 * The questions the student has actually attempted, in one shape.
 *
 * The practice bank and the exam simulator keep their results in different
 * places, but an instructor's record of the session should not care which
 * one produced it.
 */
function collectReportRows() {
  const rows = [];
  if (state.mode === 'exam') {
    // While the exam is running only the answered questions are listed; in
    // the review every question in the paper is listed, so the ones left
    // blank show up as gaps in the record.
    const reviewing = isExamReview();
    for (const question of state.exam.questions) {
      if (!reviewing && !state.exam.answers.has(question.id)) {
        continue;
      }
      rows.push(buildAttemptRow(question, getExamReviewResult(question)));
    }
    return rows;
  }
  for (const [questionId, result] of state.practice.results.entries()) {
    const question = state.byId.get(questionId);
    if (question) {
      rows.push(buildAttemptRow(question, result));
    }
  }
  return rows;
}

function buildAttemptRow(question, result) {
  const selected = (result?.selectedLabels || []).join(', ');
  let verdict = 'not answered';
  if (result) {
    if (result.graded === false) {
      verdict = 'not scored';
    } else {
      verdict = result.isCorrect ? 'correct' : 'wrong';
    }
  }
  return {
    id: question.id,
    topic: question.topic_label || '',
    category: question.category ? question.category.short_name : 'Uncategorised',
    type: TYPE_LABELS[question.type] || question.type,
    stem: (question.question.text || '').replace(/\s+/g, ' ').trim(),
    yours: selected,
    correct: formatAnswer(question),
    verdict,
    note: getNote(question.id),
  };
}

/** The per-category breakdown of a set of report rows. */
function buildReportBreakdown(rows) {
  const categories = (state.bank?.metadata?.categories || []).map((category) => ({
    code: category.code,
    name: category.short_name,
    weightLabel: category.weight || '',
    weight: parseExamWeight(category.weight),
    attempted: 0,
    graded: 0,
    correct: 0,
  }));
  const byCode = new Map(categories.map((category) => [category.code, category]));

  for (const row of rows) {
    const question = state.byId.get(row.id);
    const code = question?.category?.code;
    const bucket = byCode.get(code);
    if (!bucket) {
      continue;
    }
    bucket.attempted += 1;
    if (row.verdict === 'correct' || row.verdict === 'wrong') {
      bucket.graded += 1;
      if (row.verdict === 'correct') {
        bucket.correct += 1;
      }
    }
  }

  for (const category of categories) {
    category.accuracy =
      category.graded ? Math.round((category.correct / category.graded) * 100) : null;
  }
  return categories;
}

/** A one-line summary of the session being reported. */
function describeReportSession(rows) {
  const graded = rows.filter((row) => row.verdict === 'correct' || row.verdict === 'wrong');
  const correct = graded.filter((row) => row.verdict === 'correct').length;
  const notScored = rows.filter((row) => row.verdict === 'not scored').length;
  const unanswered = rows.filter((row) => row.verdict === 'not answered').length;
  const accuracy = graded.length ? Math.round((correct / graded.length) * 100) : null;

  const parts = [];
  if (state.mode === 'exam' && isExamReview()) {
    parts.push(
      `Timed exam session: ${rows.length} question${rows.length === 1 ? '' : 's'} in the paper, ` +
        `${rows.length - unanswered} answered`
    );
  } else {
    const mode = state.mode === 'exam' ? 'Timed exam session' : 'Practice bank';
    parts.push(`${mode}: ${rows.length} question${rows.length === 1 ? '' : 's'} attempted`);
  }
  parts.push(
    graded.length ? `${correct} of ${graded.length} correct (${accuracy}%)` : 'no scored questions'
  );
  if (notScored) {
    parts.push(`${notScored} not scorable from the source`);
  }
  return { accuracy, correct, graded: graded.length, total: rows.length, text: parts.join(' · ') };
}

/** Fill the export dialog with the current session. */
function renderExportDialog() {
  const rows = collectReportRows();
  const session = describeReportSession(rows);
  const breakdown = buildReportBreakdown(rows);

  el.exportTitle.textContent =
    state.mode === 'exam' ? 'Exam report' : 'Practice report';
  el.exportSummary.textContent = session.text;
  el.exportStudent.value = state.ui.studentName || '';

  el.exportBreakdown.innerHTML = '';
  const table = document.createElement('table');
  table.className = 'export-table';

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const heading of ['Exam category', 'Weight', 'Attempted', 'Graded', 'Correct', 'Score']) {
    const th = document.createElement('th');
    th.textContent = heading;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const row of breakdown) {
    const tr = document.createElement('tr');
    const name = document.createElement('td');
    name.textContent = row.name;
    tr.appendChild(name);
    for (const value of [
      row.weightLabel,
      String(row.attempted),
      String(row.graded),
      String(row.correct),
      row.accuracy === null ? '—' : `${row.accuracy}%`,
    ]) {
      const td = document.createElement('td');
      td.className = 'num';
      td.textContent = value;
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  el.exportBreakdown.appendChild(table);

  const noted = rows.filter((row) => row.note).length;
  el.exportNote.textContent = noted
    ? `${noted} question${noted === 1 ? ' carries' : 's carry'} a note from the student - the notes are ` +
      'printed with the record and included in the CSV.'
    : 'No notes have been written on the questions.';
}

function openExportDialog() {
  renderExportDialog();
  if (typeof el.exportDialog.showModal === 'function') {
    el.exportDialog.showModal();
  } else {
    el.exportDialog.setAttribute('open', '');
  }
  el.exportStudent.focus();
}

/**
 * Build the printable record.
 *
 * The page prints this element and nothing else, so it carries everything
 * the instructor needs on paper: who, when, how well, where the gaps are,
 * and what the student asked about.
 */
function buildPrintReport() {
  const rows = collectReportRows();
  const session = describeReportSession(rows);
  const breakdown = buildReportBreakdown(rows);
  const student = (state.ui.studentName || '').trim();

  el.printReport.innerHTML = '';

  const heading = document.createElement('h1');
  heading.textContent = 'DP-300 practice report';
  el.printReport.appendChild(heading);

  const meta = document.createElement('p');
  meta.className = 'print-meta';
  const stamp = new Date();
  meta.textContent = [
    student ? `Student: ${student}` : 'Student: (not given)',
    `Date: ${stamp.toLocaleDateString()} ${stamp.toLocaleTimeString()}`,
    `Mode: ${state.mode === 'exam' ? 'Timed exam session' : 'Practice bank'}`,
    `Source: DP-300 Exam Prep`,
  ].join('  ·  ');
  el.printReport.appendChild(meta);

  const score = document.createElement('p');
  score.className = 'print-score';
  score.textContent = session.accuracy === null
    ? `${session.total} attempted, none scorable`
    : `${session.accuracy}% — ${session.correct} of ${session.graded} graded questions correct`;
  el.printReport.appendChild(score);

  el.printReport.appendChild(buildPrintTable('By exam category', ['Exam category', 'Weight', 'Attempted', 'Graded', 'Correct', 'Score'], breakdown.map((row) => [
    row.name,
    row.weightLabel,
    String(row.attempted),
    String(row.graded),
    String(row.correct),
    row.accuracy === null ? '—' : `${row.accuracy}%`,
  ])));

  if (!rows.length) {
    const empty = document.createElement('p');
    empty.textContent = 'No questions have been attempted yet.';
    el.printReport.appendChild(empty);
    return;
  }

  el.printReport.appendChild(
    buildPrintTable(
      'Questions attempted',
      ['#', 'Topic', 'Category', 'Your answer', 'Correct answer', 'Result', 'Note'],
      rows.map((row) => [
        String(row.id),
        row.topic,
        row.category,
        row.yours || '—',
        row.correct,
        row.verdict,
        row.note || '',
      ])
    )
  );
}

function buildPrintTable(title, headings, rows) {
  const wrapper = document.createElement('section');
  wrapper.className = 'print-section';

  const caption = document.createElement('h2');
  caption.textContent = title;
  wrapper.appendChild(caption);

  const table = document.createElement('table');
  table.className = 'print-table';

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const heading of headings) {
    const th = document.createElement('th');
    th.textContent = heading;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const values of rows) {
    const tr = document.createElement('tr');
    for (const value of values) {
      const td = document.createElement('td');
      td.textContent = value;
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrapper.appendChild(table);
  return wrapper;
}

/** The same record as a CSV, for a spreadsheet or a learning record system. */
function reportToCsv(rows) {
  const headings = [
    'question_id',
    'topic',
    'category',
    'type',
    'your_answer',
    'correct_answer',
    'result',
    'note',
    'question_text',
  ];
  const escape = (value) => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [headings.join(',')];
  for (const row of rows) {
    lines.push(
      [
        row.id,
        row.topic,
        row.category,
        row.type,
        row.yours,
        row.correct,
        row.verdict,
        row.note,
        row.stem,
      ]
        .map(escape)
        .join(',')
    );
  }
  return lines.join('\n');
}

/** Hand a text file to the browser as a download. */
function downloadTextFile(filename, text, mimeType) {
  const blob = new Blob([text], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // The object URL is released on the next tick, once the download has
  // started.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ------------------------------------------------------------------ */
/* progress report                                                     */
/* ------------------------------------------------------------------ */

/* An area needs a few attempts before its score means anything. */
const REPORT_MIN_ATTEMPTS = 3;

/**
 * The exam weight of a category, as a single number.
 *
 * The outline publishes a range ("20-25%"), so the midpoint stands in for
 * it when two areas have to be compared.
 */
function parseExamWeight(weightLabel) {
  if (!weightLabel) {
    return 0;
  }
  const range = String(weightLabel).match(/(\d+(?:\.\d+)?)\s*[–—-]\s*(\d+(?:\.\d+)?)/);
  if (range) {
    return (Number(range[1]) + Number(range[2])) / 2;
  }
  const single = String(weightLabel).match(/(\d+(?:\.\d+)?)/);
  return single ? Number(single[1]) : 0;
}

/**
 * The practice results, aggregated by exam category.
 *
 * The exam weight is what makes the ranking useful: a gap in a category
 * that is a quarter of the paper costs more than the same gap in one that
 * is a fifth of it, so the priority score is the gap multiplied by the
 * weight.
 */
function buildCategoryReport() {
  const categories = state.bank?.metadata?.categories || [];
  const rows = categories.map((category) => {
    const questions = state.questions.filter(
      (question) => question.category && question.category.code === category.code
    );
    let attempted = 0;
    let graded = 0;
    let correct = 0;
    for (const question of questions) {
      const result = state.practice.results.get(question.id);
      if (!result) {
        continue;
      }
      attempted += 1;
      if (result.graded === false) {
        continue;
      }
      graded += 1;
      if (result.isCorrect) {
        correct += 1;
      }
    }
    const accuracy = graded ? correct / graded : null;
    const weight = parseExamWeight(category.weight);
    return {
      code: category.code,
      shortName: category.short_name,
      fullName: category.full_name,
      description: category.description,
      weightLabel: category.weight || '',
      weight,
      total: questions.length,
      attempted,
      graded,
      correct,
      accuracy,
      // The gap between what was asked and what was right, scaled by how
      // much of the paper the area is worth.
      priority: accuracy === null ? 0 : (1 - accuracy) * weight,
      // Two attempts do not make a score; until then the area is untested
      // rather than weak.
      judged: graded >= REPORT_MIN_ATTEMPTS,
    };
  });

  const judged = rows.filter((row) => row.judged);
  // The weakest area is the one with the largest weighted gap.
  const weakest = judged.length
    ? judged.reduce((worst, row) => (row.priority > worst.priority ? row : worst))
    : null;

  return { rows, weakest, judged };
}

function renderProgressReport() {
  if (state.mode !== 'practice') {
    el.progressReport.hidden = true;
    return;
  }

  const report = buildCategoryReport();
  const totalGraded = report.rows.reduce((sum, row) => sum + row.graded, 0);
  const totalCorrect = report.rows.reduce((sum, row) => sum + row.correct, 0);

  if (!totalGraded) {
    // Nothing to report yet: the panel would only say "no data".
    el.progressReport.hidden = true;
    return;
  }
  el.progressReport.hidden = false;

  const overall = Math.round((totalCorrect / totalGraded) * 100);
  el.reportHeadline.textContent = `Practice breakdown — ${overall}% overall`;
  el.reportTotals.textContent = `${totalGraded} graded of ${state.questions.length} questions`;

  if (report.weakest) {
    const weakest = report.weakest;
    el.reportLead.textContent =
      `Your weakest area is ${weakest.shortName}: ${Math.round(weakest.accuracy * 100)}% correct ` +
      `on ${weakest.graded} graded question${weakest.graded === 1 ? '' : 's'} ` +
      `(${weakest.correct} of ${weakest.graded}). It is ${weakest.weightLabel} of the exam, ` +
      `across ${weakest.total} question${weakest.total === 1 ? '' : 's'} in the bank.`;
    el.reportDrill.hidden = false;
    el.reportDrill.textContent = `Drill ${weakest.shortName}`;
    el.reportDrill.dataset.category = weakest.code;
  } else {
    el.reportLead.textContent =
      `Answer ${REPORT_MIN_ATTEMPTS} questions in one area and the report will name the ` +
      'area to study next.';
    el.reportDrill.hidden = true;
    el.reportDrill.dataset.category = '';
  }

  // The areas are ordered by how much they need attention, so the first
  // row is the one to study.
  const ordered = [...report.rows].sort((a, b) => {
    if (a.judged !== b.judged) {
      return a.judged ? -1 : 1;
    }
    if (a.judged && b.judged) {
      return b.priority - a.priority;
    }
    return b.total - a.total;
  });

  el.reportRows.innerHTML = '';
  for (const row of ordered) {
    el.reportRows.appendChild(buildReportRow(row, report.weakest));
  }
}

/** One line of the report: the area, its score, its weight and a bar. */
function buildReportRow(row, weakest) {
  const wrapper = document.createElement('div');
  wrapper.className = 'report-row';
  if (weakest && row.code === weakest.code) {
    wrapper.classList.add('weakest');
  }

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'report-row-button';
  button.dataset.category = row.code;
  button.setAttribute(
    'aria-label',
    `${row.shortName}: ${
      row.accuracy === null
        ? row.attempted
          ? `not enough attempts yet, ${row.attempted} answered`
          : 'not started'
        : row.judged
          ? `${Math.round(row.accuracy * 100)} percent correct on ${row.graded} graded questions`
          : `${row.correct} of ${row.graded} correct so far, not enough attempts to judge`
    }. Select this area.`
  );

  const name = document.createElement('span');
  name.className = 'report-name';
  name.textContent = row.shortName;

  const bar = document.createElement('span');
  bar.className = 'report-bar';
  const fill = document.createElement('span');
  fill.className = 'report-bar-fill';
  if (row.accuracy === null) {
    fill.classList.add('empty');
    fill.style.width = '0%';
  } else {
    fill.style.width = `${Math.round(row.accuracy * 100)}%`;
    if (row.accuracy >= 0.8) {
      fill.classList.add('good');
    } else if (row.accuracy < 0.5) {
      fill.classList.add('poor');
    }
  }
  bar.appendChild(fill);
  const barLabel = document.createElement('span');
  barLabel.className = 'visually-hidden';
  barLabel.textContent = row.accuracy === null ? 'no score yet' : `${Math.round(row.accuracy * 100)}% correct`;
  bar.appendChild(barLabel);

  const score = document.createElement('span');
  score.className = 'report-score';
  if (row.accuracy === null) {
    score.textContent = row.attempted ? `not enough attempts (${row.attempted})` : 'not started';
    score.classList.add('muted');
  } else if (!row.judged) {
    // A percentage off one or two questions is noise, so the raw count is
    // shown instead of a score the bank cannot support yet.
    score.textContent = `${row.correct}/${row.graded} so far`;
    score.classList.add('muted');
    score.title = `${REPORT_MIN_ATTEMPTS} graded questions are needed before this area is judged`;
  } else {
    score.textContent = `${Math.round(row.accuracy * 100)}%`;
    score.title = `${row.correct} of ${row.graded} graded questions correct`;
  }

  const weight = document.createElement('span');
  weight.className = 'report-weight';
  weight.textContent = row.weightLabel ? `${row.weightLabel} of exam` : '';
  weight.title = row.fullName;

  button.append(name, bar, score, weight);
  wrapper.appendChild(button);
  return wrapper;
}

/**
 * Open one area of the exam and land on a question that needs work.
 *
 * The filters are cleared apart from the area, so the drill shows the whole
 * area rather than a slice of it.
 */
function drillCategory(code) {
  state.filters.topic = 'all';
  state.filters.category = code;
  state.filters.type = 'all';
  state.filters.answerableOnly = false;
  state.filters.answerState = 'all';
  state.filters.search = '';
  applyFilterInputs();
  persistFilters();

  const questions = getFilteredQuestions();
  if (!questions.length) {
    renderQuestion();
    return;
  }
  // Start on the first question in this area that was never answered right.
  let index = questions.findIndex((question) => {
    const result = state.practice.results.get(question.id);
    return !result || (result.graded !== false && !result.isCorrect);
  });
  if (index < 0) {
    index = 0;
  }
  state.currentIndex = index;
  renderQuestion();
  scrollToQuestionTop();
}

/* ------------------------------------------------------------------ */
/* deep links                                                          */
/* ------------------------------------------------------------------ */

/* A question is addressed by its id: #q-306. The scenario reference in the
   bank uses the same pattern (#scenario_t1_litware). */
const QUESTION_HASH_PREFIX = '#q-';

function questionIdFromHash() {
  const hash = window.location.hash || '';
  if (!hash.startsWith(QUESTION_HASH_PREFIX)) {
    return null;
  }
  const id = Number(hash.slice(QUESTION_HASH_PREFIX.length));
  return Number.isFinite(id) ? id : null;
}

/**
 * Put the question on screen into the address bar.
 *
 * replaceState, not a hash assignment: assigning the hash would fire a
 * hashchange event and re-enter the deep-link handler on every question.
 */
function updateLocationHash() {
  if (state.mode !== 'practice') {
    return;
  }
  const question = getCurrentQuestion();
  if (!question) {
    return;
  }
  const hash = `${QUESTION_HASH_PREFIX}${question.id}`;
  if (window.location.hash !== hash) {
    window.history.replaceState(null, '', hash);
  }
}

/**
 * Clear the filters so a shared question is actually on screen.
 *
 * A deep link means "show me this one", so it outranks whatever filter the
 * browser happens to have remembered.
 */
function clearFiltersForDeepLink() {
  state.filters = {
    topic: 'all',
    category: 'all',
    type: 'all',
    answerableOnly: false,
    answerState: 'all',
    search: '',
  };
  applyFilterInputs();
  persistFilters();
}

/**
 * Open the question a deep link points at.
 *
 * Returns true when the question was found and shown.
 */
function openQuestionById(id) {
  if (!state.byId.has(id)) {
    return false;
  }
  clearFiltersForDeepLink();
  const index = getFilteredQuestions().findIndex((question) => question.id === id);
  if (index < 0) {
    return false;
  }
  state.currentIndex = index;
  renderQuestion();
  scrollToQuestionTop();
  return true;
}

/** Copy the link to the question on screen, so it can be shared. */
async function copyQuestionLink() {
  const question = getCurrentQuestion();
  if (!question) {
    return;
  }
  updateLocationHash();
  const url = window.location.href;
  try {
    await navigator.clipboard.writeText(url);
    setFeedback(`Link copied: ${url}`, 'success');
  } catch (error) {
    // The clipboard can be blocked by the browser, so the link is shown
    // instead of failing silently.
    setFeedback(`Copy this link to share the question: ${url}`, 'info');
  }
}

/* ------------------------------------------------------------------ */
/* filters                                                             */
/* ------------------------------------------------------------------ */

/* The answer-state filter. "wrong" and "correct" only count questions that
   were actually scored - an attempt on a question with no published key is
   recorded as answered, but it was never marked right or wrong. */
const ANSWER_STATES = {
  all: { label: 'All', test: () => true },
  unanswered: { label: 'Unanswered only', test: (question) => !getPracticeResult(question.id) },
  wrong: {
    label: 'Wrong only',
    test: (question) => {
      const result = getPracticeResult(question.id);
      return Boolean(result) && result.graded !== false && !result.isCorrect;
    },
  },
  correct: {
    label: 'Correct only',
    test: (question) => {
      const result = getPracticeResult(question.id);
      return Boolean(result) && result.graded !== false && Boolean(result.isCorrect);
    },
  },
};

function buildFilterOptions() {
  const topics = state.bank.metadata.topics || [];
  el.filterTopic.innerHTML = '';
  const allTopics = document.createElement('option');
  allTopics.value = 'all';
  allTopics.textContent = `All topics (${state.questions.length})`;
  el.filterTopic.appendChild(allTopics);
  for (const topic of topics) {
    const option = document.createElement('option');
    option.value = String(topic.topic_index);
    option.textContent = `${topic.full_name} (${topic.question_count})`;
    el.filterTopic.appendChild(option);
  }

  const categories = state.bank.metadata.categories || [];
  el.filterCategory.innerHTML = '';
  const allCategories = document.createElement('option');
  allCategories.value = 'all';
  allCategories.textContent = 'All categories';
  el.filterCategory.appendChild(allCategories);
  for (const category of categories) {
    const option = document.createElement('option');
    option.value = category.code;
    option.textContent = `${category.short_name} (${category.question_count})`;
    el.filterCategory.appendChild(option);
  }

  const types = ['single_choice', 'multi_select', 'hotspot', 'simulation'];
  el.filterType.innerHTML = '';
  const allTypes = document.createElement('option');
  allTypes.value = 'all';
  allTypes.textContent = 'All types';
  el.filterType.appendChild(allTypes);
  for (const type of types) {
    const count = state.questions.filter((q) => q.type === type).length;
    if (!count) {
      continue;
    }
    const option = document.createElement('option');
    option.value = type;
    option.textContent = `${TYPE_LABELS[type]} (${count})`;
    el.filterType.appendChild(option);
  }

  // The answer-state filter counts change as the student works, so the
  // labels are repainted by updateAnswerStateCounts().
  el.filterAnswerState.innerHTML = '';
  for (const [value, descriptor] of Object.entries(ANSWER_STATES)) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = descriptor.label;
    el.filterAnswerState.appendChild(option);
  }

  // Lab-task count for the exam blueprint.
  const labCount = state.questions.filter((q) => q.topic_index === 5).length;
  el.examLab.innerHTML = '';
  for (let i = 0; i <= labCount; i += 1) {
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = i === 0 ? 'None' : `${i} task${i === 1 ? '' : 's'}`;
    el.examLab.appendChild(option);
  }
  el.examLab.value = String(Math.min(DEFAULTS.labCount, labCount));
}

/**
 * Build the searchable text for every question, once.
 *
 * The haystack covers the question, its options, the statements on a
 * per-statement question, the explanation and its references, plus the
 * topic and category names - so a student can find a question by what they
 * remember about it, not only by what the stem says.
 */
function buildSearchIndex() {
  state.searchIndex = new Map();
  for (const question of state.questions) {
    const parts = [question.question.text || ''];
    for (const option of question.options || []) {
      if (option.text) {
        parts.push(option.text);
      }
    }
    for (const statement of question.statements || []) {
      parts.push(statement.text || '');
      for (const option of statement.options || []) {
        if (option.text) {
          parts.push(option.text);
        }
      }
    }
    const explanation = question.explanation || {};
    if (explanation.text) {
      parts.push(explanation.text);
    }
    for (const reference of explanation.references || []) {
      parts.push(reference);
    }
    if (question.topic_label) {
      parts.push(question.topic_label);
    }
    if (question.category) {
      parts.push(question.category.short_name, question.category.full_name);
    }
    state.searchIndex.set(question.id, parts.join('\n').toLowerCase());
  }
}

/** The search terms, lower-cased, one per whitespace-separated word. */
function getSearchTerms() {
  return (state.filters.search || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

/** Does this question match every search term? */
function matchesSearch(question, terms) {
  if (!terms.length) {
    return true;
  }
  const haystack = state.searchIndex.get(question.id);
  if (!haystack) {
    return false;
  }
  return terms.every((term) => haystack.includes(term));
}

function getFilteredQuestions() {
  const { topic, category, type, answerableOnly, answerState } = state.filters;
  const stateFilter = ANSWER_STATES[answerState] || ANSWER_STATES.all;
  const terms = getSearchTerms();
  return state.questions.filter((question) => {
    if (topic !== 'all' && question.topic_index !== Number(topic)) {
      return false;
    }
    if (category !== 'all' && (!question.category || question.category.code !== category)) {
      return false;
    }
    if (type !== 'all' && question.type !== type) {
      return false;
    }
    if (answerableOnly && !isScorable(question)) {
      return false;
    }
    if (!stateFilter.test(question)) {
      return false;
    }
    if (!matchesSearch(question, terms)) {
      return false;
    }
    return true;
  });
}

/**
 * Repaint the answer-state options with the current counts.
 *
 * "Wrong only" is the filter a student reaches for most, so the number of
 * questions waiting for them is worth showing on the control itself.
 */
function updateAnswerStateCounts() {
  for (const option of el.filterAnswerState.options) {
    const descriptor = ANSWER_STATES[option.value];
    if (!descriptor) {
      continue;
    }
    const count = state.questions.filter(descriptor.test).length;
    option.textContent = option.value === 'all' ? descriptor.label : `${descriptor.label} (${count})`;
  }
}

function getVisibleQuestions() {
  return state.mode === 'practice' ? getFilteredQuestions() : state.exam.questions;
}

function getCurrentQuestion() {
  return getVisibleQuestions()[state.currentIndex];
}

/* ------------------------------------------------------------------ */
/* selection state                                                     */
/* ------------------------------------------------------------------ */

/**
 * The labels the student picked for a question, in the order they were picked.
 *
 * An array rather than a set: the ordered diagram questions are graded on the
 * sequence, so the order has to survive from the click through to the grade.
 */
function getSelection(questionId) {
  const map = state.mode === 'practice' ? state.practice.selections : state.exam.answers;
  return [...(map.get(questionId) || [])];
}

function setSelection(questionId, labels) {
  const map = state.mode === 'practice' ? state.practice.selections : state.exam.answers;
  map.set(questionId, [...labels]);
  if (state.mode === 'practice') {
    persistPractice();
  } else {
    persistExam();
  }
}

function getPracticeResult(questionId) {
  return state.practice.results.get(questionId) || null;
}

/**
 * The recorded practice attempt for a question - but only while practicing.
 *
 * A question answered in practice mode must not be locked in the exam: the
 * simulator answers its own questions, and a student who practiced a
 * question before sitting the exam would otherwise find it unanswerable.
 */
function getPracticeResultForMode(questionId) {
  return state.mode === 'practice' ? getPracticeResult(questionId) : null;
}

function isExamReview() {
  return state.mode === 'exam' && (state.exam.status === 'submitted' || state.exam.status === 'expired');
}

function getExamReviewResult(question) {
  if (!isExamReview()) {
    return null;
  }
  const selected = orderedSelection(question, getSelection(question.id));
  return {
    selectedLabels: selected,
    isCorrect: isScorable(question) && isCorrectSelection(question, selected),
    graded: isScorable(question),
  };
}

/* ------------------------------------------------------------------ */
/* persistence                                                         */
/* ------------------------------------------------------------------ */

function persistPractice() {
  saveJson(STORAGE.practice, {
    selections: [...state.practice.selections.entries()],
    results: [...state.practice.results.entries()],
    notes: [...state.practice.notes.entries()],
  });
}

function restorePractice() {
  const saved = loadJson(STORAGE.practice, null);
  if (!saved) {
    return;
  }
  state.practice.selections = new Map(saved.selections || []);
  state.practice.results = new Map(saved.results || []);
  state.practice.notes = new Map(saved.notes || []);
}

/* ------------------------------------------------------------------ */
/* per-question notes                                                  */
/* ------------------------------------------------------------------ */

function getNote(questionId) {
  return state.practice.notes.get(questionId) || '';
}

function setNote(questionId, text) {
  const trimmed = (text || '').trim();
  if (trimmed) {
    state.practice.notes.set(questionId, trimmed);
  } else {
    state.practice.notes.delete(questionId);
  }
  persistPractice();
}

/**
 * Show the note panel for the question on screen.
 *
 * The textarea is only refilled when the question actually changes, so a
 * note being typed is never overwritten by a re-render.
 */
function renderNotes(question) {
  if (state.mode !== 'practice') {
    el.questionNotes.hidden = true;
    return;
  }
  el.questionNotes.hidden = false;
  if (el.questionNotes.dataset.questionId === String(question.id)) {
    return;
  }
  el.questionNotes.dataset.questionId = String(question.id);
  el.noteText.value = getNote(question.id);
  el.noteStatus.textContent = '';
}

function persistFilters() {
  saveJson(STORAGE.filters, state.filters);
}

function restoreFilters() {
  const saved = loadJson(STORAGE.filters, null);
  if (!saved) {
    applyFilterInputs();
    return;
  }
  Object.assign(state.filters, saved);
  // A saved filter can outlive the option it names.
  if (!ANSWER_STATES[state.filters.answerState]) {
    state.filters.answerState = 'all';
  }
  state.filters.search = typeof state.filters.search === 'string' ? state.filters.search : '';
  applyFilterInputs();
}

function applyFilterInputs() {
  el.filterTopic.value = state.filters.topic;
  el.filterCategory.value = state.filters.category;
  el.filterType.value = state.filters.type;
  el.filterAnswerState.value = state.filters.answerState;
  el.filterSearch.value = state.filters.search;
  el.filterAnswerable.checked = state.filters.answerableOnly;
}

/* The collapsed state lives on <body> so the inline bootstrap script in
   index.html can set it before the shell paints. */
function applyNavigatorCollapsed() {
  const collapsed = state.ui.navigatorCollapsed;
  document.body.classList.toggle('nav-collapsed', collapsed);
  const label = collapsed
    ? 'Expand question navigator'
    : 'Collapse question navigator';
  el.navigatorToggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  el.navigatorToggle.setAttribute('aria-label', label);
  el.navigatorToggle.title = label;
}

function setNavigatorCollapsed(collapsed) {
  state.ui.navigatorCollapsed = Boolean(collapsed);
  applyNavigatorCollapsed();
  saveJson(STORAGE.ui, state.ui);
}

function restoreUi() {
  const saved = loadJson(STORAGE.ui, null);
  if (saved && typeof saved.navigatorCollapsed === 'boolean') {
    state.ui.navigatorCollapsed = saved.navigatorCollapsed;
  }
  if (saved && typeof saved.studentName === 'string') {
    state.ui.studentName = saved.studentName;
  }
  applyNavigatorCollapsed();
}

/* ------------------------------------------------------------------ */
/* theme                                                              */
/* ------------------------------------------------------------------ */

const THEME_PREFERENCES = ['auto', 'light', 'dark'];

const DARK_QUERY = '(prefers-color-scheme: dark)';

/** The palette actually on screen, given the student's preference. */
function effectiveTheme(preference) {
  if (preference === 'light' || preference === 'dark') {
    return preference;
  }
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

/**
 * Apply the theme to the document and repaint the toggle.
 *
 * The color tokens live in styles.css and are selected by the
 * `data-theme` attribute on <html>, so this is the only place that decides
 * which palette is live. An inline script in the head of the page sets the
 * same attribute before the first paint, to avoid a white flash.
 */
function applyTheme() {
  const theme = effectiveTheme(state.theme);
  document.documentElement.setAttribute('data-theme', theme);
  // The button stays compact - it shares a strip with the exam controls -
  // so the glyph carries the theme and the tooltip carries the detail.
  const glyph = state.theme === 'auto' ? '◐' : state.theme === 'light' ? '☀' : '☾';
  const label =
    state.theme === 'auto' ? 'Auto' : state.theme === 'light' ? 'Light' : 'Dark';
  el.themeToggleLabel.textContent = `${glyph} ${label}`;
  el.themeToggle.setAttribute(
    'aria-label',
    `Theme: ${label}. Activate to switch to the next theme.`
  );
  el.themeToggle.title =
    state.theme === 'auto'
      ? `Theme follows your system, currently ${theme}. Activate for a fixed theme.`
      : `Theme is fixed to ${label}. Activate to change it.`;
}

function setTheme(preference) {
  state.theme = THEME_PREFERENCES.includes(preference) ? preference : 'auto';
  saveJson(STORAGE.theme, state.theme);
  applyTheme();
}

function cycleTheme() {
  const next =
    THEME_PREFERENCES[(THEME_PREFERENCES.indexOf(state.theme) + 1) % THEME_PREFERENCES.length];
  setTheme(next);
}

function restoreTheme() {
  const saved = loadJson(STORAGE.theme, null);
  state.theme = THEME_PREFERENCES.includes(saved) ? saved : 'auto';
  applyTheme();

  // While the preference is "auto", a change to the system theme has to
  // repaint the app: the CSS cannot react on its own, because the
  // data-theme attribute is what selects the palette.
  const query = window.matchMedia(DARK_QUERY);
  const onSystemChange = () => {
    if (state.theme === 'auto') {
      applyTheme();
    }
  };
  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', onSystemChange);
  } else if (typeof query.addListener === 'function') {
    query.addListener(onSystemChange);
  }
}

/* ------------------------------------------------------------------ */
/* phone layout: the navigator is a bottom sheet                        */
/* ------------------------------------------------------------------ */

const PHONE_QUERY = '(max-width: 820px)';

function isPhoneLayout() {
  return window.matchMedia(PHONE_QUERY).matches;
}

/** Open or close the bottom sheet that carries the navigator on a phone. */
function setNavigatorOpen(open) {
  state.ui.navigatorOpen = Boolean(open);
  document.body.classList.toggle('nav-open', state.ui.navigatorOpen);
  el.mobileNavigator.setAttribute(
    'aria-expanded',
    state.ui.navigatorOpen ? 'true' : 'false'
  );

  if (state.ui.navigatorOpen) {
    el.navClose.focus();
  } else if (
    document.activeElement &&
    el.navigatorPanel.contains(document.activeElement)
  ) {
    el.mobileNavigator.focus();
  }
}

function persistExam() {
  if (state.exam.status === 'idle') {
    return;
  }
  saveJson(STORAGE.exam, {
    questions: state.exam.questions.map((q) => q.id),
    answers: [...state.exam.answers.entries()],
    flagged: [...state.exam.flagged.entries()],
    status: state.exam.status,
    // A wall-clock deadline, so closing the tab does not hand out extra
    // exam time.
    deadline: state.exam.deadline,
    remainingSeconds: state.exam.remainingSeconds,
    scenarios: state.exam.scenarios.map((s) => s.id),
    settings: state.exam.settings,
  });
}

function restoreExam() {
  const saved = loadJson(STORAGE.exam, null);
  if (!saved || saved.status === 'idle') {
    return;
  }
  const questions = (saved.questions || []).map((id) => state.byId.get(id)).filter(Boolean);
  if (!questions.length) {
    return;
  }
  state.exam.questions = questions;
  state.exam.answers = new Map(saved.answers || []);
  state.exam.flagged = new Set(saved.flagged || []);
  state.exam.status = saved.status;
  state.exam.scenarios = (saved.scenarios || []).map((id) => state.scenariosById.get(id)).filter(Boolean);
  Object.assign(state.exam.settings, saved.settings || {});

  if (saved.deadline && state.exam.status === 'running') {
    state.exam.deadline = saved.deadline;
    state.exam.remainingSeconds = Math.max(0, Math.round((saved.deadline - Date.now()) / 1000));
    if (state.exam.remainingSeconds <= 0) {
      state.exam.status = 'expired';
    }
  } else {
    state.exam.deadline = saved.deadline || 0;
    state.exam.remainingSeconds = saved.remainingSeconds || 0;
  }

  el.examScenarios.value = String(state.exam.settings.scenarioCount);
  el.examLab.value = String(state.exam.settings.labCount);
  el.examCount.value = String(state.exam.settings.questionCount);
  el.examDuration.value = String(state.exam.settings.durationMinutes);

  if (state.exam.status === 'running') {
    startExamTimer();
    // Come back up in the exam, not in the practice bank.
    state.mode = 'exam';
  }
}

/* ------------------------------------------------------------------ */
/* exam composition                                                    */
/* ------------------------------------------------------------------ */

function readExamSettings() {
  state.exam.settings = {
    scenarioCount: Number(el.examScenarios.value) || 1,
    labCount: Number(el.examLab.value) || 0,
    questionCount: Math.max(10, Number(el.examCount.value) || DEFAULTS.examQuestions),
    durationMinutes: Math.max(5, Number(el.examDuration.value) || DEFAULTS.examMinutes),
  };
  return state.exam.settings;
}

/**
 * Work out what the next paper will contain.
 *
 * The plan is cached so the blueprint the candidate reads before starting
 * is exactly the paper they get - re-shuffling on every render would
 * make the preview lie.
 */
function planExam(force = false) {
  if (state.exam.plan && !force) {
    return state.exam.plan;
  }
  const settings = readExamSettings();
  const scenarioPool = [...state.scenariosById.values()].filter((s) => s.question_count > 0);

  // A case study is taken whole: a case study with half its questions
  // missing is not a case study. So only the ones that fit are chosen, and
  // the blueprint has to describe the paper that is actually built - a
  // student who asks for 10 questions cannot be given 27 of them.
  const scenarios = [];
  let scenarioRoom = settings.questionCount;
  for (const scenario of shuffle(scenarioPool)) {
    if (scenarios.length >= settings.scenarioCount) {
      break;
    }
    const size = scenario.question_ids.filter((id) => state.byId.has(id)).length;
    if (size > scenarioRoom) {
      continue;
    }
    scenarios.push(scenario);
    scenarioRoom -= size;
  }

  const scenarioQuestionIds = scenarios
    .flatMap((s) => s.question_ids)
    .filter((id) => state.byId.has(id));
  const scenarioQuestions = scenarioQuestionIds.length;
  const scenarioScorable = scenarioQuestionIds.filter((id) =>
    isScorable(state.byId.get(id))
  ).length;

  const labPool = state.questions.filter((q) => q.topic_index === 5);
  // The lab tasks have to fit in whatever the case studies leave behind.
  const labRoom = Math.max(0, settings.questionCount - scenarioQuestions);
  const labCount = Math.min(settings.labCount, labPool.length, labRoom);
  const miscCount = Math.max(0, settings.questionCount - scenarioQuestions - labCount);
  const miscScorable = Math.min(
    miscCount,
    state.questions.filter((q) => q.topic_index === 6 && isScorable(q)).length
  );

  state.exam.plan = {
    settings,
    scenarios,
    scenarioQuestions,
    labCount,
    miscCount,
    gradable: scenarioScorable + miscScorable,
  };
  return state.exam.plan;
}

/**
 * Build a simulated paper.
 *
 *  1. Pick 1-2 random case studies and take *every* question in them.
 *  2. Fill part of the remainder with lab tasks (Topic 5).
 *  3. Fill the rest with miscellaneous questions (Topic 6).
 */
function buildExam(force = false) {
  const plan = planExam(force);
  const settings = plan.settings;

  const scenarioQuestions = [];
  for (const scenario of plan.scenarios) {
    for (const id of scenario.question_ids) {
      const question = state.byId.get(id);
      if (question) {
        scenarioQuestions.push(question);
      }
    }
  }

  let remaining = settings.questionCount - scenarioQuestions.length;
  if (remaining < 0) {
    scenarioQuestions.length = settings.questionCount;
    remaining = 0;
  }

  const labPool = state.questions.filter((q) => q.topic_index === 5);
  const labTasks = shuffle(labPool).slice(0, Math.min(plan.labCount, remaining));
  remaining -= labTasks.length;

  // Topic 6 is the filler. Prefer answerable questions so the paper is
  // as gradable as the source allows, and only fall back to diagram
  // questions when the pool of answerable ones runs out.
  const miscPool = state.questions.filter((q) => q.topic_index === 6);
  const answerable = shuffle(miscPool.filter(isScorable));
  const diagramOnly = shuffle(miscPool.filter((q) => !isScorable(q)));
  const misc = [...answerable, ...diagramOnly].slice(0, remaining);

  return {
    questions: shuffle([...scenarioQuestions, ...labTasks, ...misc]),
    scenarios: plan.scenarios,
  };
}

function describeBlueprint() {
  const plan = planExam();
  const names = plan.scenarios.map((s) => s.title).join(' + ');
  el.blueprintSummary.textContent =
    `${plan.settings.questionCount} questions · ${plan.settings.durationMinutes} minutes · ` +
    `${names || 'no case study'} (${plan.scenarioQuestions} q) + ` +
    `${plan.labCount} lab task${plan.labCount === 1 ? '' : 's'} + ` +
    `${plan.miscCount} from Topic 6 · about ${plan.gradable} auto-gradable`;
}

/* ------------------------------------------------------------------ */
/* rendering - shared                                                  */
/* ------------------------------------------------------------------ */

function setFeedback(message, type = 'info') {
  el.feedbackBanner.hidden = false;
  el.feedbackBanner.textContent = message;
  el.feedbackBanner.dataset.type = type;
}

function clearFeedback() {
  el.feedbackBanner.hidden = true;
  el.feedbackBanner.textContent = '';
  delete el.feedbackBanner.dataset.type;
}

function renderSummaryCards(items) {
  el.summaryStrip.innerHTML = '';
  for (const item of items) {
    const card = document.createElement('div');
    card.className = 'summary-card';

    const label = document.createElement('span');
    label.className = 'summary-label';
    label.textContent = item.label;

    const value = document.createElement('strong');
    value.className = 'summary-value';
    value.textContent = item.value;

    card.append(label, value);
    el.summaryStrip.appendChild(card);
  }
}

function updateSummary() {
  if (state.mode === 'practice') {
    const questions = getFilteredQuestions();
    const results = [...state.practice.results.values()];
    // Attempts on questions with no published key are counted as answered but
    // kept out of the accuracy denominator, so the percentage stays honest.
    const graded = results.filter((item) => item.graded !== false);
    const correct = graded.filter((item) => item.isCorrect).length;
    const accuracy = graded.length ? Math.round((correct / graded.length) * 100) : 0;
    renderSummaryCards([
      { label: 'In filter', value: String(questions.length) },
      { label: 'Answered', value: String(results.length) },
      { label: 'Correct', value: String(correct) },
      { label: 'Accuracy', value: graded.length ? `${accuracy}%` : '-' },
    ]);
    return;
  }

  const total = state.exam.questions.length;
  const answered = state.exam.answers.size;
  const flagged = state.exam.flagged.size;

  if (isExamReview()) {
    const graded = state.exam.questions.filter(isScorable);
    const correct = graded.filter((q) => getExamReviewResult(q)?.isCorrect).length;
    const score = graded.length ? Math.round((correct / graded.length) * 100) : 0;
    renderSummaryCards([
      { label: 'Exam Questions', value: String(total) },
      { label: 'Graded', value: String(graded.length) },
      { label: 'Score', value: `${score}%` },
      { label: 'Flagged', value: String(flagged) },
    ]);
    return;
  }

  renderSummaryCards([
    { label: 'Exam Questions', value: String(total || state.exam.settings.questionCount) },
    { label: 'Answered', value: String(answered) },
    { label: 'Flagged', value: String(flagged) },
    { label: 'Time Left', value: formatTime(state.exam.remainingSeconds) },
  ]);
}

function renderImages(container, images, altPrefix) {
  container.innerHTML = '';
  container.hidden = !images.length;
  for (const [index, image] of images.entries()) {
    const img = document.createElement('img');
    img.className = 'rendered-image';
    img.src = image.path;
    img.alt = `${altPrefix} ${index + 1}`;
    img.loading = 'lazy';
    container.appendChild(img);
  }
}

function renderScenario(question) {
  if (!question.scenario_id) {
    el.scenarioPanel.hidden = true;
    el.scenarioBody.innerHTML = '';
    return;
  }
  const scenario = state.scenariosById.get(question.scenario_id);
  if (!scenario) {
    el.scenarioPanel.hidden = true;
    el.scenarioBody.innerHTML = '';
    return;
  }

  el.scenarioPanel.hidden = false;
  el.scenarioTitle.textContent = `${scenario.title} — ${scenario.topic_label}`;

  const open = el.scenarioToggle.getAttribute('aria-expanded') === 'true';
  el.scenarioBody.hidden = !open;
  if (!open) {
    return;
  }

  el.scenarioBody.innerHTML = '';
  for (const section of scenario.sections) {
    el.scenarioBody.appendChild(renderScenarioSection(section));
  }
}

function renderScenarioSection(section) {
  const wrapper = document.createElement('div');
  wrapper.className = `scenario-section level-${section.level}`;

  if (section.heading) {
    const heading = document.createElement('h4');
    heading.textContent = section.heading;
    wrapper.appendChild(heading);
  }

  const images = [];
  for (const item of section.content) {
    if (item.type === 'paragraph') {
      const paragraph = document.createElement('p');
      paragraph.textContent = item.text;
      wrapper.appendChild(paragraph);
    } else if (item.type === 'image') {
      images.push(item.image);
    }
  }

  if (images.length) {
    const stack = document.createElement('div');
    stack.className = 'scenario-images';
    for (const [index, image] of images.entries()) {
      const img = document.createElement('img');
      img.className = 'rendered-image';
      img.src = image.path;
      img.alt = `Case study exhibit ${index + 1}`;
      img.loading = 'lazy';
      stack.appendChild(img);
    }
    wrapper.appendChild(stack);
  }

  for (const sub of section.subsections || []) {
    wrapper.appendChild(renderScenarioSection(sub));
  }

  return wrapper;
}

/**
 * Render a per-statement question.
 *
 * One row per statement, each with its own choices. The student picks one
 * per statement, and every statement has to be right for the question to be
 * right - which is how the exam scores them.
 */
function renderStatements(question) {
  const selected = getSelection(question.id);
  const practiceResult = getPracticeResultForMode(question.id);
  const reviewResult = getExamReviewResult(question);
  const locked = Boolean(practiceResult) || isExamReview();
  const statements = question.statements || [];

  el.optionsList.innerHTML = '';
  el.optionsList.hidden = false;

  statements.forEach((statement, index) => {
    const row = document.createElement('div');
    row.className = 'statement-row';

    const text = document.createElement('p');
    text.className = 'statement-text';
    setSearchableText(text, statement.text, getSearchTerms());
    row.appendChild(text);

    const choices = document.createElement('div');
    choices.className = 'statement-options';

    const chosen = selected[index] || '';
    for (const option of statement.options || []) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'option-button statement-option';
      button.dataset.label = option.label;
      button.setAttribute('aria-pressed', String(chosen === option.label));
      if (chosen === option.label) {
        button.classList.add('selected');
      }

      const result = practiceResult || reviewResult;
      if (result) {
        if (statement.answer === option.label) {
          button.classList.add('correct');
        } else if (chosen === option.label) {
          button.classList.add('wrong');
        }
      }

      button.disabled = locked;

      const label = document.createElement('span');
      label.className = 'option-label';
      label.textContent = option.label;

      const content = document.createElement('span');
      content.className = 'option-content';

      const optionText = document.createElement('span');
      optionText.className = 'option-text';
      setSearchableText(optionText, option.text, getSearchTerms());
      content.appendChild(optionText);

      button.append(label, content);
      button.addEventListener('click', () =>
        handleStatementClick(question, index, option.label)
      );
      choices.appendChild(button);
    }

    row.appendChild(choices);
    el.optionsList.appendChild(row);
  });
}

/** Pick - or clear - the answer for one statement. */
function handleStatementClick(question, statementIndex, label) {
  if (state.mode === 'practice' && getPracticeResult(question.id)) {
    return;
  }
  if (isExamReview()) {
    return;
  }
  const statements = question.statements || [];
  const selected = getSelection(question.id);
  while (selected.length < statements.length) {
    selected.push('');
  }
  selected[statementIndex] = selected[statementIndex] === label ? '' : label;
  setSelection(question.id, selected);
  renderQuestion();
}

function renderOptions(question) {
  if (isStatementQuestion(question)) {
    renderStatements(question);
    return;
  }
  const selected = getSelection(question.id);
  const practiceResult = getPracticeResultForMode(question.id);
  const reviewResult = getExamReviewResult(question);
  const correctLabels = new Set(question.answer.labels);
  const locked = Boolean(practiceResult) || isExamReview();
  const ordered = Boolean(question.answer && question.answer.ordered);

  el.optionsList.innerHTML = '';

  // Some questions carry option letters but no option text: the choices
  // themselves live in the attached diagram. Rendering four empty buttons
  // would be worse than showing the diagram on its own.
  const hasReadableOption = question.options.some((option) => option.text);
  if (!question.options.length || !hasReadableOption) {
    el.optionsList.hidden = true;
    return;
  }
  el.optionsList.hidden = false;

  if (ordered) {
    const summary = document.createElement('p');
    summary.className = 'options-order-summary';
    summary.textContent = selected.length
      ? `Your order: ${selected.join(' → ')}`
      : 'Pick the actions in the order they should be performed.';
    el.optionsList.appendChild(summary);
  }

  for (const option of question.options) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'option-button';
    button.dataset.label = option.label;

    const position = selected.indexOf(option.label);
    if (position >= 0) {
      button.classList.add('selected');
    }
    // The selected option is marked by a color, so the state has to be in
    // the button too.
    button.setAttribute('aria-pressed', String(position >= 0));

    const result = practiceResult || reviewResult;
    if (result) {
      if (correctLabels.has(option.label)) {
        button.classList.add('correct');
      } else if (result.selectedLabels.includes(option.label)) {
        button.classList.add('wrong');
      }
    }

    button.disabled = locked;

    const label = document.createElement('span');
    label.className = 'option-label';
    label.textContent = option.label;

    const content = document.createElement('span');
    content.className = 'option-content';

    if (ordered && position >= 0) {
      const step = document.createElement('span');
      step.className = 'option-step';
      step.textContent = `Step ${position + 1} of ${selected.length}`;
      content.appendChild(step);
    }

    const text = document.createElement('span');
    text.className = 'option-text';
    setSearchableText(
      text,
      option.text || `Option ${option.label} (shown in the image below)`,
      getSearchTerms()
    );
    content.appendChild(text);

    if (option.images && option.images.length) {
      const media = document.createElement('div');
      media.className = 'option-media';
      for (const [index, image] of option.images.entries()) {
        const img = document.createElement('img');
        img.className = 'rendered-image';
        img.src = image.path;
        img.alt = `Option ${option.label} image ${index + 1}`;
        img.loading = 'lazy';
        media.appendChild(img);
      }
      content.appendChild(media);
    }

    button.append(label, content);
    button.addEventListener('click', () => handleOptionClick(question, option.label));
    el.optionsList.appendChild(button);
  }
}

/**
 * May the explanation for this question be opened?
 *
 * In practice it opens once the question has been answered, for a lab task,
 * or for a question with references - the reference is the only teaching
 * content an unanswerable question has. In the exam review everything is
 * open.
 */
function canShowExplanation(question) {
  const references = question.explanation.references || [];
  return state.mode === 'practice'
    ? Boolean(getPracticeResult(question.id)) ||
      question.type === 'simulation' ||
      references.length > 0
    : isExamReview();
}

function renderExplanation(question) {
  const references = question.explanation.references || [];
  const hasReferences = references.length > 0;
  const canShow = canShowExplanation(question);
  const explanationVisible = canShow && state.visibleExplanations.has(question.id);

  el.toggleExplanation.disabled = !canShow;
  // The note on an authored question records how the key was read off the
  // published answer diagram, and it names the answer - so it is shown here
  // only once the question has been answered. The explanation itself can be
  // opened before that (a question with references needs it for study), and
  // that must not become a way to read the answer before attempting it.
  const answered =
    state.mode === 'practice' ? Boolean(getPracticeResult(question.id)) : isExamReview();
  const authoredNote = answered ? (question.authored && question.authored.note) || '' : '';
  const explanationText = question.explanation.text ||
    (hasReferences
      ? 'No explanation was published for this question, but the source references below ' +
        'point to the relevant documentation.'
      : 'No explanation was published for this question.');
  const explanationBody = authoredNote
    ? `${explanationText}\n\nHow the published key was read: ${authoredNote}`
    : explanationText;
  setSearchableText(el.explanationText, explanationBody, getSearchTerms());

  renderImages(el.explanationMedia, question.explanation.images || [], 'Explanation image');

  el.explanationReferences.innerHTML = '';
  el.explanationReferences.hidden = !hasReferences;
  for (const reference of references) {
    const link = document.createElement('a');
    link.href = reference;
    link.textContent = reference;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    el.explanationReferences.appendChild(link);
  }

  if (!canShow) {
    el.explanationPanel.hidden = true;
    el.toggleExplanation.textContent = 'See Explanation';
    return;
  }

  el.explanationPanel.hidden = !explanationVisible;
  el.toggleExplanation.textContent = explanationVisible ? 'Hide Explanation' : 'See Explanation';
}

function renderQuestionNote(question) {
  const notes = [];
  const scorable = isScorable(question);
  const hasReadableOption = question.options.some((option) => option.text);
  // A per-statement question carries its own options on each statement, so
  // the "no options to select" note never applies to it.
  const hasKey =
    question.answer.labels.length > 0 ||
    (isStatementQuestion(question) && (question.statements || []).length > 0);
  const plainChoice =
    question.type !== 'hotspot' &&
    question.type !== 'simulation' &&
    question.type !== 'statement';

  if (question.authored) {
    // The note on an authored question records how the key was read off the
    // published answer diagram, and it names the answer - so it belongs in
    // the explanation, which is only reachable once the question has been
    // answered. Showing it here would hand the answer to the student.
    notes.push(
      'Reconstructed question: the options and the answer key were transcribed from the ' +
        'answer diagram the source dump published as a picture. The published answer ' +
        'diagram has been hidden so the question can be attempted honestly.'
    );
    if (question.answer && question.answer.ordered) {
      notes.push(
        'This question asks for the actions to be performed in a specific order, so the ' +
          'order you pick them in is graded - the right actions in the wrong order is ' +
          'still wrong.'
      );
    }
  } else if (question.type === 'hotspot') {
    notes.push(
      'This is a diagram question: the answer area is shown above, empty, and the ' +
        'source dump publishes the correct hotspots only as a picture, so it is ' +
        'reviewed by hand. The published answer diagram has been hidden so the ' +
        'question can be attempted honestly.'
    );
  } else if (question.type === 'simulation') {
    notes.push(
      'This is a hands-on lab task. The step-by-step solution is available in the ' +
        'explanation - there is no multiple-choice answer to mark.'
    );
  }

  if (plainChoice && !hasReadableOption) {
    notes.push(
      question.options.length
        ? 'The choices for this question are published only in the diagram above, so there ' +
          'is nothing to select here.'
        : 'The source dump published no options for this question, so there is nothing to select here.'
    );
  }

  if (plainChoice && !scorable && !hasKey) {
    notes.push(
      'No answer key was published for this question in the source dump, so it cannot be scored.'
    );
  } else if (!scorable && hasKey && question.options_are_image_only) {
    notes.push(
      'The answer key for this question points into an image, so it cannot be scored automatically.'
    );
  }

  const missingScenario = (state.bank?.metadata?.case_studies_without_body || []).includes(
    question.topic_index
  );
  if (missingScenario) {
    notes.push(
      'The case study behind this question is not published in the source dump, so its ' +
        'requirements are not shown here.'
    );
  }

  const text = notes.join(' ');
  el.questionNote.hidden = !text;
  el.questionNote.textContent = text;
}

/**
 * The shortcuts that apply to the question on screen.
 *
 * A bank of 422 questions is a lot to click through, so the letters, the
 * explanation and the flag are all reachable from the keyboard. The hint
 * only lists what actually works here.
 */
function renderKeyboardHint(question) {
  if (!question) {
    el.keyboardHint.textContent = '';
    return;
  }
  const parts = [];
  const labels = [...new Set(
    Array.from(el.optionsList.querySelectorAll('button.option-button[data-label]'))
      .map((button) => button.dataset.label)
  )].sort();
  const shortcut = labels.filter((label) => label.length === 1 && label >= 'A' && label <= 'D');
  const byClick = labels.filter((label) => !shortcut.includes(label));
  if (shortcut.length) {
    // E and F are the explanation and the flag, so only A to D pick an
    // option. The options beyond D are named here, so it is clear that they
    // are reachable by mouse only.
    const pick = `${shortcut.join(', ')} pick an option`;
    parts.push(byClick.length ? `${pick} (${byClick.join(', ')} by click)` : pick);
  }
  if (canShowExplanation(question)) {
    parts.push('E explanation');
  }
  if (state.mode === 'exam' && state.exam.status === 'running') {
    parts.push('F flag');
  }
  parts.push('←/→ next question');
  el.keyboardHint.textContent = `Keyboard: ${parts.join(' · ')}`;
}

/* The state classes a navigator chip can carry. They are removed before the
   chip is repainted, so a chip never keeps a stale color. */
const NAV_CHIP_CLASSES = ['current', 'correct', 'wrong', 'answered', 'flagged', 'ungraded', 'noted'];

/* The chips are built once per visible set and repainted on every render.
   Rebuilding 422 buttons - and 422 closures with them - on every navigation
   was the app's main performance cost. */
const navChips = {
  ids: [],
  buttons: [],
};

/**
 * The state of one navigator chip: the classes it carries, the words a
 * screen reader should hear for it, and the tooltip.
 */
function navigatorChipState(question) {
  if (state.mode === 'practice') {
    const result = getPracticeResult(question.id);
    const hasNote = Boolean(state.practice.notes.get(question.id));
    if (!result) {
      return hasNote
        ? { classes: ['noted'], words: ['not answered', 'has a note'], title: 'Not answered, has a note' }
        : { classes: [], words: ['not answered'], title: '' };
    }
    if (result.graded === false) {
      return {
        classes: hasNote ? ['ungraded', 'noted'] : ['ungraded'],
        words: hasNote
          ? ['answered', 'not scored', 'has a note']
          : ['answered', 'not scored'],
        title: 'Answered, but no answer key was published - not scored',
      };
    }
    const verdict = result.isCorrect ? 'correct' : 'wrong';
    return {
      classes: hasNote ? [verdict, 'noted'] : [verdict],
      words: hasNote
        ? ['answered', verdict, 'has a note']
        : ['answered', verdict],
      title: hasNote
        ? `Answered, ${verdict}, has a note`
        : `Answered, ${verdict}`,
    };
  }

  const classes = [];
  const words = [];
  if (state.exam.answers.has(question.id)) {
    classes.push('answered');
    words.push('answered');
  }
  if (state.exam.flagged.has(question.id)) {
    classes.push('flagged');
    words.push('flagged');
  }
  if (isExamReview()) {
    const result = getExamReviewResult(question);
    if (result && result.graded) {
      // The review colors a question by its verdict, not by whether it was
      // answered, so the "answered" class gives way to correct or wrong.
      const answeredIndex = classes.indexOf('answered');
      if (answeredIndex >= 0) {
        classes.splice(answeredIndex, 1);
        words.splice(answeredIndex, 1);
      }
      classes.push(result.isCorrect ? 'correct' : 'wrong');
      words.push(result.isCorrect ? 'correct' : 'wrong');
    } else {
      classes.push('ungraded');
      words.push('not scored');
    }
  }
  return { classes, words, title: '' };
}

/** Repaint one chip from the current state. */
function paintNavigatorChip(button, question, index) {
  for (const name of NAV_CHIP_CLASSES) {
    button.classList.remove(name);
  }
  const current = index === state.currentIndex;
  if (current) {
    button.classList.add('current');
  }
  const chipState = navigatorChipState(question);
  for (const name of chipState.classes) {
    button.classList.add(name);
  }
  const words = chipState.words.length ? chipState.words.join(', ') : 'not answered';
  button.title = chipState.title || `Question ${index + 1}`;
  // The chip's color carries its state, so the state has to be in the name
  // too - a screen reader hears "12", not "12, answered, correct".
  button.setAttribute('aria-label', `Question ${index + 1}, ${words}`);
  button.setAttribute('aria-current', current ? 'true' : 'false');
}

/** Build the chips. Only called when the visible set of questions changes. */
function buildNavigator(questions) {
  el.questionGrid.innerHTML = '';
  navChips.ids = questions.map((question) => question.id);
  navChips.buttons = [];

  for (const [index, question] of questions.entries()) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'nav-chip';
    chip.textContent = String(index + 1);
    chip.dataset.index = String(index);
    el.questionGrid.appendChild(chip);
    navChips.buttons.push(chip);
  }
}

function renderNavigator() {
  const questions = getVisibleQuestions();

  if (!questions.length) {
    el.questionGrid.innerHTML = '';
    navChips.ids = [];
    navChips.buttons = [];
    el.navigatorCaption.textContent =
      state.mode === 'exam'
        ? 'Start a simulator session to generate a random exam.'
        : 'No questions match the current filters.';
    el.examResults.hidden = true;
    return;
  }

  el.navigatorCaption.textContent =
    state.mode === 'practice'
      ? 'Jump across the filtered bank. Reviewed questions stay color-coded.'
      : isExamReview()
        ? 'Review your submitted exam. Green is correct, red is wrong, gold is flagged.'
        : 'Track answered and flagged questions while the timer runs.';

  const sameSet =
    navChips.buttons.length === questions.length &&
    navChips.ids.every((id, index) => id === questions[index].id);
  if (!sameSet) {
    buildNavigator(questions);
  }

  for (const [index, question] of questions.entries()) {
    paintNavigatorChip(navChips.buttons[index], question, index);
  }
}

function renderExamResults() {
  if (!isExamReview()) {
    el.examResults.hidden = true;
    return;
  }
  el.examResults.hidden = false;

  const graded = state.exam.questions.filter(isScorable);
  const correct = graded.filter((q) => getExamReviewResult(q)?.isCorrect).length;
  const score = graded.length ? Math.round((correct / graded.length) * 100) : 0;
  const ungraded = state.exam.questions.length - graded.length;

  el.examResults.innerHTML = '';

  const heading = document.createElement('h3');
  heading.textContent = 'Exam results';
  el.examResults.appendChild(heading);

  const scoreLine = document.createElement('p');
  scoreLine.className = 'score-line';
  scoreLine.textContent = `${score}%`;
  el.examResults.appendChild(scoreLine);

  const sub = document.createElement('p');
  sub.className = 'score-sub';
  sub.textContent =
    `${correct} of ${graded.length} graded questions correct. ` +
    `${ungraded} question${ungraded === 1 ? '' : 's'} ` +
    `${ungraded === 1 ? 'is' : 'are'} diagram or lab content and cannot be scored from this source. ` +
    `Microsoft's passing score for DP-300 is 700 / 1000.`;
  el.examResults.appendChild(sub);

  const byTopic = new Map();
  const byCategory = new Map();
  for (const question of state.exam.questions) {
    const topicKey = question.topic_label;
    if (!byTopic.has(topicKey)) {
      byTopic.set(topicKey, { total: 0, graded: 0, correct: 0 });
    }
    const topic = byTopic.get(topicKey);
    topic.total += 1;
    if (isScorable(question)) {
      topic.graded += 1;
      if (getExamReviewResult(question)?.isCorrect) {
        topic.correct += 1;
      }
    }

    const categoryKey = question.category ? question.category.short_name : 'Uncategorised';
    if (!byCategory.has(categoryKey)) {
      byCategory.set(categoryKey, { total: 0, graded: 0, correct: 0 });
    }
    const category = byCategory.get(categoryKey);
    category.total += 1;
    if (isScorable(question)) {
      category.graded += 1;
      if (getExamReviewResult(question)?.isCorrect) {
        category.correct += 1;
      }
    }
  }

  el.examResults.appendChild(buildResultTable('By topic', byTopic));
  el.examResults.appendChild(buildResultTable('By exam category', byCategory));
}

function buildResultTable(title, rows) {
  const wrapper = document.createElement('div');

  const caption = document.createElement('h4');
  caption.textContent = title;
  caption.style.margin = '16px 0 6px';
  caption.style.fontSize = '0.95rem';
  wrapper.appendChild(caption);

  const table = document.createElement('table');
  table.className = 'result-table';

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const heading of ['Area', 'Questions', 'Graded', 'Correct', 'Score']) {
    const th = document.createElement('th');
    th.textContent = heading;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const [key, row] of rows.entries()) {
    const tr = document.createElement('tr');
    const name = document.createElement('td');
    name.textContent = key;
    tr.appendChild(name);

    const score = row.graded ? Math.round((row.correct / row.graded) * 100) : null;
    for (const value of [row.total, row.graded, row.correct, score === null ? '—' : `${score}%`]) {
      const td = document.createElement('td');
      td.className = 'num';
      td.textContent = String(value);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrapper.appendChild(table);
  return wrapper;
}

/* ------------------------------------------------------------------ */
/* rendering - question                                                */
/* ------------------------------------------------------------------ */

function renderTopControls() {
  el.modePractice.classList.toggle('active', state.mode === 'practice');
  el.modeExam.classList.toggle('active', state.mode === 'exam');
  // The mode switch is a pair of toggle buttons, not a tab list: there is no
  // tab panel to point `aria-controls` at, and a broken tab pattern is worse
  // than no ARIA at all.
  el.modePractice.setAttribute('aria-pressed', String(state.mode === 'practice'));
  el.modeExam.setAttribute('aria-pressed', String(state.mode === 'exam'));
  el.modePractice.disabled = state.exam.status === 'running';
  updateSummary();

  const examRunning = state.exam.status === 'running';

  el.modeDescription.textContent =
    state.mode === 'practice'
      ? 'Practice mode shows the full bank with instant scoring, explanations and image-backed questions. Filter by topic and exam category.'
      : 'Exam simulator follows the DP-300 shape: 60 questions in 120 minutes, case studies first, then lab tasks, then the rest.';

  el.filterBar.hidden = state.mode !== 'practice';
  el.copyLink.hidden = state.mode !== 'practice';
  el.examBlueprint.hidden = state.mode !== 'exam' || examRunning;
  el.resetProgress.hidden = state.mode !== 'practice';
  // One clear action per state: start from the previewed blueprint,
  // submit while running, or generate a fresh paper after a review.
  el.startExam.hidden = state.mode !== 'exam' || examRunning || isExamReview();
  el.newExam.hidden = state.mode !== 'exam' || !isExamReview();
  el.submitExam.hidden = state.mode !== 'exam' || !examRunning;
  el.examClock.hidden = state.mode !== 'exam';
  el.examClock.textContent = formatTime(state.exam.remainingSeconds);
  el.examClock.classList.toggle('danger', state.exam.remainingSeconds <= 300);
  // The warning stays up for as long as the exam is running - the clock
  // ticks every second, so it must not be cleared on every render.
  if (state.mode !== 'exam' || state.exam.status !== 'running') {
    el.examWarning.hidden = true;
    el.examWarning.textContent = '';
  }
  el.navigatorTitle.textContent = state.mode === 'practice' ? 'Browse Filtered Questions' : 'Exam Navigator';

  if (state.mode === 'exam') {
    describeBlueprint();
  }
}

function renderQuestion() {
  renderTopControls();
  updateAnswerStateCounts();

  const questions = getVisibleQuestions();
  const question = getCurrentQuestion();

  if (!question) {
    el.sessionLabel.textContent = state.mode === 'practice' ? 'Practice Bank' : 'Exam Simulator';
    el.questionTitle.textContent =
      state.mode === 'practice' ? 'No questions match' : 'Ready to start a timed exam';
    el.questionPosition.textContent = 'Question 0 / 0';
    el.selectionMode.textContent = '—';
    el.questionKind.textContent = '';
    el.questionText.textContent =
      state.mode === 'practice'
        ? state.filters.search
          ? `No question matches "${state.filters.search}". Try a different word, or reset the filters.`
          : 'Adjust the filters above, or reset them to see the whole bank.'
        : 'Set the blueprint below and start the simulator.';
    el.scenarioPanel.hidden = true;
    renderImages(el.questionMedia, [], 'Question image');
    el.optionsList.innerHTML = '';
    el.optionsList.hidden = true;
    el.questionNote.hidden = true;
    el.questionNotes.hidden = true;
    el.prevButton.disabled = true;
    el.nextButton.disabled = true;
    el.clearSelection.disabled = true;
    el.flagQuestion.hidden = true;
    el.checkButton.hidden = true;
    el.toggleExplanation.disabled = true;
    el.explanationPanel.hidden = true;
    clearFeedback();
    renderNavigator();
    renderExamResults();
    el.filterSummary.textContent = '';
    return;
  }

  const selected = getSelection(question.id);
  const practiceResult = getPracticeResultForMode(question.id);
  const reviewResult = getExamReviewResult(question);
  const examRunning = state.mode === 'exam' && state.exam.status === 'running';
  const isPractice = state.mode === 'practice';

  el.sessionLabel.textContent = isPractice
    ? 'Practice Bank'
    : examRunning
      ? 'Timed Exam Session'
      : 'Exam Review';
  el.questionTitle.textContent = `Question ${state.currentIndex + 1}`;
  el.questionPosition.textContent = `Question ${state.currentIndex + 1} / ${questions.length}`;
  el.selectionMode.textContent = isStatementQuestion(question)
    ? 'Answer every statement'
    : isMultiSelect(question)
      ? `Choose ${question.choose_count || question.answer.labels.length || 2}`
      : 'Choose 1';
  el.questionKind.textContent = question.authored
    ? 'Reconstructed'
    : TYPE_LABELS[question.type] || question.type;
  setSearchableText(el.questionText, question.question.text, getSearchTerms());
  renderImages(el.questionMedia, question.question.images || [], 'Question image');
  renderQuestionNote(question);
  renderScenario(question);

  el.prevButton.disabled = state.currentIndex === 0;
  el.nextButton.disabled = state.currentIndex === questions.length - 1;
  el.clearSelection.disabled =
    !selected.length || Boolean(practiceResult) || isExamReview();
  el.flagQuestion.hidden = state.mode !== 'exam' || !examRunning;
  el.flagQuestion.textContent = state.exam.flagged.has(question.id) ? 'Unflag' : 'Flag for Review';
  el.checkButton.hidden = !(
    isPractice && (isMultiSelect(question) || isStatementQuestion(question))
  );
  el.checkButton.disabled = Boolean(practiceResult) || !selected.length;

  if (isPractice && practiceResult) {
    if (practiceResult.graded === false) {
      setFeedback(
        'No answer key was published for this question, so it cannot be scored. ' +
          'Your selection is recorded - open the explanation for the source references.',
        'info'
      );
    } else if (isStatementQuestion(question)) {
      const score = statementScore(question, practiceResult.selectedLabels || []);
      setFeedback(
        practiceResult.isCorrect
          ? 'Correct answer.'
          : `Wrong answer. ${score.correct} of ${score.total} statements are correct.`,
        practiceResult.isCorrect ? 'success' : 'error'
      );
    } else {
      const ordered = Boolean(question.answer && question.answer.ordered);
      const yours = (practiceResult.selectedLabels || []).join(ordered ? ' → ' : ', ');
      setFeedback(
        practiceResult.isCorrect
          ? 'Correct answer.'
          : ordered
            ? `Wrong order. You chose ${yours}. The correct order is ${formatAnswer(question)}.`
            : `Wrong answer. The correct answer is ${formatAnswer(question)}.`,
        practiceResult.isCorrect ? 'success' : 'error'
      );
    }
  } else if (examRunning) {
    setFeedback(
      state.exam.flagged.has(question.id)
        ? 'Flagged for review. The full exam must be submitted before answers are revealed.'
        : 'Simulator mode hides correctness until you submit or the timer expires.',
      'info'
    );
  } else if (reviewResult) {
    const graded = state.exam.questions.filter(isScorable);
    const correct = graded.filter((q) => getExamReviewResult(q)?.isCorrect).length;
    if (!reviewResult.graded) {
      setFeedback('Reviewed by hand - this question cannot be scored from the source dump.', 'info');
    } else {
      setFeedback(
        reviewResult.isCorrect
          ? `Correct. Review score: ${correct} / ${graded.length}.`
          : isStatementQuestion(question)
            ? `Incorrect. ${(() => {
                const score = statementScore(question, reviewResult.selectedLabels || []);
                return `${score.correct} of ${score.total} statements are correct.`;
              })()} Review score: ${correct} / ${graded.length}.`
            : `Incorrect. The correct answer is ${formatAnswer(question)}. Review score: ${correct} / ${graded.length}.`,
        reviewResult.isCorrect ? 'success' : 'error'
      );
    }
  } else {
    clearFeedback();
  }

  renderOptions(question);
  renderKeyboardHint(question);
  renderNotes(question);
  renderExplanation(question);
  renderNavigator();
  renderExamResults();
  renderProgressReport();

  if (isPractice) {
    el.filterSummary.textContent = `${questions.length} question${questions.length === 1 ? '' : 's'} in the current filter`;
  }

  // Keep the address bar on the question that is on screen, so it can be
  // copied and shared.
  updateLocationHash();
}

/* ------------------------------------------------------------------ */
/* actions                                                             */
/* ------------------------------------------------------------------ */

function checkPracticeQuestion() {
  const question = getCurrentQuestion();
  if (!question) {
    return;
  }
  const graded = isScorable(question);
  const selected = orderedSelection(question, getPracticeSelection(question.id));
  if (!selected.length) {
    return;
  }

  // A question with no published answer key still gets a recorded attempt:
  // the student sees an explicit "cannot be scored" message instead of a
  // click that silently does nothing, and the selection locks like a
  // graded answer instead of letting them re-click forever.
  state.practice.results.set(question.id, {
    selectedLabels: selected,
    isCorrect: graded ? isCorrectSelection(question, selected) : null,
    graded,
  });
  persistPractice();
  renderQuestion();
}

function getPracticeSelection(questionId) {
  return [...(state.practice.selections.get(questionId) || [])];
}

/**
 * Pick an option with the keyboard.
 *
 * The letter belongs to the option list of the question. A per-statement
 * question has one list per statement, so the letter goes to the first
 * statement that has not been answered yet - that way the grid can be
 * worked down without the mouse.
 */
function handleAnswerKey(label) {
  const question = getCurrentQuestion();
  if (!question) {
    return;
  }
  const buttons = Array.from(
    el.optionsList.querySelectorAll('button.option-button[data-label]')
  );
  if (!buttons.length) {
    return;
  }

  let target = buttons.find((button) => button.dataset.label === label);
  if (!target) {
    return;
  }

  if (isStatementQuestion(question)) {
    const rows = Array.from(el.optionsList.querySelectorAll('.statement-row'));
    const selection = getSelection(question.id);
    const row = rows.find((_candidate, index) => !selection[index]) || rows[0];
    const match = row && row.querySelector(`button.option-button[data-label="${label}"]`);
    if (match) {
      target = match;
    }
  }

  if (!target || target.disabled) {
    return;
  }
  target.click();
}

function handleOptionClick(question, label) {
  if (state.mode === 'practice' && getPracticeResult(question.id)) {
    return;
  }
  if (isExamReview()) {
    return;
  }

  const selected = getSelection(question.id);
  if (isMultiSelect(question)) {
    // Clicking an option appends it to the sequence; clicking it again takes
    // it back out. For an ordered question the position in the sequence is
    // what the student is being asked for, so the order is preserved.
    const index = selected.indexOf(label);
    if (index >= 0) {
      selected.splice(index, 1);
    } else {
      selected.push(label);
    }
    setSelection(question.id, selected);
    renderQuestion();
    return;
  }

  setSelection(question.id, [label]);
  if (state.mode === 'practice') {
    checkPracticeQuestion();
    return;
  }
  renderQuestion();
}

function moveQuestion(offset) {
  const next = state.currentIndex + offset;
  const questions = getVisibleQuestions();
  if (next < 0 || next >= questions.length) {
    return;
  }
  state.currentIndex = next;
  renderQuestion();
  scrollToQuestionTop();
}

function clearSelection() {
  const question = getCurrentQuestion();
  if (!question) {
    return;
  }
  if (state.mode === 'practice' && getPracticeResult(question.id)) {
    return;
  }
  if (isExamReview()) {
    return;
  }
  if (state.mode === 'practice') {
    state.practice.selections.delete(question.id);
    persistPractice();
  } else {
    state.exam.answers.delete(question.id);
    persistExam();
  }
  renderQuestion();
}

function resetProgress() {
  state.practice.results.clear();
  state.practice.selections.clear();
  state.practice.notes.clear();
  state.visibleExplanations.clear();
  state.currentIndex = 0;
  persistPractice();
  renderQuestion();
}

function toggleFlag() {
  const question = getCurrentQuestion();
  if (!question || state.mode !== 'exam' || state.exam.status !== 'running') {
    return;
  }
  if (state.exam.flagged.has(question.id)) {
    state.exam.flagged.delete(question.id);
  } else {
    state.exam.flagged.add(question.id);
  }
  persistExam();
  renderQuestion();
}

function toggleExplanation() {
  const question = getCurrentQuestion();
  if (!question) {
    return;
  }
  // The keyboard shortcut must not be a way around the gate the button
  // enforces.
  if (!canShowExplanation(question)) {
    return;
  }
  if (state.visibleExplanations.has(question.id)) {
    state.visibleExplanations.delete(question.id);
  } else {
    state.visibleExplanations.add(question.id);
  }
  renderQuestion();
}

function toggleScenario() {
  const open = el.scenarioToggle.getAttribute('aria-expanded') === 'true';
  el.scenarioToggle.setAttribute('aria-expanded', open ? 'false' : 'true');
  renderQuestion();
}

/* ------------------------------------------------------------------ */
/* exam session                                                        */
/* ------------------------------------------------------------------ */

function stopExamTimer() {
  if (state.exam.timerId) {
    window.clearInterval(state.exam.timerId);
    state.exam.timerId = null;
  }
}

/* The clock warns before the paper runs out, so the student is never taken
   by surprise by the auto-submit. Each threshold fires once per exam. */
const EXAM_WARNING_THRESHOLDS = [
  { seconds: 600, message: '10 minutes left on the clock.' },
  { seconds: 300, message: '5 minutes left on the clock.' },
];

/** Show a message next to the clock. The element is an aria-live region, so
    the warning is announced as well as shown. */
function showExamWarning(message, action) {
  el.examWarning.textContent = message;
  if (action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ghost-button exam-warning-action';
    button.textContent = action.label;
    button.addEventListener('click', action.run);
    el.examWarning.appendChild(button);
  }
  el.examWarning.hidden = false;
}

/** Fire the time warnings that are due at this remaining time. */
function warnAboutTime(remaining) {
  for (const threshold of EXAM_WARNING_THRESHOLDS) {
    if (remaining <= threshold.seconds && !state.exam.warnings.has(threshold.seconds)) {
      state.exam.warnings.add(threshold.seconds);
      showExamWarning(threshold.message);
    }
  }
  if (remaining <= 60 && !state.exam.warnings.has(60)) {
    state.exam.warnings.add(60);
    // The last minute is the chance to submit on purpose rather than let
    // the clock do it. The warning carries the button rather than opening a
    // dialog, which would block the page in the middle of an exam.
    showExamWarning('1 minute left - the exam submits itself when the clock reaches zero.', {
      label: 'Submit now',
      run: () => finishExam('submitted'),
    });
  }
}

function startExamTimer() {
  stopExamTimer();
  state.exam.warnings = new Set();
  state.exam.timerId = window.setInterval(() => {
    // The clock is read from the deadline rather than counted down, so a
    // throttled tab - or anything else that blocks the thread - cannot
    // hand the student extra time.
    const remaining = state.exam.deadline
      ? Math.max(0, Math.ceil((state.exam.deadline - Date.now()) / 1000))
      : Math.max(0, state.exam.remainingSeconds - 1);
    state.exam.remainingSeconds = remaining;
    if (remaining <= 0) {
      state.exam.remainingSeconds = 0;
      finishExam('expired');
      return;
    }
    warnAboutTime(remaining);
    renderTopControls();
  }, 1000);
}

function finishExam(status) {
  stopExamTimer();
  state.exam.status = status;
  state.visibleExplanations.clear();
  persistExam();
  // The score lives in the navigator panel - reveal it even when the panel
  // was collapsed while the paper was being answered.
  setNavigatorCollapsed(false);
  if (isPhoneLayout()) {
    setNavigatorOpen(true);
  }
  renderQuestion();
}

function startExamSession(reshuffle = false) {
  // The blueprint preview and the paper must agree, so the cached plan is
  // reused. "New Random Exam" throws the plan away first.
  if (reshuffle) {
    state.exam.plan = null;
  }
  const built = buildExam();
  if (!built.questions.length) {
    return;
  }
  state.mode = 'exam';
  state.currentIndex = 0;
  state.visibleExplanations.clear();
  state.exam.questions = built.questions;
  state.exam.scenarios = built.scenarios;
  state.exam.answers.clear();
  state.exam.flagged.clear();
  state.exam.remainingSeconds = state.exam.settings.durationMinutes * 60;
  state.exam.deadline = Date.now() + state.exam.remainingSeconds * 1000;
  state.exam.status = 'running';
  startExamTimer();
  persistExam();
  renderQuestion();
}

function switchMode(mode) {
  if (mode === state.mode) {
    return;
  }
  if (mode === 'practice' && state.exam.status === 'running') {
    return;
  }
  state.mode = mode;
  state.currentIndex = 0;
  state.visibleExplanations.clear();
  renderQuestion();
}

/* ------------------------------------------------------------------ */
/* events                                                              */
/* ------------------------------------------------------------------ */

el.modePractice.addEventListener('click', () => switchMode('practice'));
el.modeExam.addEventListener('click', () => switchMode('exam'));
el.prevButton.addEventListener('click', () => moveQuestion(-1));
el.nextButton.addEventListener('click', () => moveQuestion(1));
el.clearSelection.addEventListener('click', () => clearSelection());
el.flagQuestion.addEventListener('click', () => toggleFlag());
el.checkButton.addEventListener('click', () => checkPracticeQuestion());
el.resetProgress.addEventListener('click', () => resetProgress());
el.startExam.addEventListener('click', () => startExamSession());
el.newExam.addEventListener('click', () => startExamSession(true));
el.submitExam.addEventListener('click', () => finishExam('submitted'));
el.toggleExplanation.addEventListener('click', () => toggleExplanation());
el.scenarioToggle.addEventListener('click', () => toggleScenario());
el.navigatorToggle.addEventListener('click', () =>
  setNavigatorCollapsed(!state.ui.navigatorCollapsed)
);
el.mobileNavigator.addEventListener('click', () =>
  setNavigatorOpen(!state.ui.navigatorOpen)
);
el.navClose.addEventListener('click', () => setNavigatorOpen(false));
el.navBackdrop.addEventListener('click', () => setNavigatorOpen(false));
el.themeToggle.addEventListener('click', () => cycleTheme());
el.copyLink.addEventListener('click', () => copyQuestionLink());

el.exportOpen.addEventListener('click', () => openExportDialog());
el.exportClose.addEventListener('click', () => el.exportDialog.close());
el.exportStudent.addEventListener('input', () => {
  state.ui.studentName = el.exportStudent.value;
  saveJson(STORAGE.ui, state.ui);
});
el.exportPrint.addEventListener('click', () => {
  buildPrintReport();
  // The dialog would print as an overlay on top of the record, so it is
  // closed before the print dialog opens.
  el.exportDialog.close();
  window.print();
});
el.exportCsv.addEventListener('click', () => {
  const rows = collectReportRows();
  const csv = reportToCsv(rows);
  const student = (state.ui.studentName || '').trim().replace(/[^\w-]+/g, '-');
  const stamp = new Date().toISOString().slice(0, 10);
  downloadTextFile(
    `dp300-report${student ? `-${student}` : ''}-${stamp}.csv`,
    csv,
    'text/csv'
  );
});

el.reportDrill.addEventListener('click', () => {
  const code = el.reportDrill.dataset.category;
  if (code) {
    drillCategory(code);
  }
});

// One listener for the whole table: every row drills into its own area.
el.reportRows.addEventListener('click', (event) => {
  const button = event.target.closest('.report-row-button');
  if (!button) {
    return;
  }
  drillCategory(button.dataset.category);
});

// The note is saved as it is typed, a moment after the student stops.
let noteTimer = null;
el.noteText.addEventListener('input', () => {
  const questionId = Number(el.questionNotes.dataset.questionId);
  if (!Number.isFinite(questionId)) {
    return;
  }
  window.clearTimeout(noteTimer);
  noteTimer = window.setTimeout(() => {
    setNote(questionId, el.noteText.value);
    el.noteStatus.textContent = 'Saved';
    // The chip in the navigator carries the note marker.
    renderNavigator();
  }, 400);
});

// A link pasted into the address bar of an open page opens that question.
window.addEventListener('hashchange', () => {
  const id = questionIdFromHash();
  if (id === null) {
    return;
  }
  if (!openQuestionById(id)) {
    // The link points at nothing in this bank - put the address bar back on
    // the question that is actually on screen, so a copied link still works.
    updateLocationHash();
  }
});

// One listener for the whole grid, rather than one per chip.
el.questionGrid.addEventListener('click', (event) => {
  const chip = event.target.closest('.nav-chip');
  if (!chip) {
    return;
  }
  const index = Number(chip.dataset.index);
  if (!Number.isFinite(index)) {
    return;
  }
  state.currentIndex = index;
  renderQuestion();
  scrollToQuestionTop();
  // On a phone the grid lives in a bottom sheet - jump and dismiss.
  if (isPhoneLayout()) {
    setNavigatorOpen(false);
  }
});

// Leaving the phone layout puts the navigator back in the page flow, so the
// sheet must not stay open behind it.
window.addEventListener('resize', () => {
  if (!isPhoneLayout() && state.ui.navigatorOpen) {
    setNavigatorOpen(false);
  }
});

el.filterTopic.addEventListener('change', () => {
  state.filters.topic = el.filterTopic.value;
  state.currentIndex = 0;
  persistFilters();
  renderQuestion();
});

el.filterCategory.addEventListener('change', () => {
  state.filters.category = el.filterCategory.value;
  state.currentIndex = 0;
  persistFilters();
  renderQuestion();
});

el.filterType.addEventListener('change', () => {
  state.filters.type = el.filterType.value;
  state.currentIndex = 0;
  persistFilters();
  renderQuestion();
});

el.filterAnswerable.addEventListener('change', () => {
  state.filters.answerableOnly = el.filterAnswerable.checked;
  state.currentIndex = 0;
  persistFilters();
  renderQuestion();
});

el.filterAnswerState.addEventListener('change', () => {
  state.filters.answerState = el.filterAnswerState.value;
  state.currentIndex = 0;
  persistFilters();
  renderQuestion();
});

// The search box is debounced: every keystroke would otherwise rebuild the
// navigator, and the navigator is 422 chips.
let searchTimer = null;
el.filterSearch.addEventListener('input', () => {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => {
    state.filters.search = el.filterSearch.value;
    state.currentIndex = 0;
    persistFilters();
    renderQuestion();
  }, 180);
});

el.filterReset.addEventListener('click', () => {
  state.filters = {
    topic: 'all',
    category: 'all',
    type: 'all',
    answerableOnly: false,
    answerState: 'all',
    search: '',
  };
  applyFilterInputs();
  state.currentIndex = 0;
  persistFilters();
  renderQuestion();
});

for (const control of [el.examScenarios, el.examLab, el.examCount, el.examDuration]) {
  control.addEventListener('change', () => {
    // The blueprint preview must follow the settings, so drop the
    // cached plan and draw a fresh one.
    state.exam.plan = null;
    describeBlueprint();
  });
}

window.addEventListener('beforeunload', stopExamTimer);

document.addEventListener('keydown', (event) => {
  if (event.target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName)) {
    return;
  }
  if (event.key === 'Escape' && state.ui.navigatorOpen) {
    setNavigatorOpen(false);
    return;
  }
  // Ctrl+Arrow moves between questions even when the plain arrows are taken
  // by a control that has the focus.
  if (event.ctrlKey && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
    moveQuestion(event.key === 'ArrowRight' ? 1 : -1);
    return;
  }
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }
  if (event.key === 'ArrowRight') {
    moveQuestion(1);
  } else if (event.key === 'ArrowLeft') {
    moveQuestion(-1);
  } else if (event.key === 'e' || event.key === 'E') {
    toggleExplanation();
  } else if (event.key === 'f' || event.key === 'F') {
    toggleFlag();
  } else if (/^[a-dA-D]$/.test(event.key)) {
    // Only A to D pick an option: E and F are the explanation and the flag,
    // and a question with five options must not lose them to a letter.
    handleAnswerKey(event.key.toUpperCase());
  }
});

/**
 * Tell the student whether the app will survive a dropped connection.
 *
 * The service worker is what makes that true, so the footer only claims it
 * once the worker is actually running.
 */
function updateOfflineStatus() {
  if (!el.footerOffline) {
    return;
  }
  if (!navigator.onLine) {
    el.footerOffline.hidden = false;
    el.footerOffline.textContent = 'You are offline - the cached copy still works.';
    el.footerOffline.classList.add('warn');
    return;
  }
  el.footerOffline.classList.remove('warn');
  if (!('serviceWorker' in navigator)) {
    el.footerOffline.hidden = true;
    return;
  }
  navigator.serviceWorker.ready
    .then((registration) => {
      el.footerOffline.hidden = !registration.active;
    })
    .catch(() => {
      el.footerOffline.hidden = true;
    });
}

/* ------------------------------------------------------------------ */
/* offline support                                                     */
/* ------------------------------------------------------------------ */

/**
 * Register the service worker that makes the app work offline.
 *
 * The worker is registered after the load event so it never competes with
 * the bank download, and a failure is logged rather than thrown: the app
 * works perfectly well without it, just not on a plane.
 */
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
  if (window.location.protocol !== 'https:' && !local) {
    return;
  }
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((error) => {
      // eslint-disable-next-line no-console
      console.warn('Offline support could not be enabled:', error.message);
    });
    updateOfflineStatus();
  });
}

window.addEventListener('online', updateOfflineStatus);
window.addEventListener('offline', updateOfflineStatus);

/* ------------------------------------------------------------------ */
/* boot                                                                */
/* ------------------------------------------------------------------ */

restoreUi();
restoreTheme();
registerServiceWorker();

loadBank().catch((error) => {
  el.loadingOverlay.hidden = false;
  el.loadingText.textContent = `Could not load the question bank. ${error.message}`;
  // eslint-disable-next-line no-console
  console.error(error);
});
