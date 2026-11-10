// Holds every cue into skelly's source to the one form README.md, "Cues into skelly", sets. It checks the form
// only: resolving a cue needs a skelly checkout, which this repository's checks do not have.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const SKELLY_URL = 'https://github.com/roobie/skelly';

// The cue's path may follow on the next line, behind a comment leader, wherever a doc or comment wraps.
const CUE = /https:\/\/github\.com\/roobie\/skelly,\s+(?:(?:\/\/|\*|#)\s+)?`([^`]+)`/g;
const PINNED = /https:\/\/github\.com\/roobie\/skelly\/(?:blob|tree|commit)\//g;
// A product's possessive before a backticked name is the prose form the canonical one replaced.
const PROSE = /\b(?:skelly|deadvox)'s `/gi;
const LINE_NUMBER = /:\d+$|#L\d+/;

const lineOf = (text, index) => text.slice(0, index).split('\n').length;

/** Every cue in `text` that breaks the form, as `{ line, problem }`. */
export function cueIssues(text) {
  const issues = [];
  for (const match of text.matchAll(PROSE)) {
    issues.push({ line: lineOf(text, match.index), problem: `prose cue "${match[0]}…"; cue ${SKELLY_URL}, \`path\`` });
  }
  for (const match of text.matchAll(PINNED)) {
    issues.push({ line: lineOf(text, match.index), problem: 'pinned skelly link; cue main by path and symbol' });
  }
  for (const match of text.matchAll(CUE)) {
    const path = match[1];
    if (LINE_NUMBER.test(path)) {
      issues.push({ line: lineOf(text, match.index), problem: `\`${path}\` names a line; cue a symbol instead` });
    } else if (path.startsWith('/') || path.split('/').includes('..')) {
      issues.push({ line: lineOf(text, match.index), problem: `\`${path}\` is not relative to skelly's root` });
    }
  }
  return issues.sort((a, b) => a.line - b.line);
}

/** Every tracked text file's cue issues under `root`, as `{ file, line, problem }`. */
export function trackedCueIssues(root = ROOT) {
  const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
  return files.flatMap((file) => {
    const text = readFileSync(join(root, file), 'utf8');
    if (text.includes('\0')) return [];
    return cueIssues(text).map((issue) => ({ file, ...issue }));
  });
}
