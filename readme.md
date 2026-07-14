# Pure MPA

A website with a database. No frameworks, no build step.

HTML pages that link to each other. IndexedDB for data. Vanilla JS where needed. Service Worker for offline. Broadcast Channel to sync tabs.

This repository is the decision record for the architecture together with its reference implementation: a small shop with a products page and a cart page, the running example used throughout the ADRs.

## Decisions

| ADR | Decision |
|-----|----------|
| [001](adr/001.md) | Multi-Page Architecture |
| [002](adr/002.md) | Vanilla JavaScript only |
| [003](adr/003.md) | IndexedDB for storage |
| [004](adr/004.md) | Semantic HTML, classless CSS |
| [005](adr/005.md) | No build step |
| [006](adr/006.md) | Export/import for data durability |
| [007](adr/007.md) | Broadcast Channel for cross-tab sync |
| [008](adr/008.md) | Service Worker caching strategies |
| [009](adr/009.md) | URL parameters for navigation state |
| [010](adr/010.md) | Node.js test runner + jsdom |

## Structure

```
adr/               # Architecture decision records
example/           # Reference implementation
  index.html       # Entry page
  pages/           # HTML documents (products, cart)
  styles/          # Plain classless CSS
  components/      # Vanilla custom elements (product-list, cart-view)
  shared/          # ES modules shared across pages (db, products data, broadcast, url params, export)
  public/          # Manifest, icon, offline page
  sw.js            # Service worker; at the example's root so its scope covers all pages
  tests/           # node --test + jsdom + fake-indexeddb
```

## Run

No build step. Serve the example with any static file server:

```
cd example
npm run serve
```

Then open http://localhost:8080/.

Tests (Node 22+):

```
cd example
npm install
npm test
```

## License

Code is licensed under MIT ([LICENSE](LICENSE)). Documentation, including the ADRs, is licensed under CC-BY-4.0 ([LICENSE-docs](LICENSE-docs)).
