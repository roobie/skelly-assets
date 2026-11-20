import { Mesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import { loadCatalogue } from '../src/catalogue.ts';
import { exportItem } from '../src/exports.ts';
import { avatarLeg } from '../src/families/avatarLimbs.ts';
import { bust } from '../src/families/bust.ts';
import toy from './fixtures/toy-ual.json' with { type: 'json' };

type Item = { id: string; parts: { params: Record<string, string> }[] };
type Piece = { id: string; kind: string; axis?: string; start?: number; end?: number; profile?: number[][] };

const VOXEL = { voxelGrain: 0.006 };
const settings = { units: toy.units, facets: toy.facets, defaultMaterial: toy.defaultMaterial };

/**
 * Each primitive of an item's voxel export: its area, and the area its outward faces leave unbalanced. A closed surface's
 * faces sum to nothing whichever way it is meshed, so the measure holds across the mesher's T-junctions.
 */
const primitives = async (item: Item) => {
  const loaded = loadCatalogue({ ...settings, items: [item] });
  const { glb } = exportItem(loaded.items[0]!, loaded, { id: item.id, file: `assets/models/${item.id}.glb` }, VOXEL);
  const { scene } = await new GLTFLoader().parseAsync(Uint8Array.from(glb).buffer, '');
  const found: { area: number; unbalanced: number }[] = [];
  scene.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    const position = node.geometry.getAttribute('position');
    const index = node.geometry.getIndex()!;
    const vertex = (i: number) => new Vector3().fromBufferAttribute(position, index.getX(i));
    const sum = new Vector3();
    let area = 0;
    for (let i = 0; i < index.count; i += 3) {
      const [a, b, c] = [vertex(i), vertex(i + 1), vertex(i + 2)];
      const face = new Vector3().crossVectors(b.sub(a), c.sub(a)).multiplyScalar(0.5);
      sum.add(face);
      area += face.length();
    }
    found.push({ area, unbalanced: sum.length() });
  });
  return found;
};

const params = (items: readonly Item[], id: string) => items.find((item) => item.id === id)!.parts[0]!.params;
const pieces = (rows: readonly Item[], id: string): Piece[] => JSON.parse(params(rows, id).pieces!);
const piece = (rows: readonly Item[], id: string, pieceId: string) => pieces(rows, id).find((p) => p.id === pieceId)!;
const origin = (part: string) => JSON.parse(params(toy.parts.bust, `toy_bust_${part}`).origins!)[part] as number[];

describe('a doll whose skeleton is not the player body', () => {
  // Each region of a part is its own primitive, so a closed primitive is a closed region.
  it.each([...toy.parts.bust, ...toy.parts.arm, ...toy.parts.leg])('exports $id as closed voxels', async (item) => {
    const found = await primitives(item);
    expect(found.length).toBeGreaterThan(0);
    for (const { area, unbalanced } of found) {
      expect(area).toBeGreaterThan(0);
      expect(unbalanced).toBeLessThan(area * 1e-6);
    }
  });

  it.each([...toy.garments.jacket, ...toy.garments.boot])('exports $id', async (item) => {
    const found = await primitives(item);
    expect(found.some(({ area }) => area > 0)).toBe(true);
  });

  it('draws each spine and ball part as one region, and the foot behind the ball in its own', () => {
    for (const item of [...toy.parts.bust, ...toy.parts.leg.filter(({ id }) => id === 'toy_leg_ball')]) {
      const family = item.parts[0]!.family === 'bust' ? bust : avatarLeg;
      expect(family(item.parts[0]!.params).filter((solid) => solid.display?.piece)).toEqual([]);
    }
    const foot = avatarLeg(params(toy.parts.leg, 'toy_leg_foot'));
    expect(new Set(foot.map((solid) => solid.display?.piece))).toEqual(new Set(['sole', 'ankle']));
  });

  it('refuses a chest cut away from the armpit, or cuts out of order', () => {
    const chest = params(toy.parts.bust, 'toy_bust_chest');
    const cut = (cuts: Partial<typeof toy.spineCuts>) =>
      bust({ ...chest, spineCuts: JSON.stringify({ ...toy.spineCuts, ...cuts }) });
    expect(() => cut({})).not.toThrow();
    expect(() => cut({ chest: toy.spineCuts.chest + 0.01 })).toThrow(/armpit/);
    expect(() => cut({ ribs: toy.spineCuts.chest + 0.001 })).toThrow(/in turn/);
  });

  it("cuts the torso garment at the bust's spine cuts, each shell in its part's frame", () => {
    const { jacket } = toy.garments;
    const level = (shell: string, id: string, part: string) => {
      const { start, end } = piece(jacket, `toy_jacket_worn_${shell}`, id);
      return [start! + origin(part)[1]!, end! + origin(part)[1]!];
    };
    expect(level('waist', 'ribs', 'waist')[1]).toBeCloseTo(toy.spineCuts.ribs, 9);
    expect(level('belly', 'ribs', 'ribs')[0]).toBeCloseTo(toy.spineCuts.ribs, 9);
    expect(level('belly', 'chest', 'ribs')[1]).toBeCloseTo(toy.spineCuts.chest, 9);
    expect(level('body', 'chest', 'chest')[0]).toBeCloseTo(toy.spineCuts.chest, 9);
    expect(Object.fromEntries(jacket.filter((row) => 'covers' in row).map((row) => [row.id, row.covers]))).toEqual({
      toy_jacket_worn_waist: ['waist'],
      toy_jacket_worn_belly: ['ribs'],
      toy_jacket_worn_body: ['chest'],
      toy_jacket_worn_fore: ['fore'],
    });
  });

  it("cuts the boot's toe off at the ball, in the ball's frame", () => {
    const { boot } = toy.garments;
    const vampZ = (id: string) => piece(boot, id, 'vamp').profile!.map(([, z]) => z!);
    expect(Math.min(...vampZ('toy_boot_worn_toe'))).toBeCloseTo(0, 9);
    const ball = JSON.parse(params(toy.parts.leg, 'toy_leg_ball').ballJoint!)[2] as number;
    const foot = JSON.parse(params(toy.parts.leg, 'toy_leg_ball').origins!).foot[2] as number;
    expect(Math.max(...vampZ('toy_boot_worn_foot'))).toBeCloseTo(ball - foot, 9);
    expect(boot.find(({ id }) => id === 'toy_boot_worn_toe')).toMatchObject({ covers: ['ball'] });
  });
});
