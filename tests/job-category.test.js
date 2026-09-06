// Which bucket a job title lands in.
//
// The order of the rules is the whole design: a "data engineer" is data, not
// engineering, and a "sales engineer" sells. Those are the cases that break
// when someone adds a keyword in the wrong place.

import test from 'node:test';
import assert from 'node:assert/strict';

const { categorize } = await import('../src/lib/job-category.ts');

test('plain titles land where you would expect', () => {
  assert.equal(categorize('Senior Software Engineer'), 'engineering');
  assert.equal(categorize('Account Executive, Enterprise'), 'sales');
  assert.equal(categorize('Group Product Manager'), 'product');
  assert.equal(categorize('Staff Product Designer'), 'design');
  assert.equal(categorize('Growth Marketing Lead'), 'marketing');
  assert.equal(categorize('Warehouse Operations Associate'), 'operations');
});

test('the more specific category wins over the broader one', () => {
  // Both contain "engineer"; neither is engineering.
  assert.equal(categorize('Data Engineer'), 'data');
  assert.equal(categorize('Sales Engineer'), 'sales');
  // Contains "product" and "designer".
  assert.equal(categorize('Product Designer'), 'design');
});

test('a declared function fills in when the title says nothing', () => {
  assert.equal(categorize('Associate II'), 'other');
  assert.equal(categorize('Associate II', 'Finance'), 'finance');
});

test('short terms do not match inside longer words', () => {
  // " hr " must not match "chair", " ml " must not match "html".
  assert.notEqual(categorize('Chair Assembly Associate'), 'people');
  assert.notEqual(categorize('HTML Email Producer'), 'data');
});

test('punctuation between words does not hide a match', () => {
  assert.equal(categorize('Engineer (Backend)'), 'engineering');
  assert.equal(categorize('Marketing/Content'), 'marketing');
});
