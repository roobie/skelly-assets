// @ts-check
// The git-ignored home of every tree a tool builds aside. The system temp directory is often a small RAM disk shared by
// every process on the host, so a whole built tree there can fill it for everyone; the worktree's disk has the room.
import { mkdirSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';

export const BUILD_ROOT = join(import.meta.dirname, '.build');

// A fresh directory under BUILD_ROOT named after `prefix`; the caller removes it.
/** @param {string} prefix */
export function makeBuildDir(prefix) {
  mkdirSync(BUILD_ROOT, { recursive: true });
  return mkdtempSync(join(BUILD_ROOT, `${prefix}-`));
}
