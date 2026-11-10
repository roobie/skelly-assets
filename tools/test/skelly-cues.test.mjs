import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cueIssues, SKELLY_URL, trackedCueIssues } from '../skelly-cues.mjs';

// Built rather than written out, so this file holds no cue in the form it refuses.
const possessive = (product) => `${product}'s `;

test('the canonical form passes, with a symbol, a section or a wrapped comment line', () => {
  const text = [
    `See ${SKELLY_URL}, \`packages/deadvox/src/core/items.ts\`, \`typeWeightGrams\`.`,
    `See ${SKELLY_URL}, \`things/README.md\`, "Rules".`,
    `// meets the gun where ${SKELLY_URL},`,
    '// `packages/deadvox/src/content/base/models-firearms.libsonnet`, `slung`, hangs it.',
    `Issues live at ${SKELLY_URL}/issues/109.`,
  ].join('\n');
  assert.deepEqual(cueIssues(text), []);
});

test('a prose cue is refused, whichever product names it', () => {
  const text = `see ${possessive('skelly')}\`AGENTS.md\`, "Tests"\nand ${possessive('Deadvox')}\`railFootprint\``;
  assert.deepEqual(
    cueIssues(text).map(({ line }) => line),
    [1, 2],
  );
});

test('a line number, a pinned link or a path outside the root is refused', () => {
  const text = [
    `${SKELLY_URL}, \`packages/deadvox/src/core/items.ts:12\``,
    `${SKELLY_URL}, \`packages/deadvox/src/core/items.ts#L12\``,
    `${SKELLY_URL}/blob/a9e5105/packages/deadvox/src/core/items.ts`,
    `${SKELLY_URL}, \`../skelly/AGENTS.md\``,
  ].join('\n');
  assert.deepEqual(
    cueIssues(text).map(({ line }) => line),
    [1, 2, 3, 4],
  );
});

test('every tracked file cues skelly in the canonical form', () => {
  assert.deepEqual(trackedCueIssues(), []);
});
