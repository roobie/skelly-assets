// The catalogue item a part of a compound model declares it is (`item` on the part in the model source), checked
// against the models the tree builds, since a part id is a local name that no other model need share.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SIDECAR = /\.model\.json$/;

// One line for each part whose declared item is no model of the tree, given every file written as <pack>/<logical path>.
export function danglingPartItems({ files, out, models }) {
  const ids = new Set(models.map(({ id }) => id));
  return files.filter((file) => SIDECAR.test(file)).flatMap((file) => {
    const { id, parts = {} } = JSON.parse(readFileSync(join(out, file), 'utf8'));
    return Object.entries(parts)
      .filter(([, { item }]) => item !== undefined && !ids.has(item))
      .map(([part, { item }]) => `${id}: part ${part} is item ${item}, which the tree does not build`);
  });
}
