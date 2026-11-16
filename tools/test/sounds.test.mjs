import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { outputPath, readSoundRows } from '../layout.mjs';
import { buildManifest, readCredits, soundManifest } from '../manifest.mjs';
import { bakeSounds, SOUND_SAMPLE_RATE } from '../sounds.mjs';

test('the bake writes every sound row as data and a take per seed, and the manifest names each row and its files', async () => {
  const out = mkdtempSync(join(tmpdir(), 'sounds-'));
  try {
    const files = await bakeSounds(out);
    const rows = readSoundRows();
    assert.ok(rows.length > 0, 'no sound rows to bake');
    const { sounds, files: named } = soundManifest(rows, SOUND_SAMPLE_RATE);
    assert.deepEqual([...files].sort(), [...named].sort());
    const manifest = buildManifest({ models: [], sounds, files, credit: readCredits() });
    for (const { id, pack, row, data, variants } of rows) {
      const entry = manifest.sounds.find((sound) => sound.pack === pack && sound.id === id);
      assert.ok(entry, `${pack}/${id} has no manifest entry`);
      assert.deepEqual(JSON.parse(readFileSync(join(out, outputPath(pack, data)), 'utf8')), row);
      assert.deepEqual(entry.variants.map(({ seed }) => seed), row.seeds);
      for (const { path } of variants) {
        const file = join(out, outputPath(pack, path));
        assert.ok(existsSync(file), `${file} is not written`);
        assert.equal(readFileSync(file).subarray(0, 4).toString('latin1'), 'OggS', `${file} is not an Ogg file`);
      }
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
