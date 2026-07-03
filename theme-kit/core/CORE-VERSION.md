# Core Version

## 0.1.0 (initial)

First working core. Contract v0.1.

### Stable hooks (skins may target ONLY these)

Snippets and their parameters:
- core-price        (product | variant)
- core-media        (media, sizes?, loading?)
- core-product-form (product, section_id)
- core-variant-picker (product, form_id)   — rendered by core-product-form
- core-quantity-input (id, name?, value?, min?)
- core-add-to-cart  (product)              — rendered by core-product-form
- core-cart-items   (no params)
- core-pagination   (paginate)

DOM hooks (data-attributes are the contract; class names are styling aids):
- [data-core-price] > [data-price], [data-compare-price], [data-price-badge-sale]
- form[data-core-product-form] > input[name="id"]
- [data-add-to-cart] > [data-add-to-cart-text], [data-add-to-cart-spinner]
- <core-quantity> > [data-quantity-input] [data-quantity-decrease] [data-quantity-increase]
- <core-cart data-section-id> > [data-cart-items] [data-cart-line data-line-key]
  [data-line-quantity via data-quantity-input] [data-line-remove] [data-cart-subtotal]
- [data-cart-count], [data-cart-link]
- [data-form-status]

Events:
- document 'core:cart:updated' — detail is /cart.js JSON. Fired after any
  cart mutation. Skins may listen; skins must never mutate the cart directly,
  always through core forms/elements.

### Skin obligations (checked by the validation gate)
- MUST provide snippets/card-product.liquid (params: product) — rendered by
  core main-collection and main-search.
- MUST NOT create files under core paths; same-path overrides are logged by
  the build and require review.
- MUST use only var(--token) values for colors, fonts, spacing, radii.

### Breaking-change policy
Any change to the hooks, parameters, or event shapes above = major version.
