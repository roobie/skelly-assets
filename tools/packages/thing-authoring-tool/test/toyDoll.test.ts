import type { ExtrudedPolygonSolid } from '@skelly/construct/shapes/solid.ts';
import { Mesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import { loadCatalogue } from '../src/catalogue.ts';
import { exportItem } from '../src/exports.ts';
import { avatarArm, avatarLeg } from '../src/families/avatarLimbs.ts';
import { bust } from '../src/families/bust.ts';
import toy from './fixtures/toy-ual.json' with { type: 'json' };

type Item = { id: string; parts: { params: Record<string, string> }[] };
type Piece = { id: string; kind: string; axis?: string; start?: number; end?: number; profile?: number[][] };

const VOXEL = { voxelGrain: 0.006 };
const settings = { units: toy.units, facets: toy.facets, defaultMaterial: toy.defaultMaterial };

/**
 * Each primitive of an item's voxel export, in its part's frame: its area, the area its outward faces leave
 * unbalanced, its volume and its volume's first moment. A closed surface's faces sum to nothing whichever way it is
 * meshed, so the measure holds across the mesher's T-junctions.
 */
const primitives = async (item: Item) => {
  const loaded = loadCatalogue({ ...settings, items: [item] });
  const { glb } = exportItem(loaded.items[0]!, loaded, { id: item.id, file: `assets/models/${item.id}.glb` }, VOXEL);
  const { scene } = await new GLTFLoader().parseAsync(Uint8Array.from(glb).buffer, '');
  scene.updateMatrixWorld(true);
  const found: { area: number; unbalanced: number; volume: number; moment: Vector3 }[] = [];
  scene.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    const position = node.geometry.getAttribute('position');
    const index = node.geometry.getIndex()!;
    const vertex = (i: number) =>
      new Vector3().fromBufferAttribute(position, index.getX(i)).applyMatrix4(node.matrixWorld);
    const sum = new Vector3();
    const moment = new Vector3();
    let area = 0;
    let volume = 0;
    for (let i = 0; i < index.count; i += 3) {
      const [a, b, c] = [vertex(i), vertex(i + 1), vertex(i + 2)];
      // The tetrahedron each face spans with the frame's origin, signed by the face's facing.
      const tetra = a.dot(new Vector3().crossVectors(b, c)) / 6;
      volume += tetra;
      moment.add(
        a
          .clone()
          .add(b)
          .add(c)
          .multiplyScalar(tetra / 4),
      );
      const face = new Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a)).multiplyScalar(0.5);
      sum.add(face);
      area += face.length();
    }
    found.push({ area, unbalanced: sum.length(), volume, moment });
  });
  return found;
};

/** How far the centroid of an item's flesh lies from the line through its part's frame along `bone`. */
const offBone = async (item: Item, bone: readonly number[]) => {
  const found = await primitives(item);
  const volume = found.reduce((sum, p) => sum + p.volume, 0);
  const centroid = found.reduce((sum, p) => sum.add(p.moment), new Vector3()).divideScalar(volume);
  const along = new Vector3(...bone).normalize();
  return centroid
    .clone()
    .sub(along.multiplyScalar(centroid.dot(along)))
    .length();
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

  it('refuses a chest joint away from the armpit, or spine joints out of order', () => {
    const chest = params(toy.parts.bust, 'toy_bust_chest');
    const origins = JSON.parse(chest.origins!) as Record<string, number[]>;
    const moved = (segment: string, dy: number) => {
      const [x, y, z] = origins[segment]!;
      return bust({ ...chest, origins: JSON.stringify({ ...origins, [segment]: [x, y! + dy, z] }) });
    };
    expect(() => moved('chest', 0)).not.toThrow();
    expect(() => moved('chest', 0.01)).toThrow(/armpit/);
    expect(() => moved('ribs', origins.chest![1]! - origins.ribs![1]! + 0.001)).toThrow(/in turn/);
  });

  it('keeps the girdle under the neck on the chest it hangs from, and the slope off it on the clavicles', () => {
    const chest = params(toy.parts.bust, 'toy_bust_chest');
    const neckFoot = Number(chest.neckWidth) / 2;
    const slabs = (segment: string) =>
      bust(params(toy.parts.bust, `toy_bust_${segment}`)).filter(
        (solid): solid is ExtrudedPolygonSolid => solid.kind === 'extruded-polygon',
      );
    // Each slab of a part above the clavicle cut, as its height range and its reach across x in the bust's frame.
    const above = (segment: string) =>
      slabs(segment)
        .filter(({ z }) => z[1] + origin(segment)[1]! > Number(chest.clavicleCut) + 1e-9)
        .map(({ z, profile }) => ({
          top: z[1] + origin(segment)[1]!,
          xs: profile.map(([, x]) => x + origin(segment)[0]!),
        }));
    const neckBottom = slabs('neck').find(({ id }) => id === 'neck')!.z[0] + origin('neck')[1]!;
    expect(Math.max(...above('chest').map(({ top }) => top))).toBeCloseTo(neckBottom, 9);
    for (const { xs } of above('chest')) expect(Math.max(...xs.map(Math.abs))).toBeLessThanOrEqual(neckFoot + 1e-9);
    for (const { xs } of above('clavicle_l')) expect(Math.min(...xs)).toBeGreaterThanOrEqual(neckFoot - 1e-9);
    for (const { xs } of above('clavicle_r')) expect(Math.max(...xs)).toBeLessThanOrEqual(-neckFoot + 1e-9);
  });

  it("refuses a joint at another height than its measures'", () => {
    const shifted = (item: Item, segment: string) => {
      const given = item.parts[0]!.params;
      const origins = JSON.parse(given.origins!) as Record<string, number[]>;
      const [x, y, z] = origins[segment]!;
      return { ...given, origins: JSON.stringify({ ...origins, [segment]: [x, y! + 0.001, z] }) };
    };
    const [upper] = toy.parts.arm;
    const [thigh] = toy.parts.leg;
    const [chest] = toy.parts.bust.filter(({ id }) => id === 'toy_bust_chest');
    expect(() => avatarArm(shifted(upper!, 'fore'))).toThrow(/arm's fore joint/);
    expect(() => avatarLeg(shifted(thigh!, 'foot'))).toThrow(/leg's foot joint/);
    expect(() => bust(shifted(chest!, 'waist'))).toThrow(/bust's waist joint/);
  });

  // Each bone runs from its part's joint, its frame's origin, to the next segment's joint.
  it.each([
    ['toy_arm_upper', 'upper', 'fore'],
    ['toy_arm_fore', 'fore', 'palm'],
    ['toy_leg_thigh', 'thigh', 'shin'],
    ['toy_leg_shin', 'shin', 'foot'],
  ])('stands the flesh of %s on its bone', async (id, head, tail) => {
    const item = [...toy.parts.arm, ...toy.parts.leg].find((part) => part.id === id)!;
    const joints = JSON.parse(item.parts[0]!.params.origins!) as Record<string, number[]>;
    const bone = joints[tail]!.map((c, i) => c - joints[head]![i]!);
    expect(await offBone(item, bone)).toBeLessThan(VOXEL.voxelGrain);
  });

  it('stands the flesh of a leaning digit on its bone, in steps that keep it whole', async () => {
    const item = toy.parts.arm.find(({ id }) => id === 'toy_arm_thumb_02')!;
    const given = params(toy.parts.arm, item.id);
    const tail = JSON.parse(given.tail!) as number[];
    expect(await offBone(item, tail)).toBeLessThan(VOXEL.voxelGrain);
    expect(avatarArm(given).length).toBeGreaterThan(1);
    const [x, y, z] = tail;
    expect(() => avatarArm({ ...given, tail: JSON.stringify([x, y! + 0.001, z]) })).toThrow(/tail joint/);
    expect(() => avatarArm({ ...given, segment: 'palm' })).toThrow(/no digit/);
  });

  it("draws a digit at the length its hand gives, and refuses lengths that miss one of the hand's bones", () => {
    const span = (given: Record<string, string>) => {
      const [solid] = avatarArm(given);
      if (solid?.kind !== 'box') throw new Error('the digit is drawn as no box');
      return 2 * solid.box.half[1];
    };
    const finger = params(toy.parts.arm, 'toy_arm_index_01');
    const thumb = params(toy.parts.arm, 'toy_arm_thumb_01');
    const shares = (name: string) => JSON.parse(finger[name]!) as number[];
    const fingerFirst = Number(finger.fingerLength) * shares('fingerShares')[0]! * shares('phalanxShares')[0]!;
    const thumbFirst = Number(thumb.thumbLength) * shares('thumbShares')[0]!;
    const lengths = JSON.stringify(shares('fingers').map(() => [0.05, 0.03, 0.02]));
    expect(span({ ...finger, phalanxLengths: lengths }) - span(finger)).toBeCloseTo(0.05 - fingerFirst, 9);
    expect(span({ ...thumb, thumbLengths: '[0.04,0.03,0.02]' }) - span(thumb)).toBeCloseTo(0.04 - thumbFirst, 9);
    expect(() => avatarArm({ ...finger, phalanxLengths: '[[0.05,0.03,0.02]]' })).toThrow(/phalanxLengths/);
    expect(() => avatarArm({ ...thumb, thumbLengths: '[0.04,0.03]' })).toThrow(/thumbLengths/);
  });

  it('stands the deltoid off the centre line by the front-to-back offset its girdle gives', () => {
    const given = params(toy.parts.bust, 'toy_bust_clavicle_l');
    const girdle = JSON.parse(given.girdle!) as { deltoid: Record<string, number> };
    const centre = (deltoid: Record<string, number>) => {
      const solid = bust({ ...given, girdle: JSON.stringify({ ...girdle, deltoid }) }).find(
        ({ id }) => id === 'shoulder-left',
      );
      if (solid?.kind !== 'revolved' || !solid.origin) throw new Error('the clavicle draws no deltoid');
      return solid.origin;
    };
    const [x, y, z] = centre(girdle.deltoid);
    const [sx, sy, sz] = centre({ ...girdle.deltoid, z: girdle.deltoid.z! + 0.02 });
    expect([sx, sy]).toEqual([x, y]);
    expect(sz).toBeCloseTo(z + 0.02, 9);
  });

  it("cuts the torso garment at the bust's spine joints, each shell in its part's frame", () => {
    const { jacket } = toy.garments;
    const level = (shell: string, id: string, part: string) => {
      const { start, end } = piece(jacket, `toy_jacket_worn_${shell}`, id);
      return [start! + origin(part)[1]!, end! + origin(part)[1]!];
    };
    expect(level('waist', 'ribs', 'waist')[1]).toBeCloseTo(origin('ribs')[1]!, 9);
    expect(level('belly', 'ribs', 'ribs')[0]).toBeCloseTo(origin('ribs')[1]!, 9);
    expect(level('belly', 'chest', 'ribs')[1]).toBeCloseTo(origin('chest')[1]!, 9);
    expect(level('body', 'chest', 'chest')[0]).toBeCloseTo(origin('chest')[1]!, 9);
    expect(Object.fromEntries(jacket.filter((row) => 'covers' in row).map((row) => [row.id, row.covers]))).toEqual({
      toy_jacket_worn_waist: ['waist'],
      toy_jacket_worn_belly: ['ribs'],
      toy_jacket_worn_body: ['chest', 'clavicle_l', 'clavicle_r'],
      toy_jacket_worn_fore: ['fore'],
    });
  });

  it("cuts the boot's toe off at the ball, in the ball's frame, the foot and toe overlapping across it", () => {
    const { boot } = toy.garments;
    const vampZ = (id: string) => piece(boot, id, 'vamp').profile!.map(([, z]) => z!);
    const ball = JSON.parse(params(toy.parts.leg, 'toy_leg_ball').ballJoint!)[2] as number;
    const foot = JSON.parse(params(toy.parts.leg, 'toy_leg_ball').origins!).foot[2] as number;
    const toe = boot.find(({ id }) => id === 'toy_boot_worn_toe')!;
    const reach = (VOXEL.voxelGrain + (toe.voxelGrain as number)) / 2;
    expect(Math.min(...vampZ('toy_boot_worn_toe'))).toBeCloseTo(-reach, 9);
    // The vamp may end short of the overlap's far side, where the boot's toe stops.
    const footEnd = Math.max(...vampZ('toy_boot_worn_foot'));
    expect(footEnd).toBeGreaterThan(ball - foot);
    expect(footEnd).toBeLessThanOrEqual(ball - foot + reach + 1e-9);
    expect(toe).toMatchObject({ covers: ['ball'] });
  });
});
