import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { SITE_FILES, unlinkedTools } from '../../site/tools.mjs';

test('a served tool page or viewer that no link names is reported, and a linked one is not', () => {
  const out = mkdtempSync(join(tmpdir(), 'site-tools-'));
  try {
    for (const file of ['index.html', 'linked.html', 'stray.html', 'app.js']) writeFileSync(join(out, file), '');
    for (const dir of ['shown', 'hidden']) {
      mkdirSync(join(out, dir));
      writeFileSync(join(out, dir, 'index.html'), '');
    }
    mkdirSync(join(out, 'built'));
    const linked = [{ label: 'Linked', page: 'linked.html' }, { label: 'Shown', viewer: 'shown' }];
    assert.deepEqual(unlinkedTools(out, linked), ['hidden/', 'stray.html']);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test('every module a shipped site page imports from its own folder is shipped too', () => {
  const site = join(import.meta.dirname, '../../site');
  const scripts = SITE_FILES.filter((f) => /\.m?js$/.test(f));
  const imported = new Set(scripts.flatMap((f) => [...readFileSync(join(site, f), 'utf8').matchAll(/from '\.\/([\w-]+\.mjs)'/g)].map(([, module]) => module)));
  assert.ok(imported.size > 0);
  for (const module of imported) assert.ok(SITE_FILES.includes(module), `${module} is imported by a shipped site page but not in SITE_FILES`);
});
