#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const registry = fs.readFileSync(path.join(root, 'packages/themes/src/registry.ts'), 'utf8');
const stack = fs.readFileSync(
  path.join(root, 'apps/storefront-web/src/components/sections/SectionStack.tsx'),
  'utf8',
);

const coreMust = [
  'hero',
  'featured',
  'trust',
  'cta_banner',
  'faq',
  'lead_form',
  'flash_sale',
  'product_grid',
  'hero_slider',
];

const missing = coreMust.filter((k) => !stack.includes(`'${k}'`) && !stack.includes(`"${k}"`));
if (missing.length) {
  console.error('Section parity FAIL — missing in SectionStack:', missing.join(', '));
  process.exit(1);
}
console.log('Section parity OK — coreMust', coreMust.length);
