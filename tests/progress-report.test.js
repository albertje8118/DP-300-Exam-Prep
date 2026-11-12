'use strict';

/**
 * The practice progress report.
 *
 * The report tells a student two different things - how far through the
 * bank they are, and how well they are doing - and it used to mix them
 * into one line. "4 graded of 422 questions" sits beside "25% overall",
 * so the same number reads as progress and as a score at the same time.
 * A student who answered four questions and got one right saw "1" and
 * read it as "one done".
 *
 * These tests pin the wording down. A report that quietly changes what
 * it claims is worse than one that is plainly wrong: "0% correct" is
 * read as "I know nothing about this area", not as "I have three data
 * points".
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp, appApi } = require('./load-app');

let app;
let api;
let state;

test.before(async () => {
  app = await loadApp();
  api = appApi(app.context);
  state = app.state;
});

test.beforeEach(() => {
  state.practice.results.clear();
});

/** Record an attempt on a question. */
function attempt(question, isCorrect, graded = true) {
  state.practice.results.set(question.id, {
    selectedLabels: [],
    isCorrect: graded ? isCorrect : null,
    graded,
  });
}

/** The questions of one exam category. */
function questionsIn(categoryCode) {
  return state.questions.filter(
    (question) => question.category && question.category.code === categoryCode
  );
}

/** An exam category by its short name. */
function categoryNamed(shortName) {
  const category = state.bank.metadata.categories.find(
    (entry) => entry.short_name === shortName
  );
  assert.ok(category, `the bank has a "${shortName}" category`);
  return category;
}

/* ------------------------------------------------------------------ */
/* the headline                                                        */
/* ------------------------------------------------------------------ */

test('the headline leads with progress, not a score', () => {
  const headline = api.describePracticeHeadline(4, 422);
  assert.equal(headline, 'Practice — 4 of 422 attempted');
  assert.ok(!headline.includes('%'), 'the headline must not carry a percentage');
});

test('the headline counts attempts, not correct answers', () => {
  // Four questions answered, one of them right. The headline reports the
  // four, because that is the progress; the score lives on its own line.
  assert.equal(api.describePracticeHeadline(4, 422), 'Practice — 4 of 422 attempted');
});

/* ------------------------------------------------------------------ */
/* the score line                                                      */
/* ------------------------------------------------------------------ */

test('the score line shows the count and the percentage', () => {
  assert.equal(api.describePracticeScore(4, 1), '1 of 4 correct so far (25%)');
});

test('the score line drops the percentage below the threshold', () => {
  assert.equal(api.describePracticeScore(2, 1), '1 of 2 correct so far');
  assert.equal(api.describePracticeScore(1, 0), '0 of 1 correct so far');
});

test('the score line uses the same threshold as the area rows', () => {
  // The headline used to publish a percentage with no guard at all, while
  // every area below it refused to show a score on the same evidence.
  assert.equal(api.reportMinAttempts, 3);
  assert.equal(
    api.describePracticeScore(api.reportMinAttempts - 1, 1),
    '1 of 2 correct so far'
  );
  assert.equal(
    api.describePracticeScore(api.reportMinAttempts, 1),
    '1 of 3 correct so far (33%)'
  );
});

/* ------------------------------------------------------------------ */
/* one area's row                                                      */
/* ------------------------------------------------------------------ */

test('an area row shows the count beside the percentage', () => {
  const row = { accuracy: 0, graded: 3, correct: 0, attempted: 3, judged: true };
  assert.equal(api.describeAreaScore(row), '0% (0 of 3)');
});

test('an area row below the threshold shows the count alone', () => {
  const row = { accuracy: 0.5, graded: 2, correct: 1, attempted: 2, judged: false };
  assert.equal(api.describeAreaScore(row), '1 of 2 so far');
});

test('an area row that was never answered says so', () => {
  const row = { accuracy: null, graded: 0, correct: 0, attempted: 0, judged: false };
  assert.equal(api.describeAreaScore(row), 'not started');
});

/* ------------------------------------------------------------------ */
/* the weak-area lead                                                  */
/* ------------------------------------------------------------------ */

test('the weak-area lead is a lead, not a verdict', () => {
  const lead = api.describeWeakestArea({
    shortName: 'Secure environment',
    correct: 0,
    graded: 5,
    total: 79,
    weightLabel: '20–25%',
  });
  assert.match(lead, /looks weak/);
  assert.ok(
    !/weakest area/.test(lead),
    'it must not call itself the weakest area'
  );
  assert.match(lead, /0 of 5 correct so far/);
});

test('no area is called weak below the weak threshold', () => {
  const category = categoryNamed('Secure environment');
  questionsIn(category.code)
    .slice(0, api.reportWeakAttempts - 1)
    .forEach((question) => attempt(question, false));

  const report = api.buildCategoryReport();
  const row = report.rows.find((entry) => entry.code === category.code);
  assert.equal(row.graded, api.reportWeakAttempts - 1);
  assert.equal(row.judged, true, 'that is enough attempts to show a score');
  assert.equal(report.weakest, null, 'but not enough to call an area weak');
});

test('an area is called weak at the weak threshold', () => {
  const category = categoryNamed('Secure environment');
  questionsIn(category.code)
    .slice(0, api.reportWeakAttempts)
    .forEach((question) => attempt(question, false));

  const report = api.buildCategoryReport();
  assert.equal(report.weakest?.code, category.code);
});

test('the weak area is the largest weighted gap', () => {
  // Two areas, both all wrong, both with enough attempts. The one worth
  // more of the paper is the one worth drilling.
  const heavy = categoryNamed('Secure environment');
  const light = categoryNamed('Automation');
  const heavyWeight = api.parseExamWeight(heavy.weight);
  const lightWeight = api.parseExamWeight(light.weight);
  assert.ok(
    heavyWeight !== lightWeight,
    'the two categories must not weigh the same for this test to mean anything'
  );
  questionsIn(heavy.code)
    .slice(0, api.reportWeakAttempts)
    .forEach((question) => attempt(question, false));
  questionsIn(light.code)
    .slice(0, api.reportWeakAttempts)
    .forEach((question) => attempt(question, false));

  const report = api.buildCategoryReport();
  const expected = heavyWeight > lightWeight ? heavy.code : light.code;
  assert.equal(report.weakest?.code, expected);
});

/* ------------------------------------------------------------------ */
/* attempted vs graded                                                 */
/* ------------------------------------------------------------------ */

test('an unscorable attempt counts as attempted but not graded', () => {
  const category = categoryNamed('Secure environment');
  attempt(questionsIn(category.code)[0], null, false);

  const report = api.buildCategoryReport();
  const row = report.rows.find((entry) => entry.code === category.code);
  assert.equal(row.attempted, 1);
  assert.equal(row.graded, 0);
  assert.equal(row.correct, 0);
});

test('nothing the student reads calls an attempt "graded"', () => {
  // "Graded" means scorable in this app, and it was used for "answered"
  // in the headline. The export table keeps the word in its proper
  // sense; nothing on the practice screen should use it for progress.
  const strings = [
    api.describePracticeHeadline(4, 422),
    api.describePracticeScore(4, 1),
    api.describeAreaScore({
      accuracy: 0, graded: 3, correct: 0, attempted: 3, judged: true,
    }),
    api.describeAreaScore({
      accuracy: 0.5, graded: 2, correct: 1, attempted: 2, judged: false,
    }),
    api.describeWeakestArea({
      shortName: 'Secure environment',
      correct: 0, graded: 5, total: 79, weightLabel: '20–25%',
    }),
  ];
  for (const text of strings) {
    assert.ok(!/graded/i.test(text), `"graded" must not appear in: ${text}`);
  }
});

/* ------------------------------------------------------------------ */
/* what the student actually sees                                       */
/* ------------------------------------------------------------------ */

/** Render the report into the stub DOM and hand back what it says. */
function renderedReport() {
  const mode = state.mode;
  try {
    state.mode = 'practice';
    app.context.renderProgressReport();
    return {
      headline: app.el.reportHeadline.textContent,
      totals: app.el.reportTotals.textContent,
      lead: app.el.reportLead.textContent,
      drillHidden: app.el.reportDrill.hidden,
    };
  } finally {
    state.mode = mode;
  }
}

test('the report on screen leads with the questions attempted', () => {
  const category = categoryNamed('Secure environment');
  questionsIn(category.code)
    .slice(0, 4)
    .forEach((question, index) => attempt(question, index === 0));

  const shown = renderedReport();
  assert.equal(
    shown.headline,
    `Practice — 4 of ${state.questions.length} attempted`
  );
  // Four attempts is enough to stand behind a percentage, so the score
  // line carries both the count and the number.
  assert.equal(shown.totals, '1 of 4 correct so far (25%)');
});

test('the report on screen shows no percentage below the threshold', () => {
  const category = categoryNamed('Secure environment');
  questionsIn(category.code)
    .slice(0, api.reportMinAttempts - 1)
    .forEach((question, index) => attempt(question, index === 0));

  const shown = renderedReport();
  assert.equal(shown.headline, `Practice — 2 of ${state.questions.length} attempted`);
  assert.equal(shown.totals, '1 of 2 correct so far');
});

test('the report on screen names no weak area below the threshold', () => {
  const category = categoryNamed('Secure environment');
  questionsIn(category.code)
    .slice(0, api.reportWeakAttempts - 1)
    .forEach((question) => attempt(question, false));

  const shown = renderedReport();
  assert.match(shown.lead, /Answer 5 questions in one area/);
  assert.equal(shown.drillHidden, true);
});

test('the report on screen names the weak area once there is enough evidence', () => {
  const category = categoryNamed('Secure environment');
  questionsIn(category.code)
    .slice(0, api.reportWeakAttempts)
    .forEach((question) => attempt(question, false));

  const shown = renderedReport();
  assert.match(shown.lead, /Secure environment looks weak/);
  assert.match(shown.lead, /0 of 5 correct so far/);
  assert.equal(shown.drillHidden, false);
});
