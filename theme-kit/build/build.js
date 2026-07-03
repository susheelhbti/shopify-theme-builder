#!/usr/bin/env node
/**
 * THEME KIT BUILD — merges core/ + themes/<name>/ into dist/<name>/,
 * a flat, uploadable Shopify theme.
 *
 * Usage:   node build/build.js <theme-name>
 * Output:  dist/<theme-name>/
 *
 * Merge rule: core is copied first, skin second. A skin file with the same
 * path as a core file WINS and is logged as an OVERRIDE (escape hatch —
 * should be rare; every override deserves review).
 *
 * Built-in gates (fail the build):
 *   G1  file whitelist — skins may only ship files under sections/,
 *       snippets/, assets/, templates/, config/settings_data.json, locales/
 *   G2  token lint     — no hardcoded hex colors in skin CSS (rule R2)
 *   G3  scope lint     — skin CSS selectors must be scoped (rule R5):
 *       every top-level selector must contain a .skin- or .section- class
 *   G4  js whitelist   — no external <script src> outside the theme's assets
 *   G5  contract check — skin must provide snippets/card-product.liquid
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const themeName = process.argv[2];

if (!themeName) {
  console.error('Usage: node build/build.js <theme-name>');
  process.exit(1);
}

const CORE = path.join(ROOT, 'core');
const SKIN = path.join(ROOT, 'themes', themeName);
const DIST = path.join(ROOT, 'dist', themeName);

if (!fs.existsSync(SKIN)) {
  console.error(`Theme not found: themes/${themeName}`);
  process.exit(1);
}

// ---------- helpers ----------------------------------------------------------

function walk(dir, base = dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, base, files);
    else files.push(path.relative(base, full));
  }
  return files;
}

function copyInto(srcRoot, relFiles, overrides) {
  for (const rel of relFiles) {
    const dest = path.join(DIST, rel);
    if (overrides && fs.existsSync(dest)) overrides.push(rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(srcRoot, rel), dest);
  }
}

const errors = [];
const warnings = [];

// ---------- gates on the SKIN (before merging) --------------------------------

const skinFiles = walk(SKIN);

// G1 — file whitelist
const ALLOWED = [
  /^sections\//,
  /^snippets\//,
  /^assets\//,
  /^templates\//,
  /^locales\//,
  /^config\/settings_data\.json$/
];
for (const rel of skinFiles) {
  const posix = rel.split(path.sep).join('/');
  if (!ALLOWED.some((re) => re.test(posix))) {
    errors.push(`G1 whitelist: skin ships disallowed path "${posix}"`);
  }
}

// G2 — token lint: no hardcoded hex colors in skin CSS
for (const rel of skinFiles.filter((f) => f.endsWith('.css'))) {
  const css = fs.readFileSync(path.join(SKIN, rel), 'utf8');
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const hexes = stripped.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
  for (const hex of hexes) {
    errors.push(`G2 token lint: hardcoded color ${hex} in ${rel} (use var(--...))`);
  }
}

// G3 — scope lint: every rule's selector must contain .skin- or .section-
for (const rel of skinFiles.filter((f) => f.endsWith('.css'))) {
  const css = fs
    .readFileSync(path.join(SKIN, rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const selectorBlocks = css.match(/(^|})\s*([^{}@]+)\{/g) || [];
  for (const block of selectorBlocks) {
    const selector = block.replace(/^\}?\s*/, '').replace(/\{$/, '').trim();
    if (!selector) continue;
    if (!/\.(skin-|section-|core-)/.test(selector)) {
      errors.push(`G3 scope lint: unscoped selector "${selector}" in ${rel}`);
    }
  }
}

// G4 — js whitelist: no external script sources in skin liquid
for (const rel of skinFiles.filter((f) => f.endsWith('.liquid'))) {
  const src = fs.readFileSync(path.join(SKIN, rel), 'utf8');
  const externals = src.match(/<script[^>]+src=["']https?:\/\/[^"']+["']/g) || [];
  for (const tag of externals) {
    errors.push(`G4 js whitelist: external script in ${rel}: ${tag}`);
  }
}

// G5 — contract: card-product must exist (core collection/search render it)
if (!skinFiles.some((f) => f.split(path.sep).join('/') === 'snippets/card-product.liquid')) {
  errors.push('G5 contract: skin is missing snippets/card-product.liquid');
}

if (errors.length) {
  console.error('\nBUILD FAILED — validation gate errors:\n');
  for (const e of errors) console.error('  ✗ ' + e);
  console.error('');
  process.exit(1);
}

// ---------- merge --------------------------------------------------------------

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

copyInto(CORE, walk(CORE).filter((f) => !f.endsWith('CORE-VERSION.md')));
const overrides = [];
copyInto(SKIN, skinFiles, overrides);

// ---------- report --------------------------------------------------------------

console.log(`\nBuilt dist/${themeName}/`);
console.log(`  core files:  ${walk(CORE).length - 1}`);
console.log(`  skin files:  ${skinFiles.length}`);
if (overrides.length) {
  console.log('\n  ⚠ OVERRIDES (skin replaced core files — review these):');
  for (const o of overrides) console.log('    - ' + o);
} else {
  console.log('  overrides:   none');
}
for (const w of warnings) console.log('  ⚠ ' + w);
console.log('\nNext: shopify theme dev --path dist/' + themeName + '\n');
