// <product-list> renders a product catalog and emits 'add-to-cart' events.
// Self-contained on purpose: no imports/exports, no shadow DOM (ADR-002,
// ADR-004), so the file loads as a page module and mounts as a test script.

(() => {
  const esc = (value) =>
    String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const formatPrice = (cents) => `€${(cents / 100).toFixed(2)}`;

  class ProductList extends HTMLElement {
    #products = [];

    constructor() {
      super();
      this.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-id]');
        if (!button) return;
        this.dispatchEvent(
          new CustomEvent('add-to-cart', { detail: { productId: button.dataset.id }, bubbles: true })
        );
      });
    }

    set products(list) {
      this.#products = Array.isArray(list) ? list : [];
      this.render();
    }

    get products() {
      return this.#products;
    }

    connectedCallback() {
      this.render();
    }

    render() {
      if (this.#products.length === 0) {
        this.innerHTML = '<p>No products match the current filters.</p>';
        return;
      }
      this.innerHTML = `<ul>${this.#products
        .map(
          (product) => `
        <li>
          <article>
            <h2>${esc(product.name)}</h2>
            <p>${esc(product.description)}</p>
            <p><data value="${product.price}">${formatPrice(product.price)}</data></p>
            <button type="button" data-id="${esc(product.id)}">Add to cart</button>
          </article>
        </li>`
        )
        .join('')}</ul>`;
    }
  }

  customElements.define('product-list', ProductList);
})();
