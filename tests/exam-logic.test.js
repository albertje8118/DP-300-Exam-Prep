'use strict';

/**
 * The exam logic.
 *
 * These are the parts of the app that would *silently* mislead a student
 * rather than crash: a question that is scored when it should not be, a key
 * that grades as correct when it is not, a blueprint that describes a paper
 * the app never builds. A regression in any of them still produces a
 * perfectly plausible screen - it just reports the wrong thing.
 *
 * Run with: node --test tests/
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp, appApi } = require('./load-app');

let app;
let api;

test.before(async () => {
  app = await loadApp();
  api = appApi(app.context);
});

/* ------------------------------------------------------------------ */
/* isScorable                                                          */
/* ------------------------------------------------------------------ */

test('isScorable: a question with a key and visible option text is scorable', () => {
  const question = {
    type: 'single_choice',
    answer: { labels: ['A'] },
    options: [{ label: 'A', text: 'Create the database' }],
  };
  assert.equal(api.isScorable(question), true);
});

test('isScorable: a question with no published key is not scorable', () => {
  const question = {
    type: 'single_choice',
    answer: { labels: [] },
    options: [{ label: 'A', text: 'Create the database' }],
  };
  assert.equal(api.isScorable(question), false);
});

test('isScorable: options published only as a picture are not scorable', () => {
  const question = {
    type: 'single_choice',
    answer: { labels: ['A'] },
    options: [{ label: 'A', text: '' }],
  };
  assert.equal(api.isScorable(question), false);
});

test('isScorable: nothing at all is not scorable', () => {
  assert.equal(api.isScorable(null), false);
  assert.equal(api.isScorable(undefined), false);
});

test('isScorable: a per-statement question needs every statement answered', () => {
  const complete = {
    type: 'statement',
    statements: [
      { text: 'One', options: [{ label: 'A', text: 'x' }], answer: 'A' },
      { text: 'Two', options: [{ label: 'B', text: 'y' }], answer: 'B' },
    ],
  };
  assert.equal(api.isScorable(complete), true);

  const missingAnswer = {
    type: 'statement',
    statements: [
      { text: 'One', options: [{ label: 'A', text: 'x' }], answer: 'A' },
      { text: 'Two', options: [{ label: 'B', text: 'y' }] },
    ],
  };
  assert.equal(api.isScorable(missingAnswer), false);
});

test('isScorable: the bank has 400 scorable questions and 22 lab tasks', () => {
  const scorable = app.state.questions.filter(api.isScorable);
  assert.equal(app.state.questions.length, 422);
  assert.equal(scorable.length, 400);

  // The ones that cannot be scored are the hands-on lab tasks: their answer
  // is a walk-through, not a multiple-choice key.
  const unscorable = app.state.questions.filter((q) => !api.isScorable(q));
  assert.equal(unscorable.length, 22);
  for (const question of unscorable) {
    assert.equal(question.type, 'simulation', `question ${question.id} is not a lab task`);
  }
});

/* ------------------------------------------------------------------ */
/* isCorrectSelection                                                  */
/* ------------------------------------------------------------------ */

/** The key as the app expects it: one label per statement. */
function keyFor(question) {
  if (api.isStatementQuestion(question)) {
    return (question.statements || []).map((statement) => statement.answer);
  }
  return question.answer.labels;
}

/** A selection that is definitely not the key. */
function wrongSelectionFor(question) {
  if (api.isStatementQuestion(question)) {
    const statements = question.statements || [];
    const first = statements[0];
    const alternative = (first.options || [])
      .map((option) => option.label)
      .find((label) => label !== first.answer);
    if (!alternative) {
      return null;
    }
    return [alternative, ...keyFor(question).slice(1)];
  }
  const alternative = (question.options || [])
    .map((option) => option.label)
    .find((label) => !question.answer.labels.includes(label));
  return alternative ? [alternative] : null;
}

test('isCorrectSelection: the published key grades as correct for every scorable question', () => {
  const scorable = app.state.questions.filter(api.isScorable);
  const failures = [];
  for (const question of scorable) {
    if (!api.isCorrectSelection(question, keyFor(question))) {
      failures.push(question.id);
    }
  }
  assert.deepEqual(failures, [], `these questions do not grade their own key correct: ${failures}`);
});

test('isCorrectSelection: a different selection grades as wrong for every scorable question', () => {
  const scorable = app.state.questions.filter(api.isScorable);
  const failures = [];
  let checked = 0;
  for (const question of scorable) {
    const wrong = wrongSelectionFor(question);
    if (!wrong) {
      continue;
    }
    checked += 1;
    if (api.isCorrectSelection(question, wrong)) {
      failures.push(question.id);
    }
  }
  assert.ok(checked > 350, `only ${checked} questions could be checked`);
  assert.deepEqual(failures, [], `these questions grade a wrong selection correct: ${failures}`);
});

test('isCorrectSelection: an empty selection is never correct', () => {
  const scorable = app.state.questions.filter(api.isScorable);
  const failures = scorable
    .filter((question) => api.isCorrectSelection(question, []))
    .map((question) => question.id);
  assert.deepEqual(failures, []);
});

test('isCorrectSelection: a question with no key is never correct', () => {
  const question = {
    type: 'single_choice',
    answer: { labels: [] },
    options: [{ label: 'A', text: 'x' }],
  };
  assert.equal(api.isCorrectSelection(question, ['A']), false);
});

test('isCorrectSelection: the right options in the wrong order are wrong', () => {
  const question = {
    type: 'multi_select',
    answer: { labels: ['A', 'B', 'C'], ordered: true },
    options: [
      { label: 'A', text: 'one' },
      { label: 'B', text: 'two' },
      { label: 'C', text: 'three' },
    ],
  };
  assert.equal(api.isCorrectSelection(question, ['A', 'B', 'C']), true);
  assert.equal(api.isCorrectSelection(question, ['B', 'A', 'C']), false);
  assert.equal(api.isCorrectSelection(question, ['A', 'B']), false);
});

test('isCorrectSelection: an unordered key does not care about the order', () => {
  const question = {
    type: 'multi_select',
    answer: { labels: ['A', 'B'] },
    options: [
      { label: 'A', text: 'one' },
      { label: 'B', text: 'two' },
    ],
  };
  assert.equal(api.isCorrectSelection(question, ['B', 'A']), true);
});

test('isCorrectSelection: a repeated label cannot stand in for a missing one', () => {
  // With the key "A, B", the selection "B, B" has two entries and both are
  // in the key. Comparing the picked count with the size of the key would
  // let it pass.
  const question = {
    type: 'multi_select',
    answer: { labels: ['A', 'B'] },
    options: [
      { label: 'A', text: 'one' },
      { label: 'B', text: 'two' },
    ],
  };
  assert.equal(api.isCorrectSelection(question, ['B', 'B']), false);
  assert.equal(api.isCorrectSelection(question, ['A', 'B']), true);
});

test('isCorrectSelection: a per-statement question needs every statement right', () => {
  const question = {
    type: 'statement',
    statements: [
      { text: 'One', options: [{ label: 'A', text: 'x' }, { label: 'B', text: 'y' }], answer: 'A' },
      { text: 'Two', options: [{ label: 'A', text: 'x' }, { label: 'B', text: 'y' }], answer: 'B' },
    ],
  };
  assert.equal(api.isCorrectSelection(question, ['A', 'B']), true);
  assert.equal(api.isCorrectSelection(question, ['B', 'B']), false);
  assert.equal(api.isCorrectSelection(question, ['A']), false);
  assert.equal(api.isCorrectSelection(question, ['A', 'B', 'A']), false);
});

/* ------------------------------------------------------------------ */
/* the blueprint must describe the paper that is built                 */
/* ------------------------------------------------------------------ */

/**
 * Set the exam settings the way the blueprint panel does.
 */
function setBlueprint({ scenarios, lab, questions, minutes }) {
  app.el.examScenarios.value = String(scenarios);
  app.el.examLab.value = String(lab);
  app.el.examCount.value = String(questions);
  app.el.examDuration.value = String(minutes);
}

/** Every combination a student can pick in the blueprint panel. */
function blueprintSettings() {
  const settings = [];
  for (const questions of [10, 20, 27, 30, 40, 60, 90, 120]) {
    for (const scenarios of [1, 2]) {
      for (const lab of [0, 5, 10, 22]) {
        settings.push({ scenarios, lab, questions, minutes: 120 });
      }
    }
  }
  return settings;
}

test('the blueprint describes the paper that is actually built', () => {
  const mismatches = [];
  for (const settings of blueprintSettings()) {
    setBlueprint(settings);
    const plan = api.planExam(true);
    const paper = api.buildExam(false);

    const paperTopic5 = paper.questions.filter((q) => q.topic_index === 5).length;
    const paperTopic6 = paper.questions.filter((q) => q.topic_index === 6).length;
    const paperScenario = paper.questions.filter((q) => q.scenario_id).length;

    const label = JSON.stringify(settings);
    if (paper.questions.length !== plan.settings.questionCount) {
      mismatches.push(`${label}: paper has ${paper.questions.length} questions, the blueprint says ${plan.settings.questionCount}`);
    }
    if (paperScenario !== plan.scenarioQuestions) {
      mismatches.push(`${label}: paper has ${paperScenario} case study questions, the blueprint says ${plan.scenarioQuestions}`);
    }
    if (paperTopic5 !== plan.labCount) {
      mismatches.push(`${label}: paper has ${paperTopic5} lab tasks, the blueprint says ${plan.labCount}`);
    }
    if (paperTopic6 !== plan.miscCount) {
      mismatches.push(`${label}: paper has ${paperTopic6} Topic 6 questions, the blueprint says ${plan.miscCount}`);
    }
    const total = plan.scenarioQuestions + plan.labCount + plan.miscCount;
    if (total !== plan.settings.questionCount) {
      mismatches.push(`${label}: the blueprint adds up to ${total}, not ${plan.settings.questionCount}`);
    }
  }
  assert.deepEqual(mismatches, [], mismatches.join('\n'));
});

test('a chosen case study is taken whole', () => {
  const mismatches = [];
  for (const settings of blueprintSettings()) {
    setBlueprint(settings);
    const plan = api.planExam(true);
    const paper = api.buildExam(false);
    const paperIds = new Set(paper.questions.map((q) => q.id));

    for (const scenario of plan.scenarios) {
      const missing = scenario.question_ids.filter((id) => !paperIds.has(id));
      if (missing.length) {
        mismatches.push(
          `${JSON.stringify(settings)}: ${scenario.id} is missing ${missing.length} of its questions`
        );
      }
    }
  }
  assert.deepEqual(mismatches, [], mismatches.join('\n'));
});

test('the paper holds the number of questions the student asked for', () => {
  for (const count of [10, 25, 40, 60, 80, 120]) {
    setBlueprint({ scenarios: 2, lab: 10, questions: count, minutes: 120 });
    const paper = api.buildExam(true);
    assert.equal(paper.questions.length, count, `a ${count} question paper came out wrong`);
  }
});

test('the paper never repeats a question', () => {
  for (const settings of blueprintSettings()) {
    setBlueprint(settings);
    const paper = api.buildExam(true);
    const ids = paper.questions.map((q) => q.id);
    assert.equal(new Set(ids).size, ids.length, `a paper repeated a question: ${JSON.stringify(settings)}`);
  }
});

test('the plan is cached, so the blueprint preview is the paper that is built', () => {
  setBlueprint({ scenarios: 2, lab: 10, questions: 60, minutes: 120 });
  const first = api.planExam(true);
  const second = api.planExam(false);
  assert.equal(first, second, 'the plan was recomputed instead of being reused');

  const forced = api.planExam(true);
  assert.notEqual(first, forced, 'a forced re-plan did not produce a new plan');
});

test('the lab tasks in the paper are lab tasks, and the filler is Topic 6', () => {
  setBlueprint({ scenarios: 1, lab: 10, questions: 60, minutes: 120 });
  const paper = api.buildExam(true);
  for (const question of paper.questions) {
    if (question.topic_index === 5) {
      assert.equal(question.type, 'simulation');
    } else if (!question.scenario_id) {
      assert.equal(question.topic_index, 6, `question ${question.id} is neither a lab task nor Topic 6`);
    }
  }
});

/* ------------------------------------------------------------------ */
/* the filters and the progress report                                 */
/* ------------------------------------------------------------------ */

test('the answer-state filter separates unanswered, wrong and correct', () => {
  const questions = app.state.questions;
  const practice = app.state.practice;

  practice.results.clear();
  const scorable = questions.filter(api.isScorable).slice(0, 10);
  scorable.forEach((question, index) => {
    practice.results.set(question.id, {
      selectedLabels: ['A'],
      isCorrect: index % 2 === 0,
      graded: true,
    });
  });
  // An attempt on a question with no published key was recorded, but it was
  // never marked right or wrong.
  const unscorable = questions.find((q) => !api.isScorable(q));
  practice.results.set(unscorable.id, {
    selectedLabels: [],
    isCorrect: false,
    graded: false,
  });

  const original = { ...app.state.filters };
  try {
    app.state.filters.answerState = 'wrong';
    const wrong = api.getFilteredQuestions();
    assert.equal(wrong.length, 5);
    for (const question of wrong) {
      assert.equal(practice.results.get(question.id).isCorrect, false);
    }

    app.state.filters.answerState = 'correct';
    assert.equal(api.getFilteredQuestions().length, 5);

    app.state.filters.answerState = 'unanswered';
    const unanswered = api.getFilteredQuestions();
    assert.equal(unanswered.length, questions.length - 11);
    assert.ok(!unanswered.some((q) => q.id === unscorable.id), 'an answered question was listed as unanswered');

    app.state.filters.answerState = 'all';
    assert.equal(api.getFilteredQuestions().length, questions.length);
  } finally {
    Object.assign(app.state.filters, original);
    practice.results.clear();
  }
});

test('the search finds a question by its option text, not only by its stem', () => {
  const original = { ...app.state.filters };
  try {
    // Find a word that appears in an option but not in that question's stem.
    let target = null;
    let term = null;
    for (const question of app.state.questions) {
      const stem = (question.question.text || '').toLowerCase();
      for (const option of question.options || []) {
        const words = (option.text || '').toLowerCase().match(/[a-z]{7,}/g) || [];
        const found = words.find((word) => !stem.includes(word));
        if (found) {
          target = question;
          term = found;
          break;
        }
      }
      if (term) {
        break;
      }
    }
    assert.ok(target, 'no question in the bank has a word that is only in its options');

    app.state.filters.search = term;
    const hits = api.getFilteredQuestions();
    assert.ok(
      hits.some((q) => q.id === target.id),
      `a match in an option text did not find question ${target.id}`
    );

    app.state.filters.search = 'a term that appears nowhere in the bank';
    assert.equal(api.getFilteredQuestions().length, 0);
  } finally {
    Object.assign(app.state.filters, original);
  }
});

test('the exam weight is reduced to a single number for comparison', () => {
  assert.equal(api.parseExamWeight('20–25%'), 22.5);
  assert.equal(api.parseExamWeight('15-20%'), 17.5);
  assert.equal(api.parseExamWeight('10%'), 10);
  assert.equal(api.parseExamWeight(''), 0);
  assert.equal(api.parseExamWeight(undefined), 0);
});

test('the progress report names the weakest area by weighted gap', () => {
  const practice = app.state.practice;
  const original = { ...app.state.filters };
  try {
    practice.results.clear();
    // Secure environment is worth 22.5 points of the exam, automation 17.5.
    // Automation is the weaker area, and the weight has to be what decides
    // it, so automation is given the bigger gap.
    const secure = app.state.questions.filter((q) => q.category && q.category.code === 'secure_environment');
    const automation = app.state.questions.filter((q) => q.category && q.category.code === 'automation');
    const scorable = (list) => list.filter(api.isScorable).slice(0, 6);

    scorable(secure).forEach((question) => {
      practice.results.set(question.id, { selectedLabels: ['A'], isCorrect: true, graded: true });
    });
    scorable(automation).forEach((question) => {
      practice.results.set(question.id, { selectedLabels: ['A'], isCorrect: false, graded: true });
    });

    const report = api.buildCategoryReport();
    assert.ok(report.weakest, 'no weakest area was named');
    assert.equal(report.weakest.code, 'automation');
    assert.equal(report.weakest.judged, true);
  } finally {
    Object.assign(app.state.filters, original);
    practice.results.clear();
  }
});

test('an area with too few attempts is not judged', () => {
  const practice = app.state.practice;
  try {
    practice.results.clear();
    const secure = app.state.questions
      .filter((q) => q.category && q.category.code === 'secure_environment')
      .filter(api.isScorable)
      .slice(0, 2);
    secure.forEach((question) => {
      practice.results.set(question.id, { selectedLabels: ['A'], isCorrect: false, graded: true });
    });

    const report = api.buildCategoryReport();
    const row = report.rows.find((r) => r.code === 'secure_environment');
    assert.equal(row.judged, false, 'two attempts were enough to judge an area');
    assert.equal(report.weakest, null, 'an unjudged area was named as the weakest');
  } finally {
    practice.results.clear();
  }
});

/* ------------------------------------------------------------------ */
/* the explanation gate                                                */
/* ------------------------------------------------------------------ */

test('the explanation stays shut until the question has been answered', () => {
  const questions = app.state.questions;
  const practice = app.state.practice;
  const originalMode = app.state.mode;

  // The case that used to leak: a question that has references, and whose
  // explanation names the correct answer in its first line. It must not
  // open before the student has answered.
  const withReferences = questions.find(
    (q) => api.isScorable(q) && (q.explanation.references || []).length > 0
  );
  assert.ok(withReferences, 'no scorable question with references to test');

  try {
    app.state.mode = 'practice';
    practice.results.clear();

    assert.equal(
      api.canShowExplanation(withReferences),
      false,
      'the explanation opened before the question was answered'
    );

    practice.results.set(withReferences.id, {
      selectedLabels: ['A'],
      isCorrect: true,
      graded: true,
    });
    assert.equal(
      api.canShowExplanation(withReferences),
      true,
      'the explanation did not open after the question was answered'
    );
  } finally {
    practice.results.clear();
    app.state.mode = originalMode;
  }
});

test('a question with no published key keeps its explanation open', () => {
  const questions = app.state.questions;
  const practice = app.state.practice;
  const originalMode = app.state.mode;

  try {
    app.state.mode = 'practice';
    practice.results.clear();

    // A question with no key can never be graded, so it never becomes
    // "answered". Its reference is the only teaching content it has, so
    // the explanation must stay open.
    const noKey = {
      id: 999001,
      type: 'single_choice',
      answer: { labels: [] },
      options: [{ label: 'A', text: 'Some option' }],
      explanation: {
        text: 'An explanation.',
        references: ['https://learn.microsoft.com/en-us/azure/azure-sql/'],
      },
    };
    assert.equal(api.isScorable(noKey), false, 'the synthetic question is scorable');
    assert.equal(
      api.canShowExplanation(noKey),
      true,
      'a question with no key lost its explanation'
    );

    // A lab task has no key either, and its walk-through is the answer.
    const labTask = questions.find((q) => q.type === 'simulation');
    assert.ok(labTask, 'no lab task in the bank');
    assert.equal(
      api.canShowExplanation(labTask),
      true,
      'a lab task lost its walk-through'
    );
  } finally {
    practice.results.clear();
    app.state.mode = originalMode;
  }
});

/* ------------------------------------------------------------------ */
/* the type filter                                                     */
/* ------------------------------------------------------------------ */

test('the type filter offers every type the bank holds', () => {
  const questions = app.state.questions;
  const { counts, types } = api.questionTypesInOrder(questions);

  // The filter used to list a fixed set of types, so a type the bank gained
  // later was unreachable: the per-statement questions could not be filtered
  // for at all. Every type the bank holds has to be offered.
  const inBank = [...new Set(questions.map((q) => q.type))];
  for (const type of inBank) {
    assert.ok(types.includes(type), `the type filter does not offer ${type}`);
  }

  // The count on each option is the count in the bank.
  for (const type of types) {
    assert.equal(counts.get(type), questions.filter((q) => q.type === type).length);
  }
});

test('no two question types share a name', () => {
  const { types } = api.questionTypesInOrder(app.state.questions);
  const names = types.map((type) => api.typeLabels[type] || type);

  // Two entries with the same name and different counts made the filter
  // unreadable: "Multiple choice (219)" and "Multiple choice (67)".
  assert.equal(
    new Set(names).size,
    names.length,
    `two question types share a name: ${names.join(', ')}`
  );
  assert.ok(
    names.every((name) => name && name.trim()),
    'a question type has no name'
  );
});

test('filtering by type reaches the per-statement questions', () => {
  const original = { ...app.state.filters };
  try {
    app.state.filters.type = 'statement';
    const statements = api.getFilteredQuestions();
    assert.equal(statements.length, 114);
    assert.ok(statements.every((q) => q.type === 'statement'));

    app.state.filters.type = 'multi_select';
    const multi = api.getFilteredQuestions();
    assert.equal(multi.length, 67);
    assert.ok(multi.every((q) => q.type === 'multi_select'));
  } finally {
    Object.assign(app.state.filters, original);
  }
});
