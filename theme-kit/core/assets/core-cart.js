/* ==========================================================================
   CORE CART — AJAX add-to-cart + cart page updates.

   1) Any form[data-core-product-form] is intercepted and submitted to
      /cart/add.js. On success, the shared cart state refreshes and
      'core:cart:updated' fires (header badge listens).

   2) <core-cart data-section-id> (cart page) intercepts quantity changes and
      remove links, posts to /cart/change.js, then re-renders itself via the
      Section Rendering API so Liquid stays the single source of markup.

   No-JS fallback: both forms submit normally; remove links are real URLs.
   ========================================================================== */
(function () {
  'use strict';

  // ---- AJAX add to cart ---------------------------------------------------
  document.addEventListener('submit', function (event) {
    var form = event.target.closest('form[data-core-product-form]');
    if (!form) return;
    event.preventDefault();

    var button = form.querySelector('[data-add-to-cart]');
    var spinner = form.querySelector('[data-add-to-cart-spinner]');
    var status = form.querySelector('[data-form-status]');
    if (button) button.disabled = true;
    if (spinner) spinner.hidden = false;
    if (status) {
      status.textContent = '';
      status.removeAttribute('data-status');
    }

    fetch('/cart/add.js', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: new FormData(form)
    })
      .then(function (response) {
        return response.json().then(function (json) {
          if (!response.ok) throw new Error(json.description || 'Add to cart failed');
          return json;
        });
      })
      .then(function () {
        return window.CoreTheme.refreshCart();
      })
      .catch(function (error) {
        if (status) {
          status.textContent = error.message;
          status.setAttribute('data-status', 'error');
        }
      })
      .finally(function () {
        if (button) button.disabled = false;
        if (spinner) spinner.hidden = true;
      });
  });

  // ---- <core-cart> — cart page --------------------------------------------
  if (!customElements.get('core-cart')) {
    customElements.define(
      'core-cart',
      class CoreCart extends HTMLElement {
        connectedCallback() {
          this.sectionId = this.dataset.sectionId;
          this.addEventListener('change', this.onQuantityChange.bind(this));
          this.addEventListener('click', this.onRemoveClick.bind(this));
        }

        onQuantityChange(event) {
          var input = event.target.closest('[data-quantity-input]');
          if (!input) return;
          var line = input.closest('[data-cart-line]');
          if (!line) return;
          this.changeLine(line.dataset.lineKey, parseInt(input.value, 10) || 0);
        }

        onRemoveClick(event) {
          var link = event.target.closest('[data-line-remove]');
          if (!link) return;
          event.preventDefault();
          this.changeLine(link.dataset.lineKey, 0);
        }

        changeLine(key, quantity) {
          var self = this;
          this.classList.add('is-loading');
          fetch('/cart/change.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ id: key, quantity: quantity })
          })
            .then(function (response) {
              if (!response.ok) throw new Error('Cart update failed');
              return response.json();
            })
            .then(function (cart) {
              document.dispatchEvent(
                new CustomEvent('core:cart:updated', { detail: cart })
              );
              return self.rerender();
            })
            .catch(function () {
              window.location.reload();
            })
            .finally(function () {
              self.classList.remove('is-loading');
            });
        }

        rerender() {
          var self = this;
          var url =
            window.location.pathname + '?section_id=' + encodeURIComponent(this.sectionId);
          return fetch(url)
            .then(function (response) {
              return response.text();
            })
            .then(function (html) {
              var doc = new DOMParser().parseFromString(html, 'text/html');
              var fresh = doc.querySelector('core-cart');
              if (fresh) self.innerHTML = fresh.innerHTML;
            });
        }
      }
    );
  }
})();
