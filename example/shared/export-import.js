// Export/import for data durability (ADR-006). Human-readable JSON; the user
// controls the backup. DOM wiring (download link, file input) lives in pages.

import { getCartEntries, getProducts, replaceCart } from './db.js';

export const EXPORT_VERSION = 1;

export async function exportData() {
  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    cart: await getCartEntries(),
  };
}

export function serializeExport(data) {
  return JSON.stringify(data, null, 2);
}

export function parseImport(json) {
  let data;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('Import failed: file is not valid JSON.');
  }
  if (!data || data.version !== EXPORT_VERSION) {
    throw new Error(`Import failed: expected export version ${EXPORT_VERSION}.`);
  }
  if (!Array.isArray(data.cart)) {
    throw new Error('Import failed: missing cart data.');
  }
  for (const entry of data.cart) {
    if (
      !entry ||
      typeof entry !== 'object' ||
      typeof entry.productId !== 'string' ||
      !Number.isInteger(entry.quantity) ||
      entry.quantity < 1
    ) {
      throw new Error('Import failed: malformed cart entry.');
    }
  }
  return data;
}

export async function importData(json) {
  const data = parseImport(json);
  const known = new Set((await getProducts()).map((product) => product.id));
  const entries = data.cart.filter((entry) => known.has(entry.productId));
  await replaceCart(entries.map(({ productId, quantity }) => ({ productId, quantity })));
  return { data, imported: entries.length, skipped: data.cart.length - entries.length };
}
