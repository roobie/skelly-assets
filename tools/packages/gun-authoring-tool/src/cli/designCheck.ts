import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { resolve } from '@skelly/construct/assembly/resolve.ts';
import { type GunDesign, loadGunDesign } from '../gun/designLoader.ts';
import { gunDomain } from '../gun/domain.ts';
import { GUN_PLATFORMS, type GunPlatforms, unlistedStandards, unswappableMounts } from '../gun/platforms.ts';

export interface DesignCheckResult {
  readonly exitCode: 0 | 1;
  readonly lines: readonly string[];
}

/**
 * A published design must name its platform, so its parts can be matched to the other designs', every mount site must
 * have a swap path, and every standard a port declares must be one its mount type lists. Drafts the viewer seeds from a
 * template have no platform until one is chosen.
 */
const publishedPlatformProblem = (design: GunDesign, table: GunPlatforms): string | undefined => {
  if (design.platform === undefined) {
    return 'published design names no platform';
  }
  const resolved = resolve(design.assembly, gunDomain);
  const unswappable = unswappableMounts(resolved, table);
  const problems = [
    ...(unswappable.length === 0 ? [] : [`no swap path for mount type(s) ${unswappable.join(', ')}`]),
    ...unlistedStandards(resolved, table),
  ];
  return problems.length === 0 ? undefined : problems.join('; ');
};

/** Why a design file's text fails the publish check; undefined when it passes, with any draft issues counted. */
export const designTextProblem = (
  text: string,
  table: GunPlatforms = GUN_PLATFORMS,
): { readonly problem?: string; readonly draftIssues: number } => {
  const result = loadGunDesign(text, table);
  if (!result.ok) {
    return { problem: `${result.error.code}: ${result.error.message}`, draftIssues: 0 };
  }
  if (result.declaredStatus !== 'published') {
    return { draftIssues: result.issues.length };
  }
  if (result.issues.length > 0) {
    return {
      problem: `published design has ${result.issues.length} issue(s): ${result.issues.map(({ message }) => message).join('; ')}`,
      draftIssues: 0,
    };
  }
  const problem = publishedPlatformProblem(result.design, table);
  return problem === undefined ? { draftIssues: 0 } : { problem, draftIssues: 0 };
};

/** Checks whether each supplied design can be loaded and whether published files are clean. */
export const checkDesignFiles = (files: readonly string[]): DesignCheckResult => {
  let failed = false;
  const lines = files.map((file) => {
    let text: string;
    try {
      text = readFileSync(file, 'utf8');
    } catch (error) {
      failed = true;
      return `FAIL ${basename(file)}: ${error instanceof Error ? error.message : String(error)}`;
    }
    const { problem, draftIssues } = designTextProblem(text);
    if (problem !== undefined) {
      failed = true;
      return `FAIL ${basename(file)}: ${problem}`;
    }
    return `PASS ${basename(file)}${draftIssues > 0 ? `: draft has ${draftIssues} issue(s)` : ''}`;
  });
  return { exitCode: failed ? 1 : 0, lines };
};
