// The leaf cut, drawn and read back: what each test holds is the shader's promise, whatever a look's numbers are.
import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import type { Vec3 } from '../../src/patch.ts';
import type { LeafInputs, LeafSurface } from '../../src/schema.ts';
import { lookOf } from '../looks.ts';
import { openSurfaceTest } from './harness.ts';
import type { DrawSpec, View } from './page/cases.ts';

const call = await openSurfaceTest();

const leaf = lookOf('leaf');
const at = (coverage: number): LeafSurface => ({ ...leaf, coverage });

// 8 m across 512 pixels: a pixel is 1/64 m, exact in binary, so a whole-pixel camera step is exact too.
const VIEW: View = { centre: [0, 0], width: 8, pixels: 512 };
const PIXEL = VIEW.width / VIEW.pixels;
const MODEL: Vec3 = [4 * VIEW.width, 4 * VIEW.width, 1];

/** A see-through capsule along the view's axis through `centre`, so it crosses the face as a disc. */
const capsule = (centre: readonly [number, number], radius: number, edge: number): LeafInputs => ({
  eye: [centre[0], centre[1], 20],
  player: [centre[0], centre[1], -20],
  nearCoverage: 0,
  seeRadius: radius,
  seeEdge: edge,
});
// A capsule far off the face opens nothing on it, while its near coverage of 0 would show if it did.
const FAR_AWAY = capsule([1000, 1000], 0, 0);

const drawLeaf = (name: string, spec: Partial<DrawSpec> & { surface: LeafSurface }) =>
  call('draw', name, { pass: 'colour', colour: [0.2, 0.4, 0.1], model: MODEL, view: VIEW, light: 'none', ...spec });

/**
 * How far a kept share may stray from the coverage over `area` square metres. Each cell's fixed rank is an
 * independent uniform draw, so the kept share is the area-weighted mean of n = area / cell² Bernoulli(c) draws. The
 * face cuts the jittered 3D lattice's cells into pieces of unequal area, which at most doubles that mean's variance
 * against n equal pieces, so the bound is four of its standard deviations: 4·√(2·c(1−c)/n).
 */
const tolerance = (coverage: number, area: number) =>
  4 * Math.sqrt((2 * coverage * (1 - coverage)) / (area / leaf.cell ** 2));

const COVERAGES = [0.25, 0.5, 0.75, 1];

// The face at each coverage, with no see-through on it, which the tests below hold other frames against.
before(async () => {
  for (const coverage of COVERAGES) await drawLeaf(`coverage-${coverage}`, { surface: at(coverage), inputs: FAR_AWAY });
});

test('the kept share of a leaf face equals its coverage', async () => {
  for (const coverage of COVERAGES) {
    const { share } = await call('kept', `coverage-${coverage}`);
    const bound = tolerance(coverage, VIEW.width ** 2);
    console.log(`coverage ${coverage}: kept ${share.toFixed(4)}, allowed ±${bound.toFixed(4)}`);
    assert(Math.abs(share - coverage) <= bound, `coverage ${coverage} kept ${share}`);
  }
});

test('a lower coverage only adds holes', async () => {
  for (const [lower, higher] of COVERAGES.slice(0, -1).map((low, i) => [low, COVERAGES[i + 1]] as const)) {
    const { onlyA, compared } = await call('difference', `coverage-${lower}`, `coverage-${higher}`);
    console.log(`coverage ${lower} against ${higher}: ${onlyA} of ${compared} pixels kept only at the lower`);
    assert.equal(onlyA, 0, `${onlyA} pixels kept at ${lower} and cut at ${higher}`);
  }
});

test('outside the see-through capsule the base coverage applies, inside it the near coverage', async () => {
  const base = 0.75;
  const centre = [1, 0.5] as const;
  const radius = 1.5;
  const edge = 0.5;
  await drawLeaf('locality', { surface: at(base), inputs: capsule(centre, radius, edge) });
  // A cell goes or stays by where its centre lies, which is within about a cell of any pixel in it; two cells of
  // margin keep every counted pixel's cell on one side of the capsule's edge.
  const margin = 2 * leaf.cell;
  const inside = await call('kept', 'locality', { centre, from: 0, to: radius - margin });
  const beyond = radius + edge + margin;
  const outside = await call('kept', 'locality', { centre, from: beyond, to: Number.MAX_VALUE });
  const bound = tolerance(base, outside.pixels * PIXEL ** 2);
  console.log(
    `locality: inside ${inside.share} of ${inside.pixels} px (near coverage 0), ` +
      `outside ${outside.share.toFixed(4)} of ${outside.pixels} px (base ${base} ±${bound.toFixed(4)})`,
  );
  assert.equal(inside.share, 0);
  assert(Math.abs(outside.share - base) <= bound, `outside the capsule kept ${outside.share}`);
});

test('the holes are stable: a frame draws the same twice, and a camera step moves them with the face', async () => {
  const surface = at(0.5);
  await drawLeaf('again', { surface, inputs: FAR_AWAY });
  const again = await call('difference', 'coverage-0.5', 'again');
  const step = 7;
  const view = { ...VIEW, centre: [VIEW.centre[0] + step * PIXEL, VIEW.centre[1]] as const };
  await drawLeaf('stepped', { surface, inputs: FAR_AWAY, view });
  const stepped = await call('difference', 'coverage-0.5', 'stepped', step);
  console.log(
    `stable: redraw differs in ${again.onlyA + again.onlyB} of ${again.compared} px; ` +
      `a ${step}-pixel step in ${stepped.onlyA + stepped.onlyB} of ${stepped.compared} px`,
  );
  assert.deepEqual([again.onlyA, again.onlyB], [0, 0]);
  assert.deepEqual([stepped.onlyA, stepped.onlyB], [0, 0]);
});

// The depth pass stands for both shadow passes, which share their edits; three draws the distance material only from
// within a point light's shadow map.
test('the depth pass cuts at the base coverage whatever the game inputs', async () => {
  const surface = at(0.5);
  // A capsule over the whole face, which empties the lit pass.
  const open = capsule(VIEW.centre, VIEW.width, 0);
  await drawLeaf('opened', { surface, inputs: open });
  assert.equal((await call('kept', 'opened')).share, 0, 'the lit pass opens under the capsule');
  await drawLeaf('depth', { surface, inputs: open, pass: 'depth' });
  const { onlyA, onlyB, compared } = await call('difference', 'depth', 'coverage-0.5');
  console.log(`depth pass under the capsule against the lit pass without it: ${onlyA + onlyB} of ${compared} px`);
  assert.deepEqual([onlyA, onlyB], [0, 0]);
});
