import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import process from 'node:process';
import { test } from 'node:test';
import { serveSite } from '../reviewSite.mjs';

// The review tools may be handed a site and a built tree as paths relative to the working directory.
test('serveSite reads a model from a built tree given by a relative path', async () => {
  const root = mkdtempSync(join(tmpdir(), 'review-site-'));
  const site = join(root, 'site');
  const built = join(root, 'built');
  mkdirSync(site);
  mkdirSync(join(built, 'models'), { recursive: true });
  writeFileSync(join(built, 'models', 'crate.glb'), 'glb');
  const server = await serveSite(relative(process.cwd(), site), relative(process.cwd(), built));
  try {
    const response = await fetch(`${server.origin}/built/models/crate.glb`);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), 'glb');
  } finally {
    server.close();
    rmSync(root, { recursive: true, force: true });
  }
});
