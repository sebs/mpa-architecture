import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { TestHelper } from 'banira';

const code = await readFile(new URL('../../components/product-list.js', import.meta.url), 'utf8');

async function mount() {
  const context = await new TestHelper().mountAsScript('product-list', code);
  return { context, el: context.document.querySelector('product-list') };
}

const product = (overrides = {}) => ({
  id: 'p1',
  name: 'Espresso Cup',
  description: 'Thick-walled ceramic cup.',
  price: 900,
  category: 'kitchen',
  ...overrides,
});

test('renders an empty state without products', async () => {
  const { el } = await mount();
  assert.match(el.innerHTML, /No products match/);
});

test('renders one article per product with name, price, and button', async () => {
  const { el } = await mount();
  el.products = [product(), product({ id: 'p2', name: 'French Press', price: 2400 })];
  assert.equal(el.querySelectorAll('li article').length, 2);
  assert.equal(el.querySelector('h2').textContent, 'Espresso Cup');
  assert.equal(el.querySelector('data').textContent, '€9.00');
  assert.ok(el.querySelector('button[data-id="p2"]'));
});

test('escapes markup in product fields', async () => {
  const { el } = await mount();
  el.products = [product({ name: '<img src=x>', description: '<script>alert(1)</script>' })];
  assert.equal(el.querySelector('h2').textContent, '<img src=x>');
  assert.equal(el.querySelector('img'), null);
  assert.equal(el.querySelector('script'), null);
});

test('emits add-to-cart with the product id on button click', async () => {
  const { el } = await mount();
  el.products = [product()];
  let detail = null;
  el.addEventListener('add-to-cart', (event) => {
    detail = event.detail;
  });
  el.querySelector('button[data-id="p1"]').click();
  assert.equal(detail.productId, 'p1');
});
