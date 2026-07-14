// <cart-view> renders cart items and emits 'quantity-change' and
// 'remove-item' events. Self-contained on purpose: no imports/exports, no
// shadow DOM (ADR-002, ADR-004), so the file loads as a page module and
// mounts as a test script.

(() => {
  const esc = (value) =>
    String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const formatPrice = (cents) => `€${(cents / 100).toFixed(2)}`;

  class CartView extends HTMLElement {
    #items = [];

    constructor() {
      super();
      this.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-remove]');
        if (!button) return;
        this.dispatchEvent(
          new CustomEvent('remove-item', { detail: { productId: button.dataset.remove }, bubbles: true })
        );
      });
      this.addEventListener('change', (event) => {
        const input = event.target.closest('input[data-id]');
        if (!input) return;
        const quantity = Math.max(0, Math.trunc(Number(input.value)) || 0);
        this.dispatchEvent(
          new CustomEvent('quantity-change', { detail: { productId: input.dataset.id, quantity }, bubbles: true })
        );
      });
    }

    set items(list) {
      this.#items = Array.isArray(list) ? list : [];
      this.render();
    }

    get items() {
      return this.#items;
    }

    connectedCallback() {
      this.render();
    }

    render() {
      if (this.#items.length === 0) {
        this.innerHTML = '<p>Your cart is empty.</p>';
        return;
      }
      const total = this.#items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
      this.innerHTML = `<table>
        <thead>
          <tr><th>Product</th><th>Price</th><th>Quantity</th><th>Total</th><th></th></tr>
        </thead>
        <tbody>${this.#items
          .map(
            (item) => `
          <tr>
            <th scope="row">${esc(item.product.name)}</th>
            <td><data value="${item.product.price}">${formatPrice(item.product.price)}</data></td>
            <td><input type="number" min="0" value="${item.quantity}" data-id="${esc(item.product.id)}"
              aria-label="Quantity for ${esc(item.product.name)}"></td>
            <td><data value="${item.product.price * item.quantity}">${formatPrice(item.product.price * item.quantity)}</data></td>
            <td><button type="button" data-remove="${esc(item.product.id)}">Remove</button></td>
          </tr>`
          )
          .join('')}</tbody>
        <tfoot>
          <tr><th scope="row" colspan="3">Total</th>
          <td><data value="${total}">${formatPrice(total)}</data></td><td></td></tr>
        </tfoot>
      </table>`;
    }
  }

  customElements.define('cart-view', CartView);
})();
