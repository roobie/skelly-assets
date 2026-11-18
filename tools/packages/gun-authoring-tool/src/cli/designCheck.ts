import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { resolve } from '@skelly/construct/assembly/resolve.ts';
import { type GunDesign, loadGunDesign } from '../gun/designLoader.ts';
import { gunDomain } from '../gun/domain.ts';
import { unswappableMounts } from '../gun/platforms.ts';

export interface DesignCheckResult {
  readonly exitCode: 0 | 1;
  readonly lines: readonly string[];
}

/**
 * A published design must name its platform, so its parts can be matched to the other designs', and every mount site
 * must have a swap path. Drafts the viewer seeds from a template have no platform until one is chosen.
 */
const publishedPlatformProblem = (design: GunDesign): string | undefined => {
  if (design.platform === undefined) {
    return 'published design names no platform';
  }
  const unswappable = unswappableMounts(resolve(design.assembly, gunDomain));
  return unswappable.length === 0 ? undefined : `no swap path for mount type(s) ${unswappable.join(', ')}`;
};

/** Why a design file's text fails the publish check; undefined when it passes, with any draft issues counted. */
export const designTextProblem = (text: string): { readonly problem?: string; readonly draftIssues: number } => {
  const result = loadGunDesign(text);
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
  const problem = publishedPlatformProblem(result.design);
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
