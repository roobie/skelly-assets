// The export CLI's logic, importable so tests run it in-process; `export.ts` is the argv wrapper.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { modelEntryJson } from '@skelly/thing-export/files.ts';
import { recipeVoxel } from '@skelly/thing-export/recipe.ts';
import type { DeadvoxModelFile } from '../gun/exportGlb.ts';
import gunVoxel from '../gun/gunVoxel.json' with { type: 'json' };
import { exportFileText } from './exportFile.ts';
import { readCartridge } from './readCartridge.ts';

const USAGE =
  'usage: export <design-or-fixture.json> [--out <dir>] [--entry-out <dir>] [--id <model_id>] [--calibre <cartridge_id>]';

const flag = (args: string[], name: string): string | undefined => {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : undefined;
};

export const runExport = (args: string[], log: Pick<Console, 'log' | 'warn' | 'error'> = console): number => {
  const input = args.find((a, i) => !(a.startsWith('--') || args[i - 1]?.startsWith('--')));
  if (!input) {
    log.error(USAGE);
    return 2;
  }
  const out = flag(args, '--out') ?? '.';
  const entryOut = flag(args, '--entry-out') ?? out;
  const id = flag(args, '--id') ?? basename(input, '.json').replaceAll('-', '_');
  const cartridgeResult = readCartridge(flag(args, '--calibre'));
  if (!cartridgeResult.ok) {
    log.error(`FAIL --calibre: ${cartridgeResult.message}`);
    return 2;
  }
  const result = exportFileText(
    readFileSync(input, 'utf8'),
    {
      id,
      file: `assets/models/${id}.glb` as DeadvoxModelFile,
    },
    cartridgeResult.cartridge === undefined ? {} : { cartridge: cartridgeResult.cartridge },
    recipeVoxel({ voxel: gunVoxel }),
  );
  if (!result.ok) {
    log.error(`FAIL ${input}: ${result.message}`);
    return 1;
  }
  for (const warning of result.warnings) {
    log.warn(`WARN ${input}: ${warning}`);
  }
  mkdirSync(out, { recursive: true });
  mkdirSync(entryOut, { recursive: true });
  const glbPath = join(out, `${id}.glb`);
  const entryPath = join(entryOut, `${id}.model.json`);
  writeFileSync(glbPath, result.glb);
  writeFileSync(entryPath, modelEntryJson(result.modelEntry));
  log.log(`wrote ${glbPath} (${result.glb.byteLength} bytes)`);
  log.log(`wrote ${entryPath}`);
  return 0;
};
