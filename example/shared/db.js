// IndexedDB wrapper (ADR-003). Native API first, thin promise helpers only.
// indexedDB is resolved at call time so tests can swap in fake-indexeddb.

const DB_NAME = 'mpa-shop';
const DB_VERSION = 1;

let dbPromise = null;

function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export function openDB() {
  if (dbPromise) return dbPromise;
  const request = globalThis.indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains('products')) {
      const products = db.createObjectStore('products', { keyPath: 'id' });
      products.createIndex('category', 'category');
    }
    if (!db.objectStoreNames.contains('cart')) {
      db.createObjectStore('cart', { keyPath: 'productId' });
    }
  };
  dbPromise = promisify(request);
  return dbPromise;
}

export async function closeDB() {
  if (!dbPromise) return;
  const db = await dbPromise.catch(() => null);
  if (db) db.close();
  dbPromise = null;
}

export async function seedProducts(products) {
  const db = await openDB();
  const tx = db.transaction('products', 'readwrite');
  const store = tx.objectStore('products');
  const count = await promisify(store.count());
  if (count === 0) {
    for (const product of products) store.put(product);
  }
  await transactionDone(tx);
}

export async function getProducts(filters = {}) {
  const db = await openDB();
  const store = db.transaction('products').objectStore('products');
  let products = await promisify(store.getAll());

  if (filters.category) {
    products = products.filter((p) => p.category === filters.category);
  }
  if (filters.q) {
    const q = filters.q.toLowerCase();
    products = products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    );
  }
  const sorters = {
    'name-asc': (a, b) => a.name.localeCompare(b.name),
    'name-desc': (a, b) => b.name.localeCompare(a.name),
    'price-asc': (a, b) => a.price - b.price,
    'price-desc': (a, b) => b.price - a.price,
  };
  products.sort(sorters[filters.sort] || sorters['name-asc']);
  return products;
}

export async function getCategories() {
  const db = await openDB();
  const store = db.transaction('products').objectStore('products');
  const products = await promisify(store.getAll());
  return [...new Set(products.map((p) => p.category))].sort();
}

export async function getCartEntries() {
  const db = await openDB();
  const store = db.transaction('cart').objectStore('cart');
  return promisify(store.getAll());
}

export async function getCartItems() {
  const db = await openDB();
  const tx = db.transaction(['cart', 'products']);
  const entries = await promisify(tx.objectStore('cart').getAll());
  const products = tx.objectStore('products');
  const items = await Promise.all(
    entries.map(async (entry) => ({
      product: await promisify(products.get(entry.productId)),
      quantity: entry.quantity,
    }))
  );
  return items.filter((item) => item.product);
}

export async function getCartCount() {
  const entries = await getCartEntries();
  return entries.reduce((sum, entry) => sum + entry.quantity, 0);
}

export async function addToCart(productId, quantity = 1) {
  const db = await openDB();
  const tx = db.transaction('cart', 'readwrite');
  const store = tx.objectStore('cart');
  const existing = await promisify(store.get(productId));
  store.put({ productId, quantity: (existing ? existing.quantity : 0) + quantity });
  await transactionDone(tx);
}

export async function setCartQuantity(productId, quantity) {
  const db = await openDB();
  const tx = db.transaction('cart', 'readwrite');
  const store = tx.objectStore('cart');
  if (quantity > 0) {
    store.put({ productId, quantity });
  } else {
    store.delete(productId);
  }
  await transactionDone(tx);
}

export async function removeFromCart(productId) {
  return setCartQuantity(productId, 0);
}

export async function replaceCart(entries) {
  const db = await openDB();
  const tx = db.transaction('cart', 'readwrite');
  const store = tx.objectStore('cart');
  store.clear();
  for (const entry of entries) store.put(entry);
  await transactionDone(tx);
}
