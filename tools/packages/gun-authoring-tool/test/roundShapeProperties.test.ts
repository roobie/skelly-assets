import validator from 'gltf-validator';
import { describe, expect, it } from 'vitest';
import type { Cartridge, MetallicCartridge, Shotshell } from '../src/ammo/cartridge.ts';
import { primerPocket, roundProfiles } from '../src/ammo/roundProfile.ts';
import { roundShape, SHOTSHELL_PRIMER } from '../src/ammo/roundShape.ts';
import { exportCartridgeModels } from '../src/gun/cartridgeExport.ts';
import { shotshellGeometry } from '../src/gun/shotshellGeometry.ts';
import { loadCartridges, mustParse, SYNTHETIC_METALLIC_SHAPES, syntheticJson } from './ammoHelpers.ts';

type Point = readonly [axial: number, radius: number];

// The roster and a synthetic round of every case shape, so a shape the roster lacks still holds the properties.
const cartridges: Cartridge[] = [
  ...loadCartridges(),
  ...SYNTHETIC_METALLIC_SHAPES.map((shape) => mustParse(syntheticJson(shape), shape)),
];
const metallic = cartridges.filter((cartridge): cartridge is MetallicCartridge => cartridge.kind !== 'shotshell');
const shotshells = cartridges.filter((cartridge): cartridge is Shotshell => cartridge.kind === 'shotshell');
const radii = (profile: readonly Point[]): number[] => profile.map(([, radius]) => radius);
const axials = (profile: readonly Point[]): number[] => profile.map(([axial]) => axial);

describe.each(metallic.map((cartridge) => [cartridge.id, cartridge] as const))('%s round shape', (id, cartridge) => {
  const shape = roundShape(id);
  const profiles = roundProfiles(cartridge);
  const body = profiles.bullet[1]![1];

  it('stands its driving band, if it has one, proud of the projectile body', () => {
    if (profiles.band === undefined) {
      expect(shape.projectile.band).toBeNull();
      return;
    }
    expect(Math.max(...radii(profiles.band))).toBeGreaterThan(body);
    expect(Math.min(...radii(profiles.band))).toBeCloseTo(body, 9);
  });

  it('seats the primer inside its pocket and the pocket inside the case head, short of the fired floor', () => {
    const pocket = primerPocket(shape.primer);
    const pocketRadius = pocket[1]![1];
    expect(Math.max(...radii(profiles.primer))).toBeLessThan(pocketRadius);
    expect(Math.min(...axials(profiles.primer))).toBeGreaterThan(0);
    expect(Math.max(...axials(profiles.primer))).toBeLessThanOrEqual(shape.primer.pocketDepth);
    const head = profiles.loadedCase.slice(pocket.length).filter(([axial]) => axial <= shape.primer.pocketDepth);
    expect(head.length).toBeGreaterThan(0);
    expect(Math.min(...radii(head))).toBeGreaterThan(pocketRadius);
    const [floor] = profiles.firedCase.at(-1)!;
    expect(shape.primer.pocketDepth).toBeLessThan(floor);
  });

  it('leaves the body on a tangent ogive: one circle, centred square across from where the body ends', () => {
    // The junction, then each ogive point to the nose.
    const [junction, ...arc] = profiles.bullet.slice(2, 3 + shape.projectile.ogive.segments) as Point[];
    const [start, radius] = junction!;
    const centreRadius = (point: Point): number =>
      (radius ** 2 - (point[0] - start) ** 2 - point[1] ** 2) / (2 * (radius - point[1]));
    const centre = centreRadius(arc.at(-1)!);
    expect(radius - centre).toBeGreaterThan(0);
    for (const point of arc) {
      expect(Math.hypot(point[0] - start, point[1] - centre)).toBeCloseTo(radius - centre, 6);
      expect(point[0]).toBeGreaterThan(start);
    }
  });
});

describe.each(shotshells.map((shell) => [shell.id, shell] as const))('%s shotshell head', (_id, shell) => {
  it('seats its primer, if it is drawn with one, inside its pocket and short of the head height', () => {
    const geometry = shotshellGeometry(shell);
    const primer = geometry.case.find((solid) => solid.id === 'primer');
    if (SHOTSHELL_PRIMER === null) {
      expect(primer).toBeUndefined();
      return;
    }
    if (primer?.kind !== 'revolved') {
      throw new Error('shotshell case has no revolved primer');
    }
    const pocketRadius = primerPocket(SHOTSHELL_PRIMER)[1]![1];
    expect(Math.max(...radii(primer.profile))).toBeLessThan(pocketRadius);
    expect(pocketRadius).toBeLessThan(shell.head.rimDiameter.value! / 2);
    expect(Math.max(...axials(primer.profile))).toBeLessThan(shell.head.height.value!);
  });
});

describe.each(cartridges.map((cartridge) => [cartridge.id, cartridge] as const))('%s', (_id, cartridge) => {
  it('validates and exports valid round and case GLBs', async () => {
    const result = exportCartridgeModels(cartridge);
    if (!result.ok) {
      throw new Error(JSON.stringify(result.error));
    }
    for (const model of [result.models.round, result.models.case]) {
      const report = await validator.validateBytes(model.glb);
      expect(report.issues.numErrors).toBe(0);
    }
  });
});
