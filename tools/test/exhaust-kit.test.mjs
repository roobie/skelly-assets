import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { evaluateJsonnet } from '../jsonnet/index.mjs';
import { meeting, shapes } from './pieces.mjs';

const repo = resolve(import.meta.dirname, '../..');

// Each exhaust fitted both ways at one spot, with the rows each way fits. Pieces are compared in the vehicle frame,
// each part's moved to where its site puts it, so a mismatch is one fitting drawing something the other does not. An
// exhaust has no core, so it is held to its own run rather than to `tools/test/assembly-kits.test.mjs`.
const exhausts = Object.entries(JSON.parse(evaluateJsonnet(`
  local kit = import 'models/vehicles/kit.libsonnet';
  local exhaust = import 'models/vehicles/exhaust-kit.libsonnet';
  local at = [1, 0.5, 0.25];
  local byId = { [row.id]: row for row in exhaust.rows };
  local drawn(placed) =
    local body = byId[placed.part].parts[0];
    { site: placed.id, mass: body.massKg, pieces: [kit.moved(p, placed.at) for p in std.parseJson(body.params.pieces)], finish: body.finish };
  {
    [name]: {
      fused: [drawn(p) for p in exhaust.sites(name, at, 'fused')],
      assembly: [drawn(p) for p in exhaust.sites(name, at, 'assembly')],
    }
    for name in exhaust.names
  }`, repo)));

const near = (a, b) => Math.abs(a - b) < 1e-9;
// A heavy exhaust's run is metres long, so the sampling is coarser than a small part's, still finer than the grain.
const STEP = 0.004;

test('every exhaust is fitted either fused or as its parts', () => {
  assert.ok(exhausts.length > 0);
  for (const [name, { fused, assembly }] of exhausts) {
    assert.equal(fused.length, 1, name);
    assert.ok(assembly.length > 1, `${name}'s assembly has parts`);
    assert.equal(new Set(assembly.map((d) => d.site)).size, assembly.length, `${name}'s assembly sites are distinct`);
  }
});

test('an exhaust weighs the same fused as assembled', () => {
  for (const [name, { fused, assembly }] of exhausts) {
    const total = assembly.reduce((sum, d) => sum + d.mass, 0);
    assert.ok(near(fused[0].mass, total), `${name}: fused ${fused[0].mass} kg, assembly ${total} kg`);
  }
});

test('an exhaust looks the same fused as assembled', () => {
  for (const [name, { fused, assembly }] of exhausts) assert.deepEqual(shapes(fused), shapes(assembly), name);
});

test("an assembled exhaust's parts meet end to end along its run and cut into nothing", () => {
  for (const [name, { assembly }] of exhausts) {
    // The sites list the pipes and then the class's parts; along the run each pipe is followed by the next part.
    const pipes = assembly.filter((d) => d.site.startsWith('exhaust_'));
    const parts = assembly.filter((d) => !d.site.startsWith('exhaust_'));
    const run = pipes.flatMap((pipe, i) => (i < parts.length ? [pipe, parts[i]] : [pipe]));
    assert.equal(run.length, assembly.length, name);
    for (let i = 1; i < run.length; i++) {
      assert.ok(meeting(run[i - 1].pieces, run[i].pieces, STEP).touches, `${name}: ${run[i].site} floats clear of ${run[i - 1].site}`);
    }
    for (const [i, part] of run.entries()) {
      for (const other of run.slice(i + 1)) assert.ok(!meeting(part.pieces, other.pieces, STEP).overlaps, `${name}: ${part.site} cuts into ${other.site}`);
    }
  }
});
