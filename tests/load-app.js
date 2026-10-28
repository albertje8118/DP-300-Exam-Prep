'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createSandbox } = require('./dom-stub');

const repoRoot = path.resolve(__dirname, '..');

/**
 * Load the shipped app into a sandbox and wait for it to load the bank.
 *
 * The tests run against `assets/app.js` as it ships, not against a copy, so
 * a change to the app that breaks the exam logic breaks the tests.
 */
async function loadApp() {
  const bank = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'questions.json'), 'utf8')
  );
  const sandbox = createSandbox(bank);
  const context = vm.createContext(sandbox);

  const source = fs.readFileSync(path.join(repoRoot, 'assets', 'app.js'), 'utf8');
  vm.runInContext(source, context, { filename: 'assets/app.js' });

  // The app loads the bank on start-up. Wait for it rather than calling
  // loadBank() again, so the tests see exactly what a browser would.
  const deadline = Date.now() + 20000;
  let count = 0;
  while (Date.now() < deadline) {
    count = vm.runInContext('state.questions.length', context);
    if (count > 0) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  if (!count) {
    throw new Error('the app did not load the question bank');
  }

  // `state` and `el` are `const` at the top level of the script, so they
  // live in the realm's lexical scope rather than on the global object.
  // Reading them out gives the tests the live objects.
  const state = vm.runInContext('state', context);
  const el = vm.runInContext('el', context);

  return { context, sandbox, state, el, bank };
}

/**
 * The app's own functions, taken from the loaded realm.
 *
 * A top-level `function` declaration does become a property of the global
 * object, so these are the real implementations.
 */
function appApi(context) {
  return {
    isScorable: context.isScorable,
    isCorrectSelection: context.isCorrectSelection,
    isStatementQuestion: context.isStatementQuestion,
    isMultiSelect: context.isMultiSelect,
    statementScore: context.statementScore,
    orderedSelection: context.orderedSelection,
    formatAnswer: context.formatAnswer,
    planExam: context.planExam,
    buildExam: context.buildExam,
    describeBlueprint: context.describeBlueprint,
    getFilteredQuestions: context.getFilteredQuestions,
    getVisibleQuestions: context.getVisibleQuestions,
    buildCategoryReport: context.buildCategoryReport,
    parseExamWeight: context.parseExamWeight,
    updateAnswerStateCounts: context.updateAnswerStateCounts,
    shuffle: context.shuffle,
  };
}

module.exports = { loadApp, appApi, repoRoot };
