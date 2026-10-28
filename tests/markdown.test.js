'use strict';

/**
 * The explanation's markdown renderer.
 *
 * The explanation is written by a reviewer and shown to the student, so the
 * renderer has two jobs that pull against each other: show the formatting the
 * reviewer intended, and never let the text become markup. Both matter - a
 * missing `<ol>` shows a student "1." and "2." as plain text, and a renderer
 * that passes HTML through can put anything on the page.
 *
 * These tests run against the *shipped* `assets/app.js`, not a copy, so a
 * change that breaks the rendering breaks the tests.
 *
 * Run with: node --test "tests/*.test.js"
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

/** The visible text of a rendered node, with the markup flattened away. */
function textOf(node) {
  if (!node) {
    return '';
  }
  if (node.nodeType === 3) {
    return node.textContent;
  }
  return (node.children || []).map(textOf).join('');
}

/** Render markdown into a detached element and return it. */
function render(markdown) {
  const node = app.context.document.createElement('div');
  api.renderMarkdown(node, markdown, []);
  return node;
}

/** The tag names of a node's direct children. */
function childTags(node) {
  return (node.children || []).map((child) => child.tagName);
}

/** Every tag name in the tree, parents first. */
function allTags(node, found = []) {
  for (const child of node.children || []) {
    // A text node has no tag name.
    if (!child.tagName) {
      continue;
    }
    found.push(child.tagName);
    allTags(child, found);
  }
  return found;
}

/** The first node with this tag, anywhere in the tree. */
function findByTag(node, tag) {
  for (const child of node.children || []) {
    if (child.tagName === tag) {
      return child;
    }
    const deeper = findByTag(child, tag);
    if (deeper) {
      return deeper;
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* lists                                                               */
/* ------------------------------------------------------------------ */

test('a numbered list renders as an ordered list', () => {
  const node = render('**Steps**\n1. Create the logical server.\n2. Add the firewall rule.');

  const lists = node.children.filter((child) => child.tagName === 'OL');
  assert.equal(lists.length, 1, 'the steps did not become an ordered list');
  assert.equal(lists[0].children.length, 2, 'the ordered list has the wrong number of items');
  assert.equal(textOf(lists[0].children[0]), 'Create the logical server.');
  assert.equal(textOf(lists[0].children[1]), 'Add the firewall rule.');
});

test('the number is not repeated inside the item text', () => {
  // The renderer captures the digits separately from the text, so "1." must
  // not appear twice - once as the list marker and once in the item.
  const node = render('1. First step');
  const list = node.children.find((child) => child.tagName === 'OL');
  assert.equal(textOf(list.children[0]), 'First step');
  assert.ok(
    !textOf(list.children[0]).startsWith('1.'),
    'the number leaked into the item text'
  );
});

test('a bulleted list renders as an unordered list', () => {
  const node = render('- A option\n- B option');

  const lists = node.children.filter((child) => child.tagName === 'UL');
  assert.equal(lists.length, 1, 'the bullets did not become an unordered list');
  assert.equal(lists[0].children.length, 2);
  assert.equal(textOf(lists[0].children[0]), 'A option');
});

test('a bullet list and a numbered list are two different lists', () => {
  // The bug this catches: one list variable was reused for both kinds, so a
  // numbered line after a bullet line landed inside the bullet list and lost
  // its marker.
  const node = render('- A option\n1. First step\n- B option');

  const lists = node.children.filter(
    (child) => child.tagName === 'UL' || child.tagName === 'OL'
  );
  assert.equal(lists.length, 3, 'the list did not switch shape at each change');
  assert.deepEqual(
    lists.map((list) => list.tagName),
    ['UL', 'OL', 'UL'],
    'the list did not switch shape at each change'
  );
  assert.equal(textOf(lists[1].children[0]), 'First step');
});

/* ------------------------------------------------------------------ */
/* inline markup                                                       */
/* ------------------------------------------------------------------ */

test('bold text renders as a strong element', () => {
  const node = render('**Correct answer: B**');
  const strong = findByTag(node, 'STRONG');
  assert.ok(strong, 'the bold text did not become a strong element');
  assert.equal(textOf(strong), 'Correct answer: B');
});

test('a link renders as an anchor with the target and the label', () => {
  const node = render('See [the docs](https://learn.microsoft.com/en-us/azure/azure-sql/).');
  const link = findByTag(node, 'A');
  assert.ok(link, 'the link did not become an anchor');
  assert.equal(link.href, 'https://learn.microsoft.com/en-us/azure/azure-sql/');
  assert.equal(textOf(link), 'the docs');
  assert.equal(link.target, '_blank');
  assert.equal(link.rel, 'noopener noreferrer');
});

test('a link that is not http(s) stays plain text', () => {
  const node = render('Click [here](javascript:alert(1)).');
  assert.equal(findByTag(node, 'A'), null, 'a non-http link became an anchor');
  assert.ok(textOf(node).includes('here'), 'the label was lost');
});

/* ------------------------------------------------------------------ */
/* safety                                                              */
/* ------------------------------------------------------------------ */

test('markup in the explanation stays text', () => {
  const node = render('<img src=x onerror="alert(1)"> and <b>bold</b>');

  // The tree must contain only what the renderer creates. An IMG or a B would
  // mean the text became markup.
  const tags = allTags(node);
  assert.ok(!tags.includes('IMG'), 'an img element was created from the text');
  assert.ok(!tags.includes('B'), 'a b element was created from the text');
  assert.ok(
    textOf(node).includes('<img src=x'),
    'the literal text was lost'
  );
  assert.ok(textOf(node).includes('onerror'), 'the literal text was lost');
});

test('a script tag in the explanation stays text', () => {
  const node = render('<script>alert(1)</script>');
  const tags = allTags(node);
  assert.ok(!tags.includes('SCRIPT'), 'a script element was created from the text');
  assert.equal(tags.length, 1, 'the tree has more than the one paragraph');
  assert.equal(tags[0], 'P');
});

/* ------------------------------------------------------------------ */
/* the shape of the whole explanation                                   */
/* ------------------------------------------------------------------ */

test('the explanation template renders as paragraphs, a heading and a list', () => {
  // The exact shape reviews/schema.md asks for.
  const node = render(
    [
      '**Correct answer: B - Create an additional schema and grant ddl_admin.**',
      '',
      'The requirement is that the analyst cannot alter the schema.',
      '',
      '**Why not the others**',
      '- A - Grants read access only.',
      '- C - Removes the schema entirely.',
    ].join('\n')
  );

  const tags = childTags(node);
  assert.equal(tags[0], 'P', 'the answer line is not a paragraph');
  assert.equal(tags[tags.length - 1], 'UL', 'the "why not" lines are not a list');
  assert.ok(textOf(node).includes('Correct answer: B'), 'the answer is missing');
  assert.ok(!textOf(node).includes('**'), 'a bold marker was left in the text');
});
