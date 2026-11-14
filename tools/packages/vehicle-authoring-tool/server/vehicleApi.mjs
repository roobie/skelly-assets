// What the Vehicles view asks of the dev server: each placement vehicle's swing verdicts, and a proposed fix for one site
// that fails. Jsonnet is evaluated here in Node, so the browser never does. The checker and the proposer are the build's
// own (tools/swingClearance.mjs, tools/swingPropose.mjs); this module only reads their results into the shape the view
// shows. It proposes and writes nothing: the author hand-merges a proposal, as with Save (see the README).
import { DEFAULT_CACHE } from '../../../generation.mjs';
import { readSitePieces } from '../../../siteOverlap.mjs';
import { swingReport, swingResults } from '../../../swingClearance.mjs';
import { workerPool } from '../../../workerPool.mjs';

export function vehicleApi({ root, cache = DEFAULT_CACHE }) {
  // The first request pays for evaluating every vehicle and sweeping the ones the cache lacks; later ones reuse it.
  let loaded;
  const load = () => {
    loaded ??= (async () => {
      const pieces = readSitePieces(root);
      const { results } = await swingResults(pieces, { cache });
      return { pieces, report: swingReport(pieces, results) };
    })();
    return loaded;
  };
  return {
    // Every placement vehicle as { sites: { site: verdict } }, vehicles with nothing that moves having no sites.
    async verdicts() {
      const { pieces, report } = await load();
      return {
        vehicles: Object.fromEntries(Object.keys(pieces.vehicles).sort().map((vehicle) => [vehicle, { sites: report.verdicts[vehicle] ?? {} }])),
        notes: report.notes,
      };
    },
    async solve(vehicle, site) {
      const { pieces, report } = await load();
      const verdict = report.verdicts[vehicle]?.[site];
      if (!verdict) throw new Error(`${vehicle} has no moving site ${site}`);
      // Only what the search reads goes to the worker: this vehicle and the parent whose allowances it inherits.
      const family = [vehicle, pieces.vehicles[vehicle].parent].filter(Boolean);
      const task = { pieces: { ...pieces, vehicles: Object.fromEntries(family.map((name) => [name, pieces.vehicles[name]])) }, vehicle, site };
      const pool = workerPool(new URL('../../../swingPropose.mjs', import.meta.url), 'proposeTask', 1);
      try {
        return { vehicle, site, part: verdict.part, ...(await pool.run(task)) };
      } finally {
        await pool.close();
      }
    },
  };
}
