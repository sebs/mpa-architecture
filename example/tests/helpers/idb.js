// IndexedDB test helper: gives each test a fresh in-memory database by
// closing the cached connection and swapping in a new fake-indexeddb factory.

import { IDBFactory } from 'fake-indexeddb';
import { closeDB } from '../../shared/db.js';

export async function freshDB() {
  await closeDB();
  globalThis.indexedDB = new IDBFactory();
}
