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
  },
  filters: {
    topic: 'all',
    category: 'all',
    type: 'all',
    answerableOnly: false,
  },
  exam: {
    questions: [],
    answers: new Map(),
    flagged: new Set(),
    status: 'idle',
    remainingSeconds: DEFAULTS.examMinutes * 60,
    deadline: 0,
    timerId: null,
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
  examClock: document.getElementById('exam-clock'),
  filterBar: document.getElementById('filter-bar'),
  filterTopic: document.getElementById('filter-topic'),
  filterCategory: document.getElementById('filter-category'),
  filterType: document.getElementById('filter-type'),
  filterAnswerable: document.getElementById('filter-answerable'),
  filterSummary: document.getElementById('filter-summary'),
  filterReset: document.getElementById('filter-reset'),
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
  questionMedia: document.getElementById('question-media'),
  questionNote: document.getElementById('question-note'),
  optionsList: document.getElementById('options-list'),
  prevButton: document.getElementById('prev-button'),
  nextButton: document.getElementById('next-button'),
  clearSelection: document.getElementById('clear-selection'),
  flagQuestion: document.getElementById('flag-question'),
  checkButton: document.getElementById('check-button'),
  toggleExplanation: document.getElementById('toggle-explanation'),
  explanationPanel: document.getElementById('explanation-panel'),
  explanationText: document.getElementById('explanation-text'),
  explanationMedia: document.getElementById('explanation-media'),
  explanationReferences: document.getElementById('explanation-references'),
  feedbackBanner: document.getElementById('feedback-banner'),
  navigatorTitle: document.getElementById('navigator-title'),
  navigatorCaption: document.getElementById('navigator-caption'),
  questionGrid: document.getElementById('question-grid'),
  examResults: document.getElementById('exam-results'),
  loadingOverlay: document.getElementById('loading-overlay'),
  loadingText: document.getElementById('loading-text'),
  footerCount: document.getElementById('footer-count'),
  footerImages: document.getElementById('footer-images'),
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

/** A question can be auto-scored only when it has both a key and visible options. */
function isScorable(question) {
  return Boolean(
    question &&
      question.answer &&
      question.answer.labels.length &&
      question.options.some((option) => option.text)
  );
}

function isMultiSelect(question) {
  return question.type === 'multi_select' || question.choose_count > 1;
}

function isCorrectSelection(question, selected) {
  const expected = new Set(question.answer.labels);
  if (expected.size !== selected.size) {
    return false;
  }
  return [...selected].every((label) => expected.has(label));
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
  restorePractice();
  restoreFilters();
  restoreExam();

  el.footerCount.textContent = String(state.questions.length);
  el.footerImages.textContent = String(countImages());

  el.loadingOverlay.hidden = true;
  renderQuestion();
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
/* filters                                                             */
/* ------------------------------------------------------------------ */

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

function getFilteredQuestions() {
  const { topic, category, type, answerableOnly } = state.filters;
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
    return true;
  });
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

function getSelection(questionId) {
  const map = state.mode === 'practice' ? state.practice.selections : state.exam.answers;
  return new Set(map.get(questionId) || []);
}

function setSelection(questionId, labels) {
  const map = state.mode === 'practice' ? state.practice.selections : state.exam.answers;
  map.set(questionId, [...labels].sort());
  if (state.mode === 'practice') {
    persistPractice();
  } else {
    persistExam();
  }
}

function getPracticeResult(questionId) {
  return state.practice.results.get(questionId) || null;
}

function isExamReview() {
  return state.mode === 'exam' && (state.exam.status === 'submitted' || state.exam.status === 'expired');
}

function getExamReviewResult(question) {
  if (!isExamReview()) {
    return null;
  }
  const selected = [...getSelection(question.id)].sort();
  return {
    selectedLabels: selected,
    isCorrect: isScorable(question) && isCorrectSelection(question, new Set(selected)),
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
  });
}

function restorePractice() {
  const saved = loadJson(STORAGE.practice, null);
  if (!saved) {
    return;
  }
  state.practice.selections = new Map(saved.selections || []);
  state.practice.results = new Map(saved.results || []);
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
  applyFilterInputs();
}

function applyFilterInputs() {
  el.filterTopic.value = state.filters.topic;
  el.filterCategory.value = state.filters.category;
  el.filterType.value = state.filters.type;
  el.filterAnswerable.checked = state.filters.answerableOnly;
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
  const scenarios = shuffle(scenarioPool).slice(
    0,
    Math.min(settings.scenarioCount, scenarioPool.length)
  );

  const scenarioQuestions = scenarios.reduce((sum, s) => sum + s.question_count, 0);
  const scenarioScorable = scenarios.reduce(
    (sum, s) =>
      sum + s.question_ids.filter((id) => isScorable(state.byId.get(id))).length,
    0
  );

  const labPool = state.questions.filter((q) => q.topic_index === 5);
  const labCount = Math.min(settings.labCount, labPool.length);
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
    const answered = state.practice.results.size;
    const correct = [...state.practice.results.values()].filter((item) => item.isCorrect).length;
    const accuracy = answered ? Math.round((correct / answered) * 100) : 0;
    renderSummaryCards([
      { label: 'In filter', value: String(questions.length) },
      { label: 'Answered', value: String(answered) },
      { label: 'Correct', value: String(correct) },
      { label: 'Accuracy', value: `${accuracy}%` },
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

function renderOptions(question) {
  const selected = getSelection(question.id);
  const practiceResult = getPracticeResult(question.id);
  const reviewResult = getExamReviewResult(question);
  const correctLabels = new Set(question.answer.labels);
  const locked = Boolean(practiceResult) || isExamReview();

  el.optionsList.innerHTML = '';

  if (!question.options.length) {
    el.optionsList.hidden = true;
    return;
  }
  el.optionsList.hidden = false;

  for (const option of question.options) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'option-button';
    button.dataset.label = option.label;

    if (selected.has(option.label)) {
      button.classList.add('selected');
    }

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

    const text = document.createElement('span');
    text.className = 'option-text';
    text.textContent = option.text || `Option ${option.label} (shown in the image below)`;
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

function renderExplanation(question) {
  const explanationVisible = state.visibleExplanations.has(question.id);
  const canShow =
    state.mode === 'practice'
      ? Boolean(getPracticeResult(question.id)) || question.type === 'simulation'
      : isExamReview();

  el.toggleExplanation.disabled = !canShow;
  el.explanationText.textContent = question.explanation.text || 'No explanation was published for this question.';

  renderImages(el.explanationMedia, question.explanation.images || [], 'Explanation image');

  const references = question.explanation.references || [];
  el.explanationReferences.innerHTML = '';
  el.explanationReferences.hidden = !references.length;
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
  let note = '';
  if (question.type === 'hotspot') {
    note =
      'This is a diagram question: the answer area is shown above and the correct ' +
      'hotspots are not published as text in the source dump, so it is reviewed by hand.';
  } else if (question.type === 'simulation') {
    note =
      'This is a hands-on lab task. The step-by-step solution is available in the ' +
      'explanation - there is no multiple-choice answer to mark.';
  } else if (question.options_are_image_only && question.options.length) {
    note = 'The option text for this question lives in the image above.';
  } else if (!isScorable(question) && question.answer.labels.length) {
    note = 'The answer key for this question points into an image, so it cannot be scored automatically.';
  }
  el.questionNote.hidden = !note;
  el.questionNote.textContent = note;
}

function renderNavigator() {
  const questions = getVisibleQuestions();
  el.questionGrid.innerHTML = '';

  if (!questions.length) {
    el.navigatorCaption.textContent =
      state.mode === 'exam'
        ? 'Start a simulator session to generate a random exam.'
        : 'No questions match the current filters.';
    el.examResults.hidden = true;
    return;
  }

  el.navigatorCaption.textContent =
    state.mode === 'practice'
      ? 'Jump across the filtered bank. Reviewed questions stay colour-coded.'
      : isExamReview()
        ? 'Review your submitted exam. Green is correct, red is wrong, gold is flagged.'
        : 'Track answered and flagged questions while the timer runs.';

  questions.forEach((question, index) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'nav-chip';
    chip.textContent = String(index + 1);

    if (index === state.currentIndex) {
      chip.classList.add('current');
    }

    if (state.mode === 'practice') {
      const result = getPracticeResult(question.id);
      if (result) {
        chip.classList.add(result.isCorrect ? 'correct' : 'wrong');
      }
    } else {
      if (state.exam.answers.has(question.id)) {
        chip.classList.add('answered');
      }
      if (state.exam.flagged.has(question.id)) {
        chip.classList.add('flagged');
      }
      if (isExamReview()) {
        const result = getExamReviewResult(question);
        if (result && result.graded) {
          chip.classList.remove('answered');
          chip.classList.add(result.isCorrect ? 'correct' : 'wrong');
        } else {
          chip.classList.add('ungraded');
        }
      }
    }

    chip.addEventListener('click', () => {
      state.currentIndex = index;
      renderQuestion();
    });
    el.questionGrid.appendChild(chip);
  });
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
  el.modePractice.disabled = state.exam.status === 'running';
  updateSummary();

  const examRunning = state.exam.status === 'running';
  const examReady = state.exam.questions.length > 0;

  el.modeDescription.textContent =
    state.mode === 'practice'
      ? 'Practice mode shows the full bank with instant scoring, explanations and image-backed questions. Filter by topic and exam category.'
      : 'Exam simulator follows the DP-300 shape: 60 questions in 120 minutes, case studies first, then lab tasks, then the rest.';

  el.filterBar.hidden = state.mode !== 'practice';
  el.examBlueprint.hidden = state.mode !== 'exam' || examRunning;
  el.resetProgress.hidden = state.mode !== 'practice';
  el.startExam.hidden = state.mode !== 'exam' || examRunning;
  el.newExam.hidden = state.mode !== 'exam' || !examReady || examRunning;
  el.submitExam.hidden = state.mode !== 'exam' || !examRunning;
  el.examClock.hidden = state.mode !== 'exam';
  el.examClock.textContent = formatTime(state.exam.remainingSeconds);
  el.examClock.classList.toggle('danger', state.exam.remainingSeconds <= 300);
  el.navigatorTitle.textContent = state.mode === 'practice' ? 'Browse Filtered Questions' : 'Exam Navigator';

  if (state.mode === 'exam') {
    describeBlueprint();
  }
}

function renderQuestion() {
  renderTopControls();

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
        ? 'Adjust the filters above, or reset them to see the whole bank.'
        : 'Set the blueprint below and start the simulator.';
    el.scenarioPanel.hidden = true;
    renderImages(el.questionMedia, [], 'Question image');
    el.optionsList.innerHTML = '';
    el.optionsList.hidden = true;
    el.questionNote.hidden = true;
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
  const practiceResult = getPracticeResult(question.id);
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
  el.selectionMode.textContent = isMultiSelect(question)
    ? `Choose ${question.choose_count || question.answer.labels.length || 2}`
    : 'Choose 1';
  el.questionKind.textContent = TYPE_LABELS[question.type] || question.type;
  el.questionText.textContent = question.question.text;
  renderImages(el.questionMedia, question.question.images || [], 'Question image');
  renderQuestionNote(question);
  renderScenario(question);

  el.prevButton.disabled = state.currentIndex === 0;
  el.nextButton.disabled = state.currentIndex === questions.length - 1;
  el.clearSelection.disabled =
    !selected.size || Boolean(practiceResult) || isExamReview();
  el.flagQuestion.hidden = state.mode !== 'exam' || !examRunning;
  el.flagQuestion.textContent = state.exam.flagged.has(question.id) ? 'Unflag' : 'Flag for Review';
  el.checkButton.hidden = !(isPractice && isMultiSelect(question) && isScorable(question));
  el.checkButton.disabled = Boolean(practiceResult) || !selected.size;

  if (isPractice && practiceResult) {
    setFeedback(
      practiceResult.isCorrect
        ? 'Correct answer.'
        : `Wrong answer. The correct answer is ${question.answer.labels.join(', ')}.`,
      practiceResult.isCorrect ? 'success' : 'error'
    );
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
          : `Incorrect. The correct answer is ${question.answer.labels.join(', ')}. Review score: ${correct} / ${graded.length}.`,
        reviewResult.isCorrect ? 'success' : 'error'
      );
    }
  } else {
    clearFeedback();
  }

  renderOptions(question);
  renderExplanation(question);
  renderNavigator();
  renderExamResults();

  if (isPractice) {
    el.filterSummary.textContent = `${questions.length} question${questions.length === 1 ? '' : 's'} in the current filter`;
  }
}

/* ------------------------------------------------------------------ */
/* actions                                                             */
/* ------------------------------------------------------------------ */

function checkPracticeQuestion() {
  const question = getCurrentQuestion();
  if (!question || !isScorable(question)) {
    return;
  }
  const selected = [...getPracticeSelection(question.id)].sort();
  if (!selected.length) {
    return;
  }
  state.practice.results.set(question.id, {
    selectedLabels: selected,
    isCorrect: isCorrectSelection(question, new Set(selected)),
  });
  persistPractice();
  renderQuestion();
}

function getPracticeSelection(questionId) {
  return new Set(state.practice.selections.get(questionId) || []);
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
    if (selected.has(label)) {
      selected.delete(label);
    } else {
      selected.add(label);
    }
    setSelection(question.id, selected);
    renderQuestion();
    return;
  }

  setSelection(question.id, new Set([label]));
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

function startExamTimer() {
  stopExamTimer();
  state.exam.timerId = window.setInterval(() => {
    state.exam.remainingSeconds -= 1;
    if (state.exam.remainingSeconds <= 0) {
      state.exam.remainingSeconds = 0;
      finishExam('expired');
      return;
    }
    renderTopControls();
  }, 1000);
}

function finishExam(status) {
  stopExamTimer();
  state.exam.status = status;
  state.visibleExplanations.clear();
  persistExam();
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

el.filterReset.addEventListener('click', () => {
  state.filters = { topic: 'all', category: 'all', type: 'all', answerableOnly: false };
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
  if (event.key === 'ArrowRight') {
    moveQuestion(1);
  } else if (event.key === 'ArrowLeft') {
    moveQuestion(-1);
  }
});

/* ------------------------------------------------------------------ */
/* boot                                                                */
/* ------------------------------------------------------------------ */

loadBank().catch((error) => {
  el.loadingOverlay.hidden = false;
  el.loadingText.textContent = `Could not load the question bank. ${error.message}`;
  // eslint-disable-next-line no-console
  console.error(error);
});
