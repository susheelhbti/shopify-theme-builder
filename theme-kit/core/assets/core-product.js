/* ==========================================================================
   CORE PRODUCT — variant selection.
   <core-variant-picker data-form-id> holds one select per option and a JSON
   script of variants (prices pre-formatted server-side, so no money
   formatting happens in JS). On change it:
     - finds the variant matching the selected option combination
     - updates the form's hidden input[name="id"]
     - updates the nearest [data-core-price] hooks
     - updates the add-to-cart button state/label
     - reflects the variant in the URL (?variant=)
   ========================================================================== */
(function () {
  'use strict';

  if (customElements.get('core-variant-picker')) return;

  customElements.define(
    'core-variant-picker',
    class CoreVariantPicker extends HTMLElement {
      connectedCallback() {
        this.form = document.getElementById(this.dataset.formId);
        this.selects = Array.prototype.slice.call(
          this.querySelectorAll('[data-option-select]')
        );
        var dataEl = this.querySelector('[data-variant-data]');
        try {
          this.variants = JSON.parse(dataEl ? dataEl.textContent : '[]');
        } catch (e) {
          this.variants = [];
        }
        this.addEventListener('change', this.onChange.bind(this));
      }

      selectedOptions() {
        return this.selects
          .sort(function (a, b) {
            return a.dataset.optionIndex - b.dataset.optionIndex;
          })
          .map(function (select) {
            return select.value;
          });
      }

      currentVariant() {
        var options = this.selectedOptions();
        return this.variants.find(function (variant) {
          return variant.options.every(function (value, index) {
            return value === options[index];
          });
        });
      }

      onChange() {
        var variant = this.currentVariant();
        this.updateForm(variant);
        this.updatePrice(variant);
        this.updateButton(variant);
        this.updateUrl(variant);
      }

      updateForm(variant) {
        if (!this.form) return;
        var idInput = this.form.querySelector('input[name="id"]');
        if (idInput && variant) idInput.value = variant.id;
      }

      updatePrice(variant) {
        var scope = this.form ? this.form.closest('section') || document : document;
        var wrapper = scope.querySelector('[data-core-price]');
        if (!wrapper || !variant) return;
        var price = wrapper.querySelector('[data-price]');
        var compare = wrapper.querySelector('[data-compare-price]');
        var badge = wrapper.querySelector('[data-price-badge-sale]');
        if (price) price.textContent = variant.price;
        var onSale = Boolean(variant.compare_at_price);
        wrapper.classList.toggle('is-on-sale', onSale);
        if (compare) {
          compare.hidden = !onSale;
          compare.textContent = variant.compare_at_price || '';
        }
        if (badge) badge.hidden = !onSale;
      }

      updateButton(variant) {
        if (!this.form) return;
        var button = this.form.querySelector('[data-add-to-cart]');
        if (!button) return;
        var text = button.querySelector('[data-add-to-cart-text]');
        if (!variant) {
          button.disabled = true;
          if (text) text.textContent = button.dataset.labelUnavailable;
        } else if (!variant.available) {
          button.disabled = true;
          if (text) text.textContent = button.dataset.labelSoldOut;
        } else {
          button.disabled = false;
          if (text) text.textContent = button.dataset.labelAdd;
        }
      }

      updateUrl(variant) {
        if (!variant || !window.history.replaceState) return;
        var url = new URL(window.location.href);
        url.searchParams.set('variant', variant.id);
        window.history.replaceState({}, '', url.toString());
      }
    }
  );
})();
