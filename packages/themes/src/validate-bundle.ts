import { normalizeContent, validateContentV1 } from './normalize';
import type { ContentV1, ThemePackage, ThemePackageManifest } from './types';

/** Validate an in-memory ThemePackage bundle (Creator Portal / zip extract stub). */
export function validatePackageBundle(files: Record<string, string>): {
  ok: boolean;
  issues: string[];
  package?: ThemePackage;
} {
  const issues: string[] = [];
  const manifestRaw = files['package.manifest.json'] || files['/package.manifest.json'];
  const homeRaw = files['starter/home.json'] || files['/starter/home.json'];
  const tokensRaw = files['starter/tokens.json'] || files['/starter/tokens.json'];

  if (!manifestRaw) issues.push('missing package.manifest.json');
  if (!homeRaw) issues.push('missing starter/home.json');
  if (!tokensRaw) issues.push('missing starter/tokens.json');
  if (issues.length) return { ok: false, issues };

  let manifest: ThemePackageManifest;
  let tokens: Record<string, string>;
  let home: ContentV1;
  try {
    manifest = JSON.parse(manifestRaw) as ThemePackageManifest;
  } catch {
    return { ok: false, issues: ['package.manifest.json is not valid JSON'] };
  }
  try {
    tokens = JSON.parse(tokensRaw) as Record<string, string>;
  } catch {
    return { ok: false, issues: ['starter/tokens.json is not valid JSON'] };
  }
  try {
    home = normalizeContent(JSON.parse(homeRaw)) as ContentV1;
  } catch (e) {
    return { ok: false, issues: [`starter/home.json: ${e instanceof Error ? e.message : 'parse error'}`] };
  }

  if (!manifest.code) issues.push('manifest.code required');
  if (!manifest.name) issues.push('manifest.name required');
  if (!manifest.version) issues.push('manifest.version required');
  if (!Array.isArray(manifest.supports) || !manifest.supports.length) {
    issues.push('manifest.supports[] required');
  }
  if (!tokens.accent) issues.push('tokens.accent required');

  const schemaIssues = validateContentV1(home);
  for (const i of schemaIssues) {
    issues.push(`${i.path}: ${i.message}`);
  }
  for (const key of home.section_order) {
    const type = home.sections[key]?.type;
    if (type && manifest.supports && !manifest.supports.includes(type)) {
      issues.push(`section "${key}" type "${type}" not in supports[]`);
    }
  }

  if (issues.length) return { ok: false, issues };
  return {
    ok: true,
    issues: [],
    package: { manifest, starter: { home, tokens } },
  };
}
