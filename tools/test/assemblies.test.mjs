import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ASSEMBLY_SUFFIX, readAssemblies } from '../assemblies.mjs';
import { readPlacements } from '../placements.mjs';
import { toModelFrame } from '../packages/thing-core/src/frame.ts';

const assemblies = readAssemblies();

test('each assembly is a core at its own origin with at least one part fitted to it, under an id of its own', () => {
  assert.ok(assemblies.length > 0);
  for (const { id, sites: [core, ...fitted] } of assemblies) {
    assert.ok(id.endsWith(ASSEMBLY_SUFFIX), id);
    assert.deepEqual(core.at, [0, 0, 0], id);
    assert.ok(fitted.length > 0, id);
  }
  assert.equal(new Set(assemblies.map(({ id }) => id)).size, assemblies.length);
});

// An assembly drawn on its own must look as its kit fits it to a vehicle, or its review would judge another layout.
test('an assembly lays its parts out about its core as every vehicle that fits it whole does', () => {
  const vehicles = Object.values(readPlacements()).map(({ forward, sites }) =>
    sites.map((site) => ({ ...site, at: toModelFrame(forward, site.at) })));
  const close = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 1e-9);
  let checked = 0;
  for (const { id, sites: [core, ...fitted] } of assemblies) {
    for (const sites of vehicles) {
      const cores = sites.filter(({ part, mirror }) => part === core.part && !mirror);
      if (cores.length === 0 || !fitted.every(({ part }) => sites.some((site) => site.part === part))) continue;
      const fits = (base) => fitted.every(({ part, at }) =>
        sites.some((site) => site.part === part && close(site.at, base.at.map((v, i) => v + at[i]))));
      assert.ok(cores.some(fits), `${id} is laid out unlike a vehicle that fits ${core.part}`);
      checked += 1;
    }
  }
  assert.ok(checked > 0);
});
