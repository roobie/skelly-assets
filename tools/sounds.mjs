// @ts-check
// Usage: node tools/sounds.mjs [--out dir] [rowId ...]. With no ids it bakes every sound row of models/sounds/; each row
// is written under its pack as the row itself, as data, and one Ogg Vorbis file per seed (tools/layout.mjs,
// readSoundRows). tools/build.mjs names them in the manifest (tools/manifest.mjs, soundManifest).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { outputPath, readSoundRows, SOUNDS } from './layout.mjs';
import { encodeOgg } from './ogg.mjs';
import { installJsonnetSources } from './sources.mjs';

const repo = resolve(import.meta.dirname, '..');

// Every baked file's rate, which a render of the row and seed needs to give the file's samples again. 48 kHz is the
// rate browsers and game engines commonly mix at, so a player seldom resamples.
export const SOUND_SAMPLE_RATE = 48000;
// Vorbis quality: enough that a contact click, a few milliseconds of broadband noise, keeps its edge.
const QUALITY = 6;

/**
 * @param {string} out
 * @param {string} pack
 * @param {string} path
 * @param {string | Uint8Array} bytes
 */
const writeOut = (out, pack, path, bytes) => {
  const file = join(out, outputPath(pack, path));
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, bytes);
};

// Bakes the rows with the given ids, or every row, into out; returns the files written as <pack>/<logical path>.
/**
 * @param {string} out
 * @param {readonly string[]} [ids]
 */
export async function bakeSounds(out, ids) {
  await installJsonnetSources();
  const { impactPacks } = await import('./packages/impact-synth/src/rows.ts');
  const { renderImpact } = await import('./packages/impact-synth/src/synth.ts');
  const rows = readSoundRows(repo);
  const unknown = (ids ?? []).filter((id) => !rows.some((sound) => sound.id === id));
  if (unknown.length > 0) throw new Error(`not in ${SOUNDS}: ${unknown.join(' ')}`);
  /** @type {string[]} */
  const files = [];
  for (const { id, pack, data, variants } of rows.filter((sound) => !ids || ids.includes(sound.id))) {
    const row = impactPacks[pack]?.[id];
    if (row === undefined) throw new Error(`${SOUNDS}: ${pack} holds no impact row ${id}`);
    writeOut(out, pack, data, `${JSON.stringify(row, null, 2)}\n`);
    files.push(outputPath(pack, data));
    for (const { seed, path } of variants) {
      writeOut(
        out,
        pack,
        path,
        await encodeOgg(renderImpact(row, seed, SOUND_SAMPLE_RATE), {
          sampleRate: SOUND_SAMPLE_RATE,
          quality: QUALITY,
        }),
      );
      files.push(outputPath(pack, path));
    }
  }
  return files;
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { out: { type: 'string', default: join(repo, 'built') } },
  });
  const files = await bakeSounds(resolve(values.out), positionals.length > 0 ? positionals : undefined);
  for (const file of files) console.log(`built ${file}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
