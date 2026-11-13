'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./load-app');

/**
 * The "Check Answer" button.
 *
 * The button is the only way a student can score a per-statement question or
 * a multiple-answer question: picking an option only records the selection.
 * The test presses the button itself rather than calling the function behind
 * it, because the button is the thing the student presses - and a listener
 * that was never attached would leave the function perfectly testable and the
 * button completely dead.
 */

function openQuestion(context, state, question) {
  state.mode = 'practice';
  const visible = context.getVisibleQuestions();
  const index = visible.indexOf(question);
  assert.notEqual(index, -1, 'the question is in the visible list');
  state.currentIndex = index;
  context.renderQuestion();
  return question;
}

test('Check Answer scores a per-statement question', async () => {
  const { context, state, el } = await loadApp();
  const question = state.questions.find((q) => q.type === 'statement');
  openQuestion(context, state, question);

  question.statements.forEach((statement, index) => {
    context.handleStatementClick(question, index, statement.answer);
  });

  assert.equal(el.checkButton.hidden, false, 'the button is offered');
  assert.equal(el.checkButton.disabled, false, 'the button is live once every statement is answered');

  el.checkButton.click();

  const result = state.practice.results.get(question.id);
  assert.ok(result, 'the attempt was recorded');
  assert.equal(result.isCorrect, true, 'the attempt was graded');
  assert.equal(result.graded, true);
  assert.equal(el.feedbackBanner.hidden, false, 'the student is told the result');
  assert.match(el.feedbackBanner.textContent, /Correct/);
});

test('Check Answer scores a multiple-answer question', async () => {
  const { context, state, el } = await loadApp();
  const question = state.questions.find(
    (q) => q.type === 'multi_select' && !q.answer.ordered && q.answer.labels.length
  );
  openQuestion(context, state, question);

  for (const label of question.answer.labels) {
    context.handleOptionClick(question, label);
  }

  assert.equal(el.checkButton.disabled, false);
  el.checkButton.click();

  const result = state.practice.results.get(question.id);
  assert.ok(result, 'the attempt was recorded');
  assert.equal(result.isCorrect, true, 'the attempt was graded');
  assert.match(el.feedbackBanner.textContent, /Correct/);
});

test('a wrong answer is graded as wrong and says so', async () => {
  const { context, state, el } = await loadApp();
  const question = state.questions.find((q) => q.type === 'statement');
  openQuestion(context, state, question);

  const wrong = question.statements.map((statement) => {
    const other = (statement.options || []).find((option) => option.label !== statement.answer);
    return other ? other.label : statement.answer;
  });
  wrong.forEach((label, index) => {
    context.handleStatementClick(question, index, label);
  });

  el.checkButton.click();

  const result = state.practice.results.get(question.id);
  assert.ok(result, 'the attempt was recorded');
  assert.equal(result.isCorrect, false, 'the attempt was graded as wrong');
  assert.match(el.feedbackBanner.textContent, /Wrong/);
});

/**
 * A half-answered per-statement question must not be gradable.
 *
 * Grading locks the question: the options go dead, the selection cannot be
 * cleared, and the attempt is recorded as a wrong answer. A student who
 * pressed the button one statement early would be stuck with a verdict they
 * never had the chance to earn, and the only way out is Reset Practice - which
 * throws away every other attempt in the bank.
 */
test('Check Answer stays disabled until every statement is answered', async () => {
  const { context, state, el } = await loadApp();
  const question = state.questions.find(
    (q) => q.type === 'statement' && (q.statements || []).length > 1
  );
  openQuestion(context, state, question);

  context.handleStatementClick(question, 0, question.statements[0].answer);

  assert.equal(
    el.checkButton.disabled,
    true,
    'a question with an unanswered statement cannot be graded'
  );

  el.checkButton.click();
  assert.equal(
    state.practice.results.has(question.id),
    false,
    'nothing is recorded for a half-answered question'
  );

  question.statements
    .slice(1)
    .forEach((statement, index) => {
      context.handleStatementClick(question, index + 1, statement.answer);
    });

  assert.equal(el.checkButton.disabled, false, 'the button comes alive once the question is complete');
  el.checkButton.click();

  const result = state.practice.results.get(question.id);
  assert.ok(result, 'the attempt was recorded once every statement was answered');
  assert.equal(result.isCorrect, true, 'the attempt was graded');
});
