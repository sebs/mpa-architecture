import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { TestHelper } from 'banira';

const code = await readFile(new URL('../../components/cart-view.js', import.meta.url), 'utf8');

async function mount() {
  const context = await new TestHelper().mountAsScript('cart-view', code);
  return { context, el: context.document.querySelector('cart-view') };
}

const item = (id, name, price, quantity) => ({
  product: { id, name, description: '', price, category: 'c' },
  quantity,
});

test('renders an empty state without items', async () => {
  const { el } = await mount();
  assert.match(el.innerHTML, /Your cart is empty/);
});

test('renders rows with line totals and a grand total', async () => {
  const { el } = await mount();
  el.items = [item('p1', 'Espresso Cup', 900, 2), item('p2', 'Notebook A5', 700, 1)];
  assert.equal(el.querySelectorAll('tbody tr').length, 2);
  const lineTotals = [...el.querySelectorAll('tbody tr')].map((row) => row.querySelectorAll('data')[1].textContent);
  assert.deepEqual(lineTotals, ['€18.00', '€7.00']);
  assert.equal(el.querySelector('tfoot data').textContent, '€25.00');
});

test('emits quantity-change with clamped integer quantity', async () => {
  const { context, el } = await mount();
  el.items = [item('p1', 'Espresso Cup', 900, 2)];
  let detail = null;
  el.addEventListener('quantity-change', (event) => {
    detail = event.detail;
  });

  const input = el.querySelector('input[data-id="p1"]');
  input.value = '3';
  input.dispatchEvent(new context.window.Event('change', { bubbles: true }));
  assert.equal(detail.productId, 'p1');
  assert.equal(detail.quantity, 3);

  input.value = '-2';
  input.dispatchEvent(new context.window.Event('change', { bubbles: true }));
  assert.equal(detail.quantity, 0);
});

test('emits remove-item on remove button click', async () => {
  const { el } = await mount();
  el.items = [item('p1', 'Espresso Cup', 900, 1)];
  let detail = null;
  el.addEventListener('remove-item', (event) => {
    detail = event.detail;
  });
  el.querySelector('button[data-remove="p1"]').click();
  assert.equal(detail.productId, 'p1');
});
