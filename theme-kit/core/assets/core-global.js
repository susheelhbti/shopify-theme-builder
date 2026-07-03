/* ==========================================================================
   CORE GLOBAL — shared utilities + custom elements used across the theme.
   Frozen layer: skins must not modify. Communicates via events:
     document 'core:cart:updated'  detail = cart JSON (/cart.js shape)
   ========================================================================== */
(function () {
  'use strict';

  // ---- Cart count badge -------------------------------------------------
  document.addEventListener('core:cart:updated', function (event) {
    var cart = event.detail;
    if (!cart) return;
    document.querySelectorAll('[data-cart-count]').forEach(function (el) {
      el.textContent = cart.item_count;
    });
  });

  // ---- <core-quantity> ---------------------------------------------------
  if (!customElements.get('core-quantity')) {
    customElements.define(
      'core-quantity',
      class CoreQuantity extends HTMLElement {
        connectedCallback() {
          this.input = this.querySelector('[data-quantity-input]');
          var dec = this.querySelector('[data-quantity-decrease]');
          var inc = this.querySelector('[data-quantity-increase]');
          if (dec) dec.addEventListener('click', this.step.bind(this, -1));
          if (inc) inc.addEventListener('click', this.step.bind(this, 1));
        }
        step(delta) {
          if (!this.input) return;
          var min = parseInt(this.input.min || '0', 10);
          var value = parseInt(this.input.value || '0', 10) + delta;
          if (isNaN(value)) value = min;
          this.input.value = Math.max(min, value);
          this.input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    );
  }

  // ---- Shared fetch helper ------------------------------------------------
  window.CoreTheme = window.CoreTheme || {};
  window.CoreTheme.fetchJSON = function (url, options) {
    return fetch(url, options).then(function (response) {
      return response.json().then(function (json) {
        if (!response.ok) {
          var err = new Error(json.description || json.message || 'Request failed');
          err.data = json;
          throw err;
        }
        return json;
      });
    });
  };

  window.CoreTheme.refreshCart = function () {
    return window.CoreTheme.fetchJSON('/cart.js').then(function (cart) {
      document.dispatchEvent(new CustomEvent('core:cart:updated', { detail: cart }));
      return cart;
    });
  };
})();
