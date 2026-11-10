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

// An assembly drawn on its own must look as its kit fits it to a vehicle, or its review would judge another layout. A
// vehicle fits a fitting at the site named as the kit names it about the core's site, so a part fitted elsewhere, such
// as the front wheels' brake on a car whose rear wheels have drums, is not taken for the core's own.
test('an assembly lays its parts out about its core as every vehicle that fits it whole does', () => {
  const vehicles = Object.values(readPlacements()).map(({ forward, sites }) =>
    new Map(sites.map((site) => [site.id, { ...site, at: toModelFrame(forward, site.at) }])));
  const close = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 1e-9);
  const near = '_near';
  let checked = 0;
  for (const { id, sites: [core, ...fitted] } of assemblies) {
    for (const sites of vehicles) {
      for (const placed of sites.values()) {
        if (placed.part !== core.part || placed.mirror) continue;
        const side = placed.id.endsWith(near) ? near : '';
        const stem = placed.id.slice(0, placed.id.length - side.length);
        const siteOf = (fitting) => (fitting.startsWith(core.id) ? stem + fitting.slice(core.id.length) : fitting) + side;
        const parts = fitted.map((fitting) => sites.get(siteOf(fitting.id)));
        if (!parts.every(Boolean)) continue;
        for (const [i, { part, at }] of fitted.entries()) {
          assert.equal(parts[i].part, part, `${id}: ${parts[i].id}`);
          assert.ok(close(parts[i].at, placed.at.map((v, j) => v + at[j])), `${id} is laid out unlike ${placed.id}`);
        }
        checked += 1;
      }
    }
  }
  assert.ok(checked > 0);
});
