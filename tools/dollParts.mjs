// @ts-check
// What of a doll only its catalogue rows say. It is apart from tools/dress.mjs because it loads the thing tool's
// catalogue: a check that dresses built models (tools/restPoke.mjs, tools/wields.mjs) is keyed by the code it imports
// (tools/importClosure.mjs), and must not be keyed by a tool whose models it reads as bytes.
/** @import { DollDressing, DollParts } from './dress.mjs' */
import { dollModels } from './dress.mjs';

/**
 * What a manifest's `wornOn` needs of the doll's catalogue rows, since the built sidecars keep only points: the part
 * each bust anchor lies on, `anchors`, and the parts of the limbs, `sided`, which the doll has a copy of on each side.
 * Import only after installJsonnetSources, as the catalogue reads the compiled rows.
 * @param {DollDressing} dressing
 * @returns {Promise<DollParts>}
 */
export async function readDollParts(dressing) {
  const { readItems } = await import('./packages/thing-authoring-tool/src/cli/content.ts');
  const [bust, ...limbs] = readItems(dollModels(dressing));
  return {
    anchors: Object.fromEntries(Object.entries(bust?.anchors ?? {}).map(([name, { part }]) => [name, part])),
    sided: limbs.flatMap(({ parts }) => parts.map(({ id }) => id)),
  };
}
