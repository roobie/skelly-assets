import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { compareCodeUnits, compareNumbered } from '../codeUnitOrder.mjs';

const repo = resolve(import.meta.dirname, '../..');
const SOURCE = /\.(?:[cm]?[jt]s|html)$/;
const LOCALE_CALL = `${'locale'}${'Compare'}`;
const LOCALE_COLLATOR = `Intl.${'Coll'}${'ator'}`;
// Assembled from parts so that this file is not its own finding.
const LOCALE_ORDER = new RegExp(`\\.${LOCALE_CALL}\\b|${LOCALE_COLLATOR.replace('.', '\\.')}`);

/** Lines of `text` that order strings by the runtime locale, which varies between machines and so would vary an export. */
const localeOrderedLines = (text) =>
  text.split('\n').flatMap((line, index) => (LOCALE_ORDER.test(line) ? [index + 1] : []));

const trackedSources = () =>
  execFileSync('git', ['ls-files', '-z', 'tools', 'site'], { cwd: repo, encoding: 'utf8' })
    .split('\0')
    .filter((path) => SOURCE.test(path));

test('the scan finds a locale-ordered sort', () => {
  assert.deepEqual(localeOrderedLines(`const a = 1;\nnames.sort((x, y) => x.${LOCALE_CALL}(y));\n`), [2]);
  assert.deepEqual(localeOrderedLines(`new ${LOCALE_COLLATOR}('en').compare;`), [1]);
});

test('no tracked tool or site source orders strings by the runtime locale', () => {
  const sources = trackedSources();
  assert.ok(sources.length > 0, 'the scan must see sources');
  const findings = sources.flatMap((path) =>
    localeOrderedLines(readFileSync(join(repo, path), 'utf8')).map((line) => `${path}:${line}`),
  );
  assert.deepEqual(findings, [], 'order strings with compareCodeUnits or compareNumbered from tools/codeUnitOrder.mjs');
});

test('code unit order puts capitals and punctuation by character code, not by collation', () => {
  assert.deepEqual(['rear_b', 'rearB', 'rear-a', 'Rear', 'rear'].sort(compareCodeUnits), ['Rear', 'rear', 'rear-a', 'rearB', 'rear_b']);
});

test('numbered order reads a digit run as a number and keeps the order total', () => {
  assert.deepEqual(['press-10', 'press-9', 'press-2b', 'press-2a'].sort(compareNumbered), ['press-2a', 'press-2b', 'press-9', 'press-10']);
  assert.notEqual(compareNumbered('x2', 'x02'), 0);
});
