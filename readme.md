# Pure MPA

A website with a database. No frameworks, no build step.

HTML pages that link to each other. IndexedDB for data. Vanilla JS where needed. Service Worker for offline. Broadcast Channel to sync tabs.

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
