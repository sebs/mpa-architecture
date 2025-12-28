# Pure MPA with DuckDB

> A True Web Architecture

## Philosophy

This architecture embraces the web platform as it was designed. We are not building an application that emulates native software. We are building a website that happens to have a database.

The modern web platform provides everything needed for sophisticated, offline-capable, data-rich websites without frameworks, build steps, or architectural compromises. This document describes how to combine these capabilities into a coherent whole.

### Core Principles

**Work with the browser, not against it.** The browser provides navigation, history, caching, rendering, and accessibility. These are features, not obstacles to overcome.

**Pages are documents.** Each page is a complete, self-contained HTML document. Pages link to other pages. This is the web's fundamental model and it works.

**Semantic HTML is the design language.** Structure conveys meaning. Elements have purpose. CSS styles elements, not arbitrary class names.

**Progressive enhancement, not application shells.** The page loads and works. JavaScript adds capabilities. Nothing requires a loading spinner to display content.

**URLs are the API.** Navigation state lives in the URL. Bookmarks work. Sharing works. The back button works.

---

## Architecture Overview

The architecture consists of three layers that build upon each other. Each layer is optional—a simpler site might use only the first layer, while a full offline-capable application uses all three.

### Layer 1: Document Delivery

The foundation is a Multi-Page Application in the traditional sense. The browser handles routing through native link navigation. Each HTML page is independent and complete. Full page loads are the expected and normal behavior. All pages are indexable by search engines without special consideration.

This layer requires no JavaScript. It is the baseline experience.

### Layer 2: Data and Coordination

DuckDB running in WebAssembly provides a complete SQL database engine in the browser. This enables complex queries, joins, aggregations, and indexes without any server connection.

Four communication channels enable coordination across the application:

1. URL parameters carry shareable, bookmarkable state
2. DuckDB queries retrieve and manipulate structured data
3. Broadcast Channel API synchronizes state across browser tabs
4. Service Worker manages caching and offline behavior

### Layer 3: Offline Capability

Service Worker intercepts network requests and serves cached resources when offline. Web App Manifest enables installation to the home screen. DuckDB persistence to IndexedDB preserves the database across sessions and browser restarts.

---

## Data Architecture

### DuckDB in the Browser

DuckDB-WASM brings a production-grade analytical database engine to the browser. Unlike IndexedDB's awkward cursor-based API or localStorage's string-only storage, DuckDB provides genuine SQL capabilities.

The database engine runs entirely in browser memory. Tables, indexes, and query execution happen locally with no network latency. The complete database can be serialized and stored in IndexedDB for persistence across sessions.

### What DuckDB Enables

**Complex queries.** Filter, sort, paginate, and search across thousands of records using standard SQL. No need to load all data into JavaScript arrays and filter manually.

**Relational data.** Join tables together. A products table relates to a categories table relates to a reviews table. Query across all of them in a single statement.

**Aggregations.** Count, sum, average, group by, having clauses. Generate reports and summaries directly from the data.

**Indexes.** Create indexes on frequently queried columns. Large datasets remain fast to query.

**Transactions.** ACID guarantees ensure data consistency even when operations fail partway through.

**No server required.** The database exists entirely in the browser. Network connectivity is optional.

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser Memory                           │
│                                                              │
│    ┌────────────────────────────────────────────────────┐   │
│    │              DuckDB Instance                        │   │
│    │                                                     │   │
│    │    Tables ─── Indexes ─── Query Engine              │   │
│    │                                                     │   │
│    └────────────────────────────────────────────────────┘   │
│                           │                                  │
│                           │ Serialize/Restore                │
│                           ▼                                  │
│    ┌────────────────────────────────────────────────────┐   │
│    │              IndexedDB Storage                      │   │
│    │                                                     │   │
│    │    Persisted database file (binary)                 │   │
│    │                                                     │   │
│    └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Persistence Strategy

The DuckDB instance lives in memory during page lifetime. Before the page unloads or at strategic save points, the database serializes to a binary format and stores in IndexedDB. On page load, the system checks for an existing backup and restores it before accepting queries.

IndexedDB provides generous storage limits measured in gigabytes, far exceeding localStorage's 5MB restriction. The serialized format is compact and restores quickly.

---

## Communication Channels

Four distinct channels serve different purposes in coordinating state across the application.

### Channel 1: URL Parameters

URL parameters carry navigation and filter state. They are visible to users, work with bookmarks, and enable sharing specific views.

```
/products?category=electronics&sort=price&page=2
```

**Scope:** Single page load
**Persistence:** None unless bookmarked
**Use cases:** Filtering, sorting, pagination, search terms, view configuration

URL parameters are the primary mechanism for capturing "where am I and what am I looking at" state. Any state that should survive a page refresh or be shareable belongs in the URL.

### Channel 2: DuckDB Queries

DuckDB serves as the primary data store. All structured data lives in tables. Queries retrieve exactly the data needed for the current view.

**Scope:** Current browser session (or persistent if backed up)
**Persistence:** IndexedDB backup
**Use cases:** Product catalogs, user preferences, cart contents, application data

The query interface replaces what would traditionally require API calls to a server. Instead of fetching data over the network, the page queries the local database directly.

### Channel 3: Broadcast Channel API

Broadcast Channel enables real-time communication between browser tabs of the same origin. When one tab modifies data, it broadcasts a message. Other tabs receive the message and update accordingly.

**Scope:** All tabs of the same origin
**Persistence:** None (messages are ephemeral)
**Use cases:** Cart synchronization, preference changes, data updates, logout propagation

Example scenario: A user has the products page open in one tab and the cart page in another. They add an item to the cart from the products page. The products page broadcasts "item added to cart" message. The cart page receives the message, queries DuckDB for the updated cart, and re-renders.

### Channel 4: Service Worker

Service Worker operates as a proxy between the page and the network. It intercepts fetch requests and decides whether to serve from cache or network.

**Scope:** Entire application
**Persistence:** Cache Storage API
**Use cases:** Offline support, asset caching, background synchronization

The Service Worker caches HTML pages, CSS files, JavaScript modules, and the DuckDB WASM binary. When offline, it serves cached versions. When online, it can update caches in the background.

---

## Page State Protocol

Each page follows a consistent initialization sequence to restore state and prepare for interaction.

### Initialization Sequence

```
Page Load Begins
       │
       ▼
┌──────────────────────────────────────┐
│  1. Restore DuckDB from IndexedDB    │
│     (or initialize empty database)   │
└──────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  2. Parse URL parameters             │
│     (extract filter/sort/page state) │
└──────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  3. Execute DuckDB queries           │
│     (based on URL parameters)        │
└──────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  4. Render page content              │
│     (populate HTML with data)        │
└──────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  5. Subscribe to Broadcast Channel   │
│     (listen for cross-tab updates)   │
└──────────────────────────────────────┘
       │
       ▼
Page Ready for Interaction
```

### State Responsibilities

**URL owns:** Current view configuration, filters, pagination, anything shareable

**DuckDB owns:** Persistent data, relational information, anything queryable

**Broadcast Channel owns:** Real-time synchronization, cross-tab notifications

**Service Worker owns:** Caching strategy, offline behavior, network interception

Each system has clear boundaries. State does not duplicate across systems unnecessarily.

---

## Semantic HTML and Classless CSS

### The Principle

HTML elements have meaning. An `<article>` is a self-contained composition. A `<nav>` contains navigation links. A `<table>` displays tabular data. A `<form>` collects user input.

CSS styles these elements directly. Instead of inventing class names that describe appearance, we use HTML elements that describe purpose.

### Structure as Styling Hook

```
Traditional Approach (Class-Based)

<div class="card card-primary card-shadow">
  <div class="card-header">
    <span class="title title-lg">Product</span>
  </div>
  <div class="card-body">
    <p class="text-muted">Description here</p>
  </div>
</div>

───────────────────────────────────────────

Semantic Approach (Element-Based)

<article>
  <header>
    <h2>Product</h2>
  </header>
  <p>Description here</p>
</article>
```

The semantic version uses fewer elements, requires no class names, and conveys meaning to assistive technologies. CSS targets the elements directly: `article`, `article > header`, `article h2`, `article p`.

### CSS Organization

Three stylesheet layers handle different concerns:

**Base styles** establish typography, box model normalization, and sensible defaults for all elements. Links, headings, paragraphs, and images receive baseline treatment.

**Layout styles** define page structure using CSS Grid or Flexbox. The body element arranges header, main, and footer. The main element constrains content width.

**Component styles** target semantic elements in context. Articles, tables, forms, dialogs, details/summary, and navigation receive specific treatment based on their role.

### Available Semantic Elements

The HTML specification provides rich vocabulary for content structure:

**Sectioning:** `<article>`, `<section>`, `<nav>`, `<aside>`, `<header>`, `<footer>`, `<main>`

**Content:** `<h1>`–`<h6>`, `<p>`, `<ul>`, `<ol>`, `<dl>`, `<figure>`, `<figcaption>`, `<blockquote>`

**Tables:** `<table>`, `<thead>`, `<tbody>`, `<tfoot>`, `<tr>`, `<th>`, `<td>`, `<caption>`

**Forms:** `<form>`, `<fieldset>`, `<legend>`, `<label>`, `<input>`, `<select>`, `<textarea>`, `<button>`

**Interactive:** `<details>`, `<summary>`, `<dialog>`

**Inline:** `<a>`, `<strong>`, `<em>`, `<code>`, `<time>`, `<mark>`, `<abbr>`

### When Differentiation is Needed

For cases where element context alone cannot distinguish variants:

**Attribute selectors** handle state variations. A disabled button, an invalid input, or a featured article can be styled using attributes: `button[disabled]`, `input[aria-invalid="true"]`, `article[data-featured]`.

**Parent context** distinguishes usage. Navigation links differ from article links: `nav a` versus `article a`.

**Custom elements** serve truly unique components. If standard HTML elements cannot express the concept, a custom element like `<product-card>` provides a semantic hook without class name proliferation.

### Benefits

**Accessibility.** Screen readers understand semantic elements. No ARIA roles needed when the correct element is used.

**Maintainability.** Changes to article styling automatically apply everywhere articles appear. No hunting for scattered class names.

**Reduced specificity wars.** Element selectors have low specificity. Contextual selectors remain manageable.

**Smaller stylesheets.** No utility class explosion. No repetition of the same properties across dozens of classes.

**Self-documenting HTML.** Reading the HTML reveals the document structure. No mental translation from class names to meaning.

---

## Service Worker Strategy

### Lifecycle

**Installation** caches critical assets: HTML pages, CSS files, JavaScript modules, the DuckDB WASM binary, and an offline fallback page.

**Activation** cleans up old cache versions and claims control of open pages.

**Fetch interception** routes requests through the caching strategy appropriate to each resource type.

### Caching Strategies by Resource Type

**HTML pages** use network-first strategy. Try the network for fresh content. If network fails, serve from cache. If not cached, show offline page. Update cache in background when network succeeds.

**CSS and JavaScript** use cache-first with version invalidation. Serve cached version immediately for fast loads. New deployments use new cache keys, forcing fresh fetches.

**DuckDB WASM binary** caches aggressively. The binary is large and changes infrequently. Cache forever and only re-download on explicit version updates.

**Images and static assets** use cache-first. Serve immediately from cache if available. Fetch and cache on first request.

### Offline Experience

When completely offline, cached pages load normally. DuckDB queries work against the persisted local database. Users can browse, search, filter, and modify data. Changes persist to IndexedDB.

When connectivity returns, the application can optionally synchronize changes with a remote server if one exists.

---

## Cross-Tab Synchronization

### The Problem

Each browser tab runs independently. If a user modifies data in one tab, other tabs become stale. Without coordination, tabs show inconsistent views of the same data.

### The Solution

Broadcast Channel API provides a pub/sub mechanism for same-origin tabs. Tabs subscribe to a named channel. Any tab can broadcast messages. All other tabs receive those messages and can react accordingly.

### Synchronization Pattern

When a tab modifies data:
1. Execute the DuckDB write operation
2. Broadcast a message describing the change
3. Persist DuckDB to IndexedDB

When a tab receives a broadcast:
1. Re-query affected data from DuckDB
2. Update the DOM to reflect new state

This pattern ensures all tabs see consistent data without requiring the broadcasting tab to serialize full state.

### Message Types

Messages describe what changed, not the full new state:

- Item added to cart (with item ID)
- Product updated (with product ID)
- User preference changed (with preference key)
- Session ended (trigger cleanup in all tabs)

Receiving tabs fetch fresh data rather than applying deltas directly. This avoids complex state reconciliation logic.

---

## Project Structure

```
project/
│
├── pages/
│   ├── index.html
│   ├── products.html
│   ├── product-detail.html
│   ├── cart.html
│   ├── checkout.html
│   └── offline.html
│
├── styles/
│   ├── base.css
│   ├── layout.css
│   └── components.css
│
├── shared/
│   ├── db.js
│   ├── state.js
│   ├── broadcast.js
│   └── persist.js
│
├── page-scripts/
│   ├── products.js
│   ├── product-detail.js
│   ├── cart.js
│   └── checkout.js
│
├── public/
│   ├── manifest.json
│   ├── sw.js
│   ├── favicon.ico
│   └── icons/
│
├── tests/
│   ├── db.test.js
│   ├── state.test.js
│   ├── broadcast.test.js
│   └── integration.test.js
│
└── package.json
```

### Directory Purposes

**pages/** contains complete HTML documents. Each page includes its own script tag pointing to its specific behavior file.

**styles/** contains plain CSS files. No preprocessors. No CSS-in-JS. Three files cover base, layout, and components.

**shared/** contains JavaScript modules used across multiple pages. Database initialization, state management, broadcast channel handling, and persistence logic.

**page-scripts/** contains page-specific behavior. Each script imports shared modules and implements that page's functionality.

**public/** contains static assets served directly. The service worker, manifest, and icons.

**tests/** contains tests runnable via Node.js test runner with jsdom for DOM simulation.

---

## Testing Strategy

### Test Categories

**Database tests** verify DuckDB initialization, schema creation, query execution, transaction handling, and persistence/restore cycles.

**State tests** verify URL parameter parsing, state merging, and proper separation of concerns between URL state and database state.

**Broadcast tests** verify message sending, receiving, multiple listener handling, and channel cleanup.

**Integration tests** verify full page initialization sequences, cross-tab synchronization scenarios, and offline/online transitions.

### Testing Environment

Node.js test runner provides the test harness. jsdom simulates browser DOM APIs. DuckDB-WASM runs in Node.js for database testing. Mock implementations stand in for browser-specific APIs like Broadcast Channel and Service Worker where needed.

---

## Benefits

| Aspect | Benefit |
|--------|---------|
| Search engine optimization | Native HTML pages index without special tooling |
| Performance | No framework runtime overhead |
| Offline capability | Full functionality without network |
| Installation | Appears in app launchers on mobile and desktop |
| Data operations | SQL queries, joins, aggregations locally |
| Scalability | DuckDB handles large datasets with indexes |
| Accessibility | Semantic HTML works with assistive technology |
| Maintainability | Plain HTML, CSS, JavaScript—no build step required |
| Browser compatibility | Relies on stable, well-supported APIs |
| Debuggability | View source works. Network tab shows real requests. |

---

## Limitations and Mitigations

| Limitation | Mitigation |
|------------|------------|
| No shared JavaScript context across pages | Broadcast Channel coordinates state changes |
| DuckDB WASM file size (several megabytes) | Service Worker caches aggressively |
| Browser storage limits | IndexedDB allows gigabytes; sufficient for most use cases |
| Initial database load time | Accept page load latency; this is a document, not an app |
| No real-time server synchronization | Implement background sync if server integration needed |
| Cross-tab conflict potential | Design write operations to avoid conflicts; implement resolution if needed |
| Same-origin restriction on Broadcast Channel | This is a security feature, not a limitation |

---

## Appropriate Use Cases

### Well Suited

**Personal productivity tools.** Note-taking, task management, budget tracking, habit logging. Single user, moderate data volume, offline capability valuable.

**Data exploration interfaces.** Visualizing datasets, running queries, generating reports. SQL capabilities essential, no server round-trips.

**Internal business tools.** Inventory management, scheduling, resource tracking. Controlled environment, known data size.

**Educational applications.** Interactive lessons, quizzes, progress tracking. Self-contained operation desirable.

**Catalog and reference applications.** Product catalogs, documentation browsers, recipe collections. Query and filter locally.

### Less Suited

**Multi-user collaboration.** Real-time shared editing requires server coordination beyond this architecture.

**Large initial datasets.** If initial data download exceeds tens of megabytes, load times suffer.

**Authoritative transaction systems.** E-commerce checkout, financial transactions, anything requiring server-side validation.

**High-frequency data updates.** If data changes every second, persistence overhead accumulates.

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1–2)

Establish core MPA structure with semantic HTML. Create base CSS using classless approach. Set up DuckDB initialization and basic queries. Implement page state protocol. Configure development environment and test infrastructure.

### Phase 2: Persistence (Weeks 3–4)

Implement IndexedDB backup and restore for DuckDB. Create Service Worker with caching strategies. Add Web App Manifest for installability. Build offline fallback page. Test offline scenarios.

### Phase 3: Coordination (Weeks 5–6)

Implement Broadcast Channel manager. Add cross-tab synchronization for data changes. Test multi-tab scenarios. Handle tab lifecycle events (close, reload).

### Phase 4: Refinement (Weeks 7–8)

Optimize DuckDB queries. Refine caching strategies based on real usage. Polish offline experience. Performance testing and optimization. Production deployment preparation.

---

## Conclusion

This architecture represents a return to web fundamentals enhanced by modern browser capabilities. It rejects the premise that web applications must emulate native software. Instead, it embraces documents, links, and progressive enhancement.

DuckDB transforms what is possible without a server. Broadcast Channel enables coordination without complexity. Service Worker provides offline capability without compromise. Semantic HTML and classless CSS deliver accessible, maintainable interfaces without framework overhead.

The result is a website. It loads pages. It follows links. It works offline. It has a database. It requires no build step, no framework, no architectural complexity beyond what the web platform provides.

This is not a simulation of something else. This is the web.
