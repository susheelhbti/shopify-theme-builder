# Project Document — AI-Powered Shopify Theme Startup Kit

**Version:** 1.0 (Draft)
**Status:** Planning / pre-implementation
**Document owner:** Project founder
**Scope:** Full system — theme kit architecture (Part A) + AI generation pipeline (Part B)

---

## 1. Vision

Build a system that turns a finished landing page (HTML/CSS/JS) into a complete, brand-new, production-ready Shopify theme — by combining a frozen, battle-tested commerce core with an AI pipeline that generates only the small design "skin" layer on top of it.

**One-line pitch:** The hard parts of a Shopify theme are built once; the AI writes only the pretty parts, inside a cage of rules and automated checks.

**Why this works:** Asking an AI to generate a whole Shopify theme fails — too much surface area, hallucinated cart logic, broken schemas. Asking it to generate only a small, contract-bound skin layer against a fixed core is a constrained, verifiable task. The layered architecture is what makes AI generation reliable.

---

## 2. Product Definition

**Input:** A landing page as real code — HTML, CSS, JS (not screenshots). The design must be owned by the user/client (own mockup, Figma export, or a brand site being migrated). Cloning third-party sites is out of scope by policy (see §12).

**Output:** A valid, uploadable Shopify theme with:
- Full working commerce (cart, product forms, variants, search) from the frozen core
- The landing page's visual identity translated into tokens + skin sections
- All content merchant-editable through the Shopify theme editor
- Passing Theme Check and the project's own validation gates

**Target users (initial):** Agencies and freelancers doing client theme builds. (Theme Store distribution has extra constraints — see §12.)

**Value proposition:** A brand-new theme in hours instead of weeks, with commerce functionality guaranteed unbroken because the AI never touches it.

---

# PART A — THE THEME KIT (Foundation)

## 3. Three-Layer Architecture

### Layer 1 — Core (frozen commerce foundation)
All commerce functionality: cart, add-to-cart, variant/option selection, product form, quantity input, predictive search, pagination, money formatting, accessibility behavior (focus management, keyboard navigation).

- Never edited when creating a theme. Identical files, byte-for-byte, in every theme.
- Zero visual opinion: clean semantic HTML with stable class hooks and data-attributes; no colors, fonts, spacing, or decorative markup. Anything visual reads from Layer 2 tokens.
- This layer is the moat — the hard-to-build part that justifies the whole system.

### Layer 2 — Tokens (settings-driven design system)
Every visual decision expressed as a CSS variable driven by theme settings: colors, font stacks, type scale, spacing scale, border radius, shadows, button style.

- The **code** (settings schema + variable-generating snippet) is identical across all themes.
- Only the **values** change per theme, stored as presets in `settings_data.json`.
- If a designer might ever change a visual property, it must be a token. New tokens are added to Layer 2 for all themes with defaults — never hacked into one skin.

### Layer 3 — Skin (per-theme visual identity)
Hero section, product card look, signature sections, homepage composition, section-level CSS.

- The ONLY layer that differs between themes and the only layer the AI generates.
- Skins style around core's documented hooks; they never modify core files or target core's internal DOM.

## 4. Repository Structure

Shopify requires a flat theme folder, so layering lives in the development repo. A build script merges core + one skin into a normal uploadable theme.

```
theme-kit/
│
├── core/                          ← Layers 1 + 2 (single source of truth)
│   ├── layout/theme.liquid
│   ├── sections/                  main-product, main-collection, main-cart,
│   │                              main-search, main-page, main-blog,
│   │                              main-article, header, footer,
│   │                              cart-drawer, predictive-search
│   ├── snippets/                  core-product-form, core-add-to-cart,
│   │                              core-price, core-variant-picker,
│   │                              core-quantity-input, core-pagination,
│   │                              core-cart-items, core-media,
│   │                              css-variables (settings → CSS vars)
│   ├── assets/                    core-cart.js, core-product.js,
│   │                              core-search.js, core-global.js,
│   │                              core-base.css (reset + functional only)
│   ├── config/settings_schema.json
│   ├── locales/en.default.json
│   └── CORE-VERSION.md            (version + changelog)
│
├── themes/                        ← Layer 3: one folder per theme
│   └── <theme-name>/
│       ├── sections/              hero, featured-collection,
│       │                          image-with-text, newsletter, ...
│       ├── snippets/              card-product, card-blog
│       ├── assets/                section-*.css, card-*.css,
│       │                          theme-custom.css (empty override file)
│       ├── templates/             index.json, product.json, ... (all JSON)
│       └── config/settings_data.json  (this theme's token preset)
│
├── pipeline/                      ← Part B: AI generation system
│   ├── parser/                    deterministic CSS/HTML extraction
│   ├── prompts/                   contract doc, few-shot examples
│   ├── validate/                  gates (see §10)
│   └── diff/                      visual comparison tooling
│
├── build/                         ← merge script: core + skin → dist
└── dist/                          ← generated flat Shopify themes
```

**Merge rule:** build copies `core/` first, then the chosen skin on top. Same-path skin files win (controlled escape hatch); the build logs every override so escapes stay rare and visible.

## 5. The Contract (7 Rules)

These rules ARE the system. They also form the AI's system prompt (§9).

- **R1 — Core is read-only** during theme creation. Fixes go through core's release process and benefit all themes.
- **R2 — Every visual value goes through a token.** No hardcoded hex, spacing px, or font names in skin or core CSS — only `var(--...)`. The single most important rule; enforced by lint in CI.
- **R3 — Core emits stable hooks.** Class names, data-attributes, and snippet parameters never change silently (see §6 versioning).
- **R4 — Skins use only documented hooks.** No selectors depending on core's internal DOM (`> div:nth-child(2)` is forbidden).
- **R5 — Sections own their CSS.** Every skin section loads its own stylesheet scoped under its root class. Editing one section can never restyle another page.
- **R6 — Presentation and logic never share a file.** Cards/heroes/banners = skin; price/form/cart = core. A skin card renders core snippets internally.
- **R7 — Missing token? Fix core, not the skin.** New visual needs become new Layer 2 tokens with defaults, never one-off hardcodes.

## 6. Core Versioning

- Core carries a version number in `CORE-VERSION.md` with a changelog.
- **Patch/minor:** bug fixes, new tokens with defaults, new optional snippets — safe for all skins.
- **Major:** any change to existing hooks, class names, data-attributes, or snippet parameters — skins must be reviewed before upgrading.
- Every skin records the core version it was built against.

## 7. Shopify Compliance Foundations

- **Base codebase:** Shopify's official Skeleton Theme (the only approved base for original theme development; not derived from Dawn/Horizon).
- **Minimum requirement:** `layout/theme.liquid` containing `content_for_header` (in `<head>`) and `content_for_layout` (in `<body>`).
- **Templates:** JSON templates for all standard pages (limits: 25 sections/template, 50 blocks/section). Sections define presets in their single `{% schema %}` tag so merchants can add them in the editor.
- **Customer accounts:** legacy `templates/customers/` omitted — merchants automatically get Shopify's new customer accounts.
- **Localization:** all strings in `locales/en.default.json` via the `t` filter; no hardcoded text.
- **Tooling:** Shopify CLI (`theme dev`, `theme push`) + Theme Check on every build.

---

# PART B — THE AI GENERATION PIPELINE

## 8. Pipeline Overview

```
STAGE 0   Landing page code in (HTML/CSS/JS)
STAGE 1a  Deterministic parser        → raw tokens + asset inventory
STAGE 1b  AI structure classification → section map + content classification
STAGE 1c  Design Spec JSON assembled  → HUMAN REVIEWS & EDITS & APPROVES
STAGE 2   AI generates skin code      → preset values + 3–6 skin files
GATE      Automated validation        → fail: error fed back to AI (auto retry)
BUILD     Merge core + skin           → full theme on dev store
REVIEW    Visual diff + human review  → tweak: regenerate single file
SHIP      Publish theme
```

Two loops keep iteration cheap: gate failures auto-retry with the error message; review feedback regenerates one file, never the whole skin.

**Division of labor principle:** extract mechanically, interpret with AI. The parser handles everything factual (exact colors, fonts, sizes, assets); the AI handles only judgment (which color is "accent," which DOM region is a "hero"). The AI is not the smart part of the system — the contract and the gates are.

### Stage 1a — Deterministic Parser
Extracts from the source CSS/HTML with no AI involvement:
- All color values, clustered to the 4–6 real brand colors (noise discarded)
- Font families, font-size scale, weights
- Spacing values, border radii, shadows
- Asset inventory: every image and font, with paths

### Stage 1b — AI Structure Classification
Given the DOM + parser output + the kit's section vocabulary, the AI decides:
- Token **roles**: which extracted color is primary vs accent vs background
- Section mapping: each DOM region → one kit section type, or flagged `new-section-needed`
- Content classification per section: hardcoded text → schema settings (source text as default); images → `image_picker` settings; repeating card patterns → Liquid loops over live data rendering the kit's card snippets
- Discard candidates: fake cart JS, trackers, third-party scripts, source resets

### Stage 2 — AI Skin Generation
Consumes ONLY the approved spec (never the raw landing page — completeness of the spec is guaranteed by this rule). Produces:
- `settings_data.json` preset values (tokens)
- 3–6 skin files: signature sections + card snippets + their scoped CSS
- JSON templates composing the pages

**Translate, never transplant:** the source is a visual specification, not code to copy. Output is authored in the kit's system — its tokens (R2), its scoping (R5), its hooks (R4). Source JS is reference only; commerce-adjacent behavior is discarded (core owns it), interactions are re-expressed as CSS-first or vetted skin scripts. Zero external `<script src>` outside the asset whitelist.

## 9. Design Spec JSON (the Stage 1 → Stage 2 contract)

The spec is the single reviewable artifact connecting "what the page looks like" to "what the AI may build." Five parts:

1. **Tokens** — extracted values mapped to Layer 2 token names, ready for `settings_data.json`.
2. **Section map** — per DOM region, in page order: source selector (traceability), target kit section type, short visual treatment description, or `new-section-needed` flag.
3. **Content classification** — per section: which text → settings, which images → pickers, which repeats → loops.
4. **Asset manifest** — every image/font with a destination decision (upload / setting / Shopify font library / licensing check).
5. **Discard list** — everything intentionally NOT carried over, so "dropped on purpose" is distinguishable from "AI forgot."

Illustrative shape:

```json
{
  "source": "landing-page-v3/",
  "tokens": { "color-primary": "#1A1A2E", "color-accent": "#E94560",
              "font-heading": "Sora", "radius-card": "16px" },
  "sections": [
    { "id": "s1", "source_region": "div.hero-wrap", "maps_to": "hero",
      "treatment": "full-bleed image, headline bottom-left, pill CTA",
      "settings": { "heading": "Wear the difference", "cta_label": "Shop now" },
      "images_to_settings": ["hero-bg.jpg"] },
    { "id": "s2", "source_region": "section.best-sellers",
      "maps_to": "featured-collection",
      "treatment": "4-col grid, image-top cards, hover lift",
      "loop": "collection.products → card-product" }
  ],
  "assets": { "fonts": [{ "name": "Sora", "status": "in-shopify-library" }] },
  "discard": ["scripts/fake-cart.js", "gtag snippet"]
}
```

**Human review checklist (before Stage 2 runs):**
- Fix token roles (most common correction — seconds of work)
- Reroute section mappings where the AI picked a suboptimal type
- Decide every `new-section-needed` flag (highest-stakes call: new code risk vs design fidelity — always human, never AI default)
- Adjust settings-vs-hardcoded content decisions
- Confirm the discard list (nothing important dropped, nothing dangerous kept)

**Spec integrity rules:** the spec itself is schema-validated (`maps_to` must be a real kit section type, token names must exist in Layer 2) so human typos are caught before generation. v1 editing interface = the JSON file in an editor; a review UI (source page + section overlay + token swatches) is later sugar.

**Side effect:** approved spec + accepted skin pairs accumulate into a few-shot corpus that improves both AI stages over time.

## 10. Validation Gate (automated, mandatory)

AI output never merges unchecked. Checks, in order:

1. **File whitelist** — only allowed skin paths created; no core paths touched
2. **Token lint (R2)** — grep/lint fails the build on hardcoded visual values
3. **Scope lint (R5)** — all skin CSS rules under the section's root class; no global selectors
4. **JS whitelist** — no external script sources outside the approved asset list; no commerce logic reimplemented
5. **Theme Check** — valid Liquid, valid schemas, one `{% schema %}` per section with presets
6. **Render test** — merged theme runs on a dev store; homepage, one product page, and cart render without errors
7. **Visual diff** — source landing page and generated homepage rendered headless and compared (screenshot diff + computed-style diff on matched elements), producing a fidelity score and specific deltas ("hero heading 48px in source, 36px in output") that feed the AI retry loop

Fail at any gate → error routed back to Stage 2 as a retry prompt. The human only ever sees code that passed.

## 11. Human Touchpoints (exactly three)

1. **Spec approval** (§9) — before any code exists; corrections are one-line JSON edits
2. **Preview review** — generated theme vs source page on a dev store; feedback regenerates single files
3. **Publish decision** — final sign-off

Everything else is automated. Realistic expectation: first-pass visual fidelity of roughly 70–80%, closed by the cheap per-file iteration loop.

---

## 12. Policies & Risk Register

**Input ownership policy:** accepted inputs are designs the user/client owns (own code, Figma exports, brand-site migrations). Cloning third-party live sites is refused — legal risk (design copying) and produces derivative output. This is a product policy, decided now, enforced at intake.

**JS security policy:** arbitrary source JS is never shipped to merchant stores (external libraries, event conflicts with core, theme-editor re-render breakage). Interactions are CSS-first or from the kit's vetted script set. Enforced by gate #4.

**Theme Store constraint:** if any output is ever submitted to the Shopify Theme Store, each listing must be fundamentally different from others including the seller's own — token-level reskins of one codebase do not qualify as separate listings, and only Skeleton-based original code is eligible. Agency/direct-sale distribution has no such restriction and is the assumed model.

**Core upgrade risk:** live merchant themes depend on core hooks. Mitigated by semantic versioning (§6) and skins pinning their core version.

**AI drift risk:** models change; output shape may drift. Mitigated by the gate (nothing unchecked ships), schema-validated spec, and the growing few-shot corpus of golden examples.

---

## 13. Acceptance Tests

**Test A — Architecture proof (before any AI work):** build core, then build two deliberately opposite skins by hand (e.g., dense dark editorial vs airy light minimal) with zero edits to `core/`. Every forced core edit reveals a missing token or leaked visual opinion — fix in core, repeat. Pass = two visibly different, fully functional themes, core untouched. The second skin also becomes the golden few-shot example for the AI.

**Test B — Pipeline proof:** feed a real owned landing page through the full pipeline. Pass = spec approved with ≤10 human edits; Stage 2 output passes all gates within 3 auto-retries; visual-diff fidelity above the agreed threshold after ≤5 per-file iterations; all commerce flows work on the dev store.

---

## 14. Build Roadmap (strict order — the AI layer comes LAST)

**Phase 1 — Core foundation**
1. Scaffold from Skeleton Theme; rendering via `shopify theme dev`
2. Layer 2 token system: `settings_schema.json` + `css-variables.liquid`
3. Core commerce snippets + JS (product form → cart → search)
4. Core page sections (main-product, main-collection, main-cart, header, footer)

**Phase 2 — Kit infrastructure**
5. Build/merge script with override logging
6. Validation gates 1–6 in CI (visual diff comes in Phase 4)
7. **Hook documentation** — the published list of stable class names/data-attributes/snippet parameters (this later doubles as the AI's contract prompt)

**Phase 3 — Manual proof**
8. First skin, built by hand (proves the workflow)
9. Second, opposite skin (Acceptance Test A; produces the golden example)
10. `CUSTOMIZATION.md` for end users (task-oriented: "new hero → these 2 files")

**Phase 4 — AI pipeline**
11. Deterministic parser (Stage 1a)
12. Design Spec JSON schema + validator
13. Stage 1b classification prompt (contract + section vocabulary + golden example)
14. Stage 2 generation prompt + auto-retry loop wired to the gates
15. Visual diff tooling (gate #7)
16. Acceptance Test B on a real landing page

**Phase 5 — Product hardening**
17. Spec review UI (replacing raw-JSON editing)
18. Per-file regeneration UX for the review loop
19. Few-shot corpus management (approved spec + skin pairs)

---

## 15. Key Documents To Produce (in order)

1. **Hook contract** — core's stable hooks and snippet parameters (Phase 2, item 7)
2. **Token catalog** — every Layer 2 token, its type, default, and what it controls
3. **Section vocabulary** — the kit's section types with the DOM patterns that map to each (the Stage 1b classification ruleset)
4. **Design Spec JSON schema** — formal schema for §9
5. **Gate specification** — exact checks, tools, and pass thresholds for §10
6. **`CUSTOMIZATION.md`** — end-user guide

---

## 16. Success Criteria (project level)

- A new theme from an owned landing page in under one working day, end to end
- Zero commerce regressions across all generated themes (core untouched, gates green)
- Human effort per theme concentrated in the three touchpoints of §11
- Core fixes propagate to every theme via a rebuild — one fix, all themes
