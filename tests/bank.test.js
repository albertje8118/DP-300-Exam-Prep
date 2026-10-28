'use strict';

/**
 * The bank that is actually deployed.
 *
 * These checks run against the files the Pages workflow publishes, so a
 * broken image or a bank that does not match its own metadata is caught
 * before it reaches a student rather than after.
 *
 * Run with: node --test tests/
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { repoRoot } = require('./load-app');

const bank = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'questions.json'), 'utf8')
);

function collectImagePaths() {
  const paths = new Set();
  for (const question of bank.questions) {
    for (const image of question.question.images || []) {
      paths.add(image.path);
    }
    for (const option of question.options || []) {
      for (const image of option.images || []) {
        paths.add(image.path);
      }
    }
  }
  for (const scenario of bank.scenarios || []) {
    for (const image of scenario.images || []) {
      paths.add(image.path);
    }
  }
  return paths;
}

test('the bank matches its own metadata', () => {
  assert.equal(bank.metadata.total_questions, bank.questions.length);
  assert.equal(bank.metadata.authored.questions, bank.questions.filter((q) => q.authored).length);
});

test('every question has a unique id', () => {
  const ids = bank.questions.map((q) => q.id);
  const seen = new Set();
  const duplicates = [];
  for (const id of ids) {
    if (seen.has(id)) {
      duplicates.push(id);
    }
    seen.add(id);
  }
  assert.deepEqual(duplicates, []);
});

test('every question carries the fields the app relies on', () => {
  const broken = [];
  for (const question of bank.questions) {
    if (
      !question.id ||
      !question.type ||
      typeof question.topic_index !== 'number' ||
      !question.question ||
      typeof question.question.text !== 'string' ||
      !Array.isArray(question.options) ||
      !question.answer ||
      !Array.isArray(question.answer.labels) ||
      !question.explanation
    ) {
      broken.push(question.id);
    }
  }
  assert.deepEqual(broken, [], `these questions are missing a field: ${broken}`);
});

test('every referenced image is in the folder that gets deployed', () => {
  const missing = [];
  for (const imagePath of collectImagePaths()) {
    if (!fs.existsSync(path.join(repoRoot, imagePath))) {
      missing.push(imagePath);
    }
  }
  assert.deepEqual(missing, [], `these images are referenced but not on disk: ${missing}`);
});

test('the answer key of a published question is not an empty string', () => {
  const broken = [];
  for (const question of bank.questions) {
    if (question.answer.labels.some((label) => typeof label !== 'string' || !label.trim())) {
      broken.push(question.id);
    }
  }
  assert.deepEqual(broken, []);
});

test('a per-statement question has an answer for every statement', () => {
  const broken = [];
  for (const question of bank.questions) {
    if (question.type !== 'statement') {
      continue;
    }
    const statements = question.statements || [];
    const incomplete = statements.some(
      (statement) => !statement.answer || !(statement.options || []).length
    );
    if (!statements.length || incomplete) {
      broken.push(question.id);
    }
  }
  assert.deepEqual(broken, [], `these per-statement questions are incomplete: ${broken}`);
});
