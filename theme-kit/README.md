# Theme Startup Kit

Build Shopify themes fast: a frozen commerce **core**, a settings-driven
**token** layer, and small per-theme **skins**. See the project document for
the full architecture; `core/CORE-VERSION.md` holds the hook contract.

## Layout

- `core/` — Layers 1+2. Commerce logic + token system. Never edited per theme.
- `themes/<name>/` — Layer 3. One folder per theme (sections, card snippets,
  scoped CSS, JSON templates, settings preset).
- `build/build.js` — merges core + one skin into `dist/<name>/`, running the
  validation gates (file whitelist, token lint, scope lint, JS whitelist,
  contract check) first.

## Commands

```bash
# build a theme (gates run automatically)
node build/build.js starter

# develop against a store
shopify theme dev --path dist/starter

# lint with Shopify's official checker
shopify theme check --path dist/starter

# push when ready
shopify theme push --path dist/starter --unpublished
```

## Making a new theme

1. Copy `themes/starter` to `themes/<new-name>`
2. Edit `config/settings_data.json` — colors, fonts, spacing, radii (Layer 2 values)
3. Redesign the skin files: `sections/hero.liquid` + its CSS,
   `snippets/card-product.liquid` + its CSS, and any signature sections
4. Compose pages in `templates/*.json`
5. `node build/build.js <new-name>` — fix anything the gates flag

## Rules (enforced by the gates)

- All colors/fonts/spacing/radii via `var(--token)` — never hardcoded
- All skin CSS scoped under the section's/card's root class
- Skins must provide `snippets/card-product.liquid` (rendered by core
  collection + search)
- No external script tags in skins
- Core paths are off-limits; same-path overrides are logged and need review

## Status / known gaps (v0.1)

- Product page is a fixed layout (no blocks yet); planned for core 0.2
- No cart drawer (page cart only), no predictive search UI, no customer
  templates (new customer accounts are used automatically)
- Variant picker is select-based; swatches can be layered on in skins via CSS
