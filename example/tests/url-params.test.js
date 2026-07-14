import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFilters, buildQuery } from '../shared/url-params.js';

test('parseFilters reads known keys', () => {
  assert.deepEqual(parseFilters('?category=kitchen&q=cup&sort=price-asc'), {
    category: 'kitchen',
    q: 'cup',
    sort: 'price-asc',
  });
});

test('parseFilters ignores unknown and empty parameters', () => {
  assert.deepEqual(parseFilters('?category=&utm_source=x&q=pen'), { q: 'pen' });
});

test('parseFilters handles empty search string', () => {
  assert.deepEqual(parseFilters(''), {});
});

test('buildQuery serializes only set filters', () => {
  assert.equal(buildQuery({ category: 'office', q: '' }), '?category=office');
});

test('buildQuery returns empty string for no filters', () => {
  assert.equal(buildQuery({}), '');
});

test('buildQuery encodes values', () => {
  assert.equal(buildQuery({ q: 'a b' }), '?q=a+b');
});

test('parse and build round-trip', () => {
  const filters = { category: 'home', q: 'wool blanket', sort: 'name-desc' };
  assert.deepEqual(parseFilters(buildQuery(filters)), filters);
});
