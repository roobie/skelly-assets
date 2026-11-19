// Bark, drawn and read back: it shades its finish without recolouring it, fades what a pixel cannot hold, and runs
// its furrows along its grain.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { finite, looseObject, number, parse, pipe, record, string, tuple } from 'valibot';
import { evaluateJsonnet } from '../../../../jsonnet/index.mjs';
import type { Vec3 } from '../../src/patch.ts';
import type { BarkSurface } from '../../src/schema.ts';
import { LOOKS } from '../looks.ts';
import { openSurfaceTest } from './harness.ts';
import type { Light, View } from './page/cases.ts';

const call = await openSurfaceTest();

const Channel = pipe(number(), finite());
const FINISHES = parse(
  record(string(), looseObject({ colour: tuple([Channel, Channel, Channel]) })),
  JSON.parse(evaluateJsonnet("import 'models/finishes.jsonnet'")),
);

const barkLook = (name: string) => {
  const look = LOOKS[name];
  if (look?.kind !== 'bark') throw new Error(`${name} is no bark look`);
  return look;
};
const colourOf = (finish: string) => {
  const colour = FINISHES[finish]?.colour;
  if (colour === undefined) throw new Error(`no finish ${finish}`);
  return colour;
};

/** Each bark look with the colour of a finish that wears it. */
const WORN = [
  ['bark-log', 'bark'],
  ['bark-furrowed', 'bark'],
  ['bark-birch', 'bark-birch'],
] as const;

interface Scene {
  readonly surface?: BarkSurface;
  readonly colour: Vec3;
  readonly model: Vec3;
  readonly view: View;
  readonly light: Light;
}

/** Draws a scene and measures its shade. */
const shadeOf = async (name: string, scene: Scene) => {
  await call('draw', name, { pass: 'colour', ...scene });
  return call('shade', name);
};

/** A box that fills `view` with its front face. */
const filling = (view: View): Vec3 => [4 * view.width, 4 * view.width, 1];

// 8 m across 2048 pixels, about 4 mm a pixel: wide against the slow mottle, and fine enough that the furrows show
// unfaded.
const WIDE: View = { centre: [0, 0], width: 8, pixels: 2048 };

/**
 * How far the mean shade of a face `width` metres across may stray from the colour. Every term averages to nothing
 * by construction, so what is left is chance: the mottle's lattice values, uniform with deviation 1/√12 and about
 * (width/span)² of them weighing on the face, and each plate's own offset, uniform with deviation spread/√3 over
 * width²/(spacing·length) plates. The marks' share is an order smaller. The bound is four deviations of the two.
 */
const meanBound = (bark: BarkSurface, width: number) => {
  const mottle = ((2 * bark.mottle.amount) / Math.sqrt(12)) * (bark.mottle.span / width);
  const plates = (bark.plate.spread / Math.sqrt(3)) * (Math.sqrt(bark.furrow.spacing * bark.plate.length) / width);
  return 4 * Math.hypot(mottle, plates);
};

for (const [lookName, finish] of WORN)
  test(`${lookName} keeps the mean colour of the ${finish} finish`, async () => {
    const surface = barkLook(lookName);
    const scene = { colour: colourOf(finish), model: filling(WIDE), view: WIDE, light: 'ambient' } as const;
    const plain = await shadeOf('plain', scene);
    const patched = await shadeOf('patched', { ...scene, surface });
    const bound = meanBound(surface, WIDE.width);
    const strays = patched.mean.map((channel, i) => Math.abs(channel / (plain.mean[i] ?? 0) - 1));
    console.log(
      `${lookName}: mean strays ${strays.map((each) => each.toFixed(4)).join(', ')} of the plain mean, ` +
        `allowed ${bound.toFixed(4)}; the shade's variance ${patched.variance.toFixed(4)}`,
    );
    // The face shows its bark, so the mean is a test of the shading and not of a blank face.
    assert(patched.variance > 1e-3, `${lookName} shows no bark: variance ${patched.variance}`);
    for (const stray of strays) assert(stray <= bound, `${lookName} recolours its finish by ${stray}`);
  });

/** The longest length a look names, which bounds every feature it draws. */
const longest = (bark: BarkSurface) =>
  Math.max(
    bark.furrow.spacing,
    bark.plate.length,
    bark.mottle.span,
    ...[bark.lenticels, bark.patches].flatMap(({ cellAcross, cellAlong }) => [cellAcross, cellAlong]),
  );

const NEAR: View = { centre: [0, 0], width: 0.5, pixels: 256 };

for (const [lookName, finish] of WORN)
  for (const light of ['ambient', 'directional'] as const)
    test(`${lookName}'s detail fades with distance under ${light} light`, async () => {
      const surface = barkLook(lookName);
      // Twice past the end of the fade band for the look's longest feature, so every feature is past it.
      const far: View = { ...NEAR, width: NEAR.pixels * 2 * longest(surface) * surface.fade.to };
      const scene = { surface, colour: colourOf(finish), light } as const;
      const near = await shadeOf('near', { ...scene, model: filling(NEAR), view: NEAR });
      const away = await shadeOf('far', { ...scene, model: filling(far), view: far });
      console.log(
        `${lookName}, ${light}: variance ${near.variance.toExponential(3)} at ${NEAR.width / NEAR.pixels} m a pixel, ` +
          `${away.variance.toExponential(3)} at ${far.width / far.pixels} m`,
      );
      assert(near.variance > 1e-3, `${lookName} shows no detail near: ${near.variance}`);
      assert(away.variance <= 1e-3 * near.variance, `${lookName} keeps detail far: ${away.variance}`);
    });

// Narrow enough that the furrows are unfaded, on a box longer along x.
const GRAIN_VIEW: View = { centre: [0, 0], width: 1, pixels: 256 };
const LONG_ALONG_X: Vec3 = [8, 2, 1];

test('bark furrows run along its grain: the longest side for a log, up for a trunk', async () => {
  const scene = { colour: colourOf('bark'), model: LONG_ALONG_X, view: GRAIN_VIEW, light: 'ambient' } as const;
  const log = await shadeOf('log', { ...scene, surface: barkLook('bark-log') });
  const trunk = await shadeOf('trunk', { ...scene, surface: barkLook('bark-furrowed') });
  const logRatio = log.stepAlongX / log.stepAlongY;
  const trunkRatio = trunk.stepAlongY / trunk.stepAlongX;
  console.log(
    `grain: a log's steps along x are ${logRatio.toFixed(3)} of those along y; a trunk's along y ${trunkRatio.toFixed(3)} of those along x`,
  );
  // Along a furrow the shade changes only at a plate's cross crack or as the furrow wanders, across it at every one.
  assert(logRatio < 0.5, `a log's furrows do not run along x: ${logRatio}`);
  assert(trunkRatio < 0.5, `a trunk's furrows do not run up: ${trunkRatio}`);
});
