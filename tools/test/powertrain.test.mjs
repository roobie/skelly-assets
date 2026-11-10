import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { evaluateJsonnet } from '../jsonnet/index.mjs';

const repo = resolve(import.meta.dirname, '../..');

// A saloon, whose engine is fitted as an assembly, made electric: every part an engine kit draws must go with the
// engine, or the variant would carry a starter motor or an exhaust with nothing to serve.
test('an electric variant fits no part of its parent\'s combustion drive', () => {
  const { left, kitParts } = JSON.parse(evaluateJsonnet(`
    local powertrain = import 'models/vehicles/powertrain.libsonnet';
    local drive = { part: 'fixture_drive', at: [0, 0, 0] };
    local kits = [
      import 'models/vehicles/engine-kit.libsonnet',
      import 'models/vehicles/cooling-kit.libsonnet',
      import 'models/vehicles/fuel-tank-kit.libsonnet',
      import 'models/vehicles/exhaust-kit.libsonnet',
    ];
    {
      left: [placed.part for placed in powertrain.electric((import 'models/vehicles/saloon.placements.libsonnet').sites, { motor: drive, inverter: drive, pack: drive, port: drive })],
      kitParts: std.flattenArrays([[row.id for row in kit.rows] for kit in kits]),
    }`, repo));
  assert.ok(left.length > 0);
  const kept = left.filter((part) => kitParts.includes(part));
  assert.deepEqual(kept, []);
});
