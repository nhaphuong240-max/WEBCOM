#!/usr/bin/env node
/**
 * @ptt/theme-cli — alpha (W5)
 * Lint theme package size / forbidden scripts / required tokens.
 *
 * Usage: node packages/theme-cli/bin/ptt-theme.js lint <path-to-theme.json>
 */
const fs = require('fs');
const path = require('path');

function lint(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const pkg = JSON.parse(raw);
  const errors = [];
  const sizeKb = Buffer.byteLength(raw) / 1024;
  if (sizeKb > 256) errors.push(`package too large: ${sizeKb.toFixed(1)}KB > 256KB`);
  if (pkg.scripts || pkg.custom_html) errors.push('arbitrary scripts/HTML not allowed');
  const tokens = pkg.tokens || pkg.themeConfig?.tokens || {};
  for (const k of ['accent', 'ink']) {
    if (!tokens[k] && !tokens.rose) errors.push(`missing token: ${k}`);
  }
  const sections = pkg.sections?.home || pkg.themeConfig?.sections?.home;
  if (sections && !Array.isArray(sections)) errors.push('sections.home must be array');
  return { ok: errors.length === 0, size_kb: Number(sizeKb.toFixed(2)), errors };
}

const [, , cmd, file] = process.argv;
if (cmd !== 'lint' || !file) {
  console.error('Usage: ptt-theme lint <theme.json>');
  process.exit(2);
}
const result = lint(path.resolve(file));
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
