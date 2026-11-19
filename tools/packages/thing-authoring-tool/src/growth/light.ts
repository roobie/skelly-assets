// How much light, or free space, each bud finds, and which way it lies: the environment half of the growth model
// (grow.ts asks it once a season). Both models of Palubicki et al. 2009 §4.1 are here behind one shape, so a species
// picks one by name and the growth code never knows which it got.
import { add, dot, length, normalize, scale, sub, type Vec3 } from '@skelly/construct/foundation/math.ts';
import type { Rng } from '@skelly/construct/foundation/random.ts';
import type { Envelope, LightModel } from './species.ts';

/** What a light model reads of a bud and writes back to it. */
export interface Exposed {
  readonly pos: Vec3;
  readonly dir: Vec3;
  /** Light or space found, Q. */
  q: number;
  /** The way toward it, V; the bud's own direction when none is better. */
  toward: Vec3;
}

export interface Light {
  /** Sets every bud's Q and V for this season, from where all of them are. */
  expose(buds: readonly Exposed[]): void;
}

const cosHalf = (degrees: number) => Math.cos((degrees * Math.PI) / 360);

/** A cell key over a lattice a few thousand cells across, which no tree reaches. */
const SPAN = 4096;
const key = (i: number, j: number, k: number) => ((i + SPAN / 2) * SPAN + (j + SPAN / 2)) * SPAN + (k + SPAN / 2);

const NEIGHBOURS: readonly Vec3[] = [-1, 0, 1].flatMap((x) =>
  [-1, 0, 1].flatMap((y) => [-1, 0, 1].flatMap((z): Vec3[] => (x || y || z ? [[x, y, z]] : []))),
);

/**
 * Shadow propagation: a bud in cell (I, J, K) adds a·b^−q to the cells (I ± p, J − q, K ± p) for p ≤ q ≤ depth, and a
 * bud reads Q = max(1 − s, 0). The paper also shades the bud's own cell (q = 0) and adds a back to cancel it; that
 * cancels only the bud's own shadow, so the buds of one whorl, which share a cell, would darken one another to nothing.
 * Starting at q = 1 is the same for a lone bud and leaves a node's buds to compete only with what is above them.
 * V points at the least shaded neighbouring cell inside the bud's perception cone, the one nearest its heading on a
 * tie, so an open sky does not lean every tree the same way.
 */
const shadowLight = ({ depth, a, b, perception }: Extract<LightModel, { model: 'shadow' }>, cell: number): Light => {
  const cone = cosHalf(perception);
  const falloff = Array.from({ length: depth + 1 }, (_, q) => a * b ** -q);
  const steps = NEIGHBOURS.map((step) => ({ step, along: normalize(step) }));
  return {
    expose(buds) {
      const shadow = new Map<number, number>();
      const cellOf = (p: Vec3) => p.map((v) => Math.floor(v / cell)) as unknown as Vec3;
      for (const bud of buds) {
        const [i, j, k] = cellOf(bud.pos);
        for (let q = 1; q <= depth; q++) {
          for (let x = -q; x <= q; x++) {
            for (let z = -q; z <= q; z++) {
              const at = key(i + x, j - q, k + z);
              shadow.set(at, (shadow.get(at) ?? 0) + falloff[q]!);
            }
          }
        }
      }
      const shade = (i: number, j: number, k: number) => shadow.get(key(i, j, k)) ?? 0;
      for (const bud of buds) {
        const [i, j, k] = cellOf(bud.pos);
        bud.q = Math.max(1 - shade(i, j, k), 0);
        let best = Number.POSITIVE_INFINITY;
        let bestAlong = -1;
        bud.toward = bud.dir;
        for (const { step, along } of steps) {
          const heading = dot(along, bud.dir);
          if (heading < cone) continue;
          const s = shade(i + step[0], j + step[1], k + step[2]);
          if (s < best || (s === best && heading > bestAlong)) {
            best = s;
            bestAlong = heading;
            bud.toward = along;
          }
        }
      }
    },
  };
};

/** Points spread evenly through an envelope, by rejection from its box. */
const markersIn = ({ centre, radii, floor }: Envelope, count: number, rng: Rng): Vec3[] => {
  const markers: Vec3[] = [];
  while (markers.length < count) {
    const unit: Vec3 = [rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1];
    if (dot(unit, unit) > 1) continue;
    const p: Vec3 = [centre[0] + unit[0] * radii[0], centre[1] + unit[1] * radii[1], centre[2] + unit[2] * radii[2]];
    if (p[1] >= floor) markers.push(p);
  }
  return markers;
};

/**
 * Space colonization: markers within `occupancy` of a bud are taken for good; each remaining marker within `reach` and
 * inside a bud's cone goes to the nearest such bud. A bud with markers has Q = 1 and V the normalized sum of the unit
 * vectors toward them; one without has Q = 0.
 */
const colonizeLight = (
  { envelope, markers: count, occupancy, reach, perception }: Extract<LightModel, { model: 'colonize' }>,
  internode: number,
  rng: Rng,
): Light => {
  let markers = markersIn(envelope, count, rng);
  const kill = occupancy * internode;
  const range = reach * internode;
  const cone = cosHalf(perception);
  return {
    expose(buds) {
      // Buds bucketed by cells one reach across, so a marker looks only at the 27 cells around it.
      const near = new Map<number, number[]>();
      const cellOf = (p: Vec3) => p.map((v) => Math.floor(v / range)) as unknown as Vec3;
      buds.forEach((bud, index) => {
        const at = key(...cellOf(bud.pos));
        near.set(at, [...(near.get(at) ?? []), index]);
      });
      const claimed = buds.map(() => [0, 0, 0] as [number, number, number]);
      const claims = buds.map(() => 0);
      markers = markers.filter((marker) => {
        const [i, j, k] = cellOf(marker);
        let nearest = -1;
        let nearestDistance = range;
        for (const [x, y, z] of [[0, 0, 0] as const, ...NEIGHBOURS]) {
          for (const index of near.get(key(i + x, j + y, k + z)) ?? []) {
            const offset = sub(marker, buds[index]!.pos);
            const distance = length(offset);
            if (distance < kill) return false;
            if (distance < nearestDistance && dot(offset, buds[index]!.dir) >= cone * distance) {
              nearest = index;
              nearestDistance = distance;
            }
          }
        }
        if (nearest >= 0) {
          const unit = scale(sub(marker, buds[nearest]!.pos), 1 / nearestDistance);
          claimed[nearest] = add(claimed[nearest]!, unit) as [number, number, number];
          claims[nearest]! += 1;
        }
        return true;
      });
      buds.forEach((bud, index) => {
        bud.q = claims[index]! > 0 ? 1 : 0;
        bud.toward = length(claimed[index]!) > 0 ? normalize(claimed[index]!) : bud.dir;
      });
    },
  };
};

/** The light model a species names, on a lattice of cells one internode across. */
export const lightFor = (model: LightModel, internode: number, rng: Rng): Light =>
  model.model === 'shadow' ? shadowLight(model, internode) : colonizeLight(model, internode, rng);
