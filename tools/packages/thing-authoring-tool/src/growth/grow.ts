// Grows a tree's skeleton from a species and a seed, season by season, after Palubicki et al. 2009 as described in
// https://brashandplucky.com/2026/10/15/growing-trees.html: buds read light (light.ts), light is summed from the tips
// to the base, the resource α·Q_base flows back up split by the Borchert-Honda rule, buds with a whole unit or more grow
// shoots, and starved laterals are shed. Thickness follows the pipe model afterwards. The same species and seed always
// grow the same skeleton, on any machine: all chance comes from one seeded generator.
import { add, cross, dot, length, normalize, scale, sub, type Vec3 } from '@skelly/construct/foundation/math.ts';
import { type Rng, seededRng } from '@skelly/construct/foundation/random.ts';
import { type Exposed, lightFor } from './light.ts';
import type { Species } from './species.ts';

const UP: Vec3 = [0, 1, 0];
const radians = (degrees: number) => (degrees * Math.PI) / 180;

/** A bud: the end of an axis (terminal) or a dormant lateral in a leaf's axil. */
interface Bud extends Exposed {
  /** Across the axis, the reference phyllotaxis turns about, carried along the shoot. */
  readonly across: Vec3;
  /** The phyllotactic turn of the next node, in radians. */
  readonly phase: number;
  readonly order: number;
  readonly born: number;
  /** Resource reaching this bud this season. */
  v: number;
}

/** Where an axis continues or a lateral sits: a bud still waiting, the internode it grew, or nothing. */
type Slot = { bud: Bud } | { child: number } | { shed: true } | null;

/** One metamer's internode, from `start` to `end`, with the slots at its upper node. */
interface Internode {
  readonly start: Vec3;
  readonly end: Vec3;
  readonly parent: number;
  readonly order: number;
  readonly born: number;
  main: Slot;
  laterals: Slot[];
  /** r^n of the branches shed from this node, which the pipe model still counts. */
  shedPipe: number;
  alive: boolean;
}

export interface Skeleton {
  readonly internodes: readonly Internode[];
  /** The internodes the leaders start with. */
  readonly roots: readonly number[];
  /** Each internode's radius at its foot, by the pipe model; 0 for a shed one. */
  readonly radius: readonly number[];
  /** The radius every axis tip has. */
  readonly tip: number;
  readonly seasons: number;
}

const childOf = (slot: Slot): number | undefined => (slot && 'child' in slot ? slot.child : undefined);
const budOf = (slot: Slot): Bud | undefined => (slot && 'bud' in slot ? slot.bud : undefined);

/** `v` turned by `angle` radians about the unit `axis` (Rodrigues). */
const turn = (v: Vec3, axis: Vec3, angle: number): Vec3 => {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return add(add(scale(v, c), scale(cross(axis, v), s)), scale(axis, dot(axis, v) * (1 - c)));
};

/** `across` carried from an axis along `from` to one along `to` by the least turn, so phyllotaxis stays put on a bend. */
const transport = (across: Vec3, from: Vec3, to: Vec3): Vec3 => {
  const axis = cross(from, to);
  const sin = length(axis);
  if (sin < 1e-9) return across;
  const carried = turn(across, scale(axis, 1 / sin), Math.atan2(sin, dot(from, to)));
  return normalize(sub(carried, scale(to, dot(carried, to))));
};

/** Any unit vector across `dir`, for an axis with no frame to inherit. */
const anyAcross = (dir: Vec3): Vec3 => normalize(cross(dir, Math.abs(dir[1]) < 0.9 ? UP : [1, 0, 0]));

/** A lateral's reference across its own axis: its parent axis, so its first buds sit either side of the branch plane. */
const acrossFrom = (parent: Vec3, dir: Vec3): Vec3 => {
  const off = sub(parent, scale(dir, dot(parent, dir)));
  return length(off) < 1e-9 ? anyAcross(dir) : normalize(off);
};

const randomUnit = (rng: Rng): Vec3 => {
  for (;;) {
    const v: Vec3 = [rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1];
    const l = length(v);
    if (l > 1e-3 && l <= 1) return scale(v, 1 / l);
  }
};

export const growSkeleton = (species: Species, seed: number): Skeleton => {
  const rng = seededRng(seed);
  const light = lightFor(species.light, species.internode, rng);
  const { branching, direction } = species;
  const internodes: Internode[] = [];
  const base: Slot[] = [];

  /** The angles about an axis its next node's lateral buds take, and the phase the node after it starts from. */
  const nodeTurns = (phase: number): { angles: number[]; next: number } => {
    switch (branching.phyllotaxis) {
      case 'spiral':
        return { angles: [phase], next: phase + radians(branching.divergence) };
      case 'opposite':
        // Decussate: each pair a right angle round from the last.
        return { angles: [phase, phase + Math.PI], next: phase + Math.PI / 2 };
      case 'whorl': {
        const n = branching.whorl;
        return {
          angles: Array.from({ length: n }, (_, i) => phase + (2 * Math.PI * i) / n),
          next: phase + Math.PI / n,
        };
      }
    }
  };

  const nextDirection = (bud: Bud, previous: Vec3): Vec3 => {
    let d = add(
      add(scale(previous, direction.previous), scale(bud.toward, direction.light)),
      add(
        scale(UP, bud.order === 0 ? direction.tropism.leader : direction.tropism.lateral),
        scale(randomUnit(rng), direction.noise),
      ),
    );
    if (bud.order > 0) d = sub(d, scale(UP, d[1] * direction.flatten));
    return length(d) < 1e-9 ? previous : normalize(d);
  };

  /** Grows `n` metamers of internode `step` from `bud`, returning the slot that now holds the first. */
  const shoot = (bud: Bud, n: number, step: number, season: number, parent: number): Slot => {
    let pos = bud.pos;
    let dir = bud.dir;
    let across = bud.across;
    let phase = bud.phase;
    let first: Slot = null;
    let last = parent;
    for (let i = 0; i < n; i++) {
      const next = nextDirection(bud, dir);
      across = transport(across, dir, next);
      dir = next;
      const end = add(pos, scale(dir, step));
      const turns = nodeTurns(phase);
      phase = turns.next;
      const side = cross(dir, across);
      const laterals: Slot[] = turns.angles.map((angle) => {
        if (end[1] < branching.bole) return null;
        const out = add(scale(across, Math.cos(angle)), scale(side, Math.sin(angle)));
        const budDir = normalize(
          add(scale(dir, Math.cos(radians(branching.angle))), scale(out, Math.sin(radians(branching.angle)))),
        );
        return {
          bud: {
            pos: end,
            dir: budDir,
            across: acrossFrom(dir, budDir),
            phase: 0,
            order: bud.order + 1,
            born: season,
            q: 0,
            toward: budDir,
            v: 0,
          },
        };
      });
      const index = internodes.length;
      internodes.push({
        start: pos,
        end,
        parent: last,
        order: bud.order,
        born: season,
        main: null,
        laterals,
        shedPipe: 0,
        alive: true,
      });
      if (i === 0) first = { child: index };
      else internodes[last]!.main = { child: index };
      last = index;
      pos = end;
    }
    internodes[last]!.main = { bud: { ...bud, pos, dir, across, phase, born: season, q: 0, toward: dir, v: 0 } };
    return first;
  };

  // Each leader starts as a terminal bud on the ground, its first shoot grown before the first season.
  for (let i = 0; i < species.leaders.count; i++) {
    const tilt = species.leaders.count === 1 ? 0 : radians(species.leaders.spread);
    const heading = (2 * Math.PI * i) / species.leaders.count + rng() * 0.5;
    const dir = normalize([Math.sin(tilt) * Math.cos(heading), Math.cos(tilt), Math.sin(tilt) * Math.sin(heading)]);
    const bud: Bud = {
      pos: [0, 0, 0],
      dir,
      across: anyAcross(dir),
      phase: rng() * 2 * Math.PI,
      order: 0,
      born: 0,
      q: 0,
      toward: dir,
      v: 0,
    };
    base.push(shoot(bud, 1, species.internode, 0, -1));
  }

  const slotsOf = (node: Internode) => [node.main, ...node.laterals];
  const liveBuds = () => {
    const buds = base.flatMap((slot) => budOf(slot) ?? []);
    for (const node of internodes) {
      if (!node.alive) continue;
      for (const slot of slotsOf(node)) {
        const bud = budOf(slot);
        if (bud) buds.push(bud);
      }
    }
    return buds;
  };

  /** Light gathered above each internode's foot (Q), and metamers above it, tips to base: a child follows its parent. */
  const gather = () => {
    const q = new Float64Array(internodes.length);
    const metamers = new Float64Array(internodes.length);
    for (let i = internodes.length - 1; i >= 0; i--) {
      const node = internodes[i]!;
      if (!node.alive) continue;
      metamers[i]! += 1;
      for (const slot of slotsOf(node)) {
        const child = childOf(slot);
        q[i]! += child === undefined ? (budOf(slot)?.q ?? 0) : q[child]!;
      }
      if (node.parent >= 0) {
        metamers[node.parent]! += metamers[i]!;
      }
    }
    return { q, metamers };
  };

  const slotLight = (slot: Slot, q: Float64Array) => {
    const child = childOf(slot);
    return child === undefined ? (budOf(slot)?.q ?? 0) : q[child]!;
  };

  /** Hands `v` to a node's slots by the Borchert-Honda rule: weights λQ_m for the main axis, (1 − λ)Q_l per lateral. */
  const split = (
    v: number,
    main: Slot,
    laterals: readonly Slot[],
    q: Float64Array,
    lambda: number,
    into: Float64Array,
  ) => {
    const weights = [lambda * slotLight(main, q), ...laterals.map((slot) => (1 - lambda) * slotLight(slot, q))];
    const total = weights.reduce((sum, w) => sum + w, 0);
    if (total <= 0) return;
    [main, ...laterals].forEach((slot, i) => {
      const share = (v * weights[i]!) / total;
      const child = childOf(slot);
      if (child !== undefined) into[child] = share;
      const bud = budOf(slot);
      if (bud) bud.v = share;
    });
  };

  const distribute = (q: Float64Array) => {
    const into = new Float64Array(internodes.length);
    for (const bud of liveBuds()) bud.v = 0;
    const qBase = base.reduce((sum, slot) => sum + slotLight(slot, q), 0);
    // Leaders share the base's resource by their light alone: none of them is the main axis.
    split(species.alpha * qBase, null, base, q, 0.5, into);
    internodes.forEach((node, i) => {
      if (node.alive) split(into[i]!, node.main, node.laterals, q, species.lambda, into);
    });
  };

  const pipeOf = (radiusPow: Float64Array, slot: Slot) => {
    const child = childOf(slot);
    return child === undefined ? 0 : radiusPow[child]!;
  };

  /** r^n above each internode's foot: a tip's own, its children's and what it has shed. */
  const pipe = () => {
    const tipPow = species.pipe.tip ** species.pipe.exponent;
    const radiusPow = new Float64Array(internodes.length);
    for (let i = internodes.length - 1; i >= 0; i--) {
      const node = internodes[i]!;
      if (!node.alive) continue;
      const above = slotsOf(node).reduce((sum, slot) => sum + pipeOf(radiusPow, slot), node.shedPipe);
      radiusPow[i] = childOf(node.main) === undefined ? above + tipPow : above;
    }
    return radiusPow;
  };

  const shedSubtree = (root: number) => {
    const stack = [root];
    while (stack.length > 0) {
      const node = internodes[stack.pop()!]!;
      node.alive = false;
      for (const slot of slotsOf(node)) {
        const child = childOf(slot);
        if (child !== undefined) stack.push(child);
      }
    }
  };

  /**
   * Laterals past their grace whose light per metamer falls under the threshold go, leaving their girth below. It reads
   * the season's fresh exposure, before any shoot grows, since a bud grown this season has not been lit yet.
   */
  const shed = (season: number) => {
    if (!species.shedding) return;
    const { threshold, grace } = species.shedding;
    const { q, metamers } = gather();
    const radiusPow = pipe();
    for (const node of internodes) {
      if (!node.alive) continue;
      node.laterals = node.laterals.map((slot) => {
        const child = childOf(slot);
        if (child === undefined || season - internodes[child]!.born <= grace) return slot;
        if (q[child]! / metamers[child]! >= threshold) return slot;
        node.shedPipe += radiusPow[child]!;
        shedSubtree(child);
        return { shed: true };
      });
    }
  };

  /** Dormant laterals too old to break die; terminal buds wait as long as their axis lives. */
  const ageBuds = (season: number) => {
    for (const node of internodes) {
      if (!node.alive) continue;
      node.laterals = node.laterals.map((slot) => {
        const bud = budOf(slot);
        return bud && season - bud.born >= branching.budLife ? null : slot;
      });
    }
  };

  for (let season = 1; season <= species.seasons; season++) {
    light.expose(liveBuds());
    shed(season);
    const { q } = gather();
    distribute(q);
    // Every bud's resource is fixed before any shoot grows, so the order buds grow in changes nothing.
    const growing = internodes.flatMap((node, index) =>
      node.alive
        ? slotsOf(node).flatMap((slot, at) => {
            const bud = budOf(slot);
            return bud && bud.v >= 1 ? [{ index, at, bud }] : [];
          })
        : [],
    );
    for (const { index, at, bud } of growing) {
      const node = internodes[index]!;
      // n = ⌊v⌋ metamers of length v/n internodes, as the paper has it; only the count is capped.
      const n = Math.floor(bud.v);
      const grown = shoot(bud, Math.min(n, species.shootCap), (species.internode * bud.v) / n, season, index);
      if (at === 0) node.main = grown;
      else node.laterals[at - 1] = grown;
    }
    ageBuds(season);
  }

  const radiusPow = pipe();
  const radius = Array.from(radiusPow, (pow) => (pow > 0 ? pow ** (1 / species.pipe.exponent) : 0));
  return {
    internodes,
    roots: base.flatMap((slot) => childOf(slot) ?? []),
    radius,
    tip: species.pipe.tip,
    seasons: species.seasons,
  };
};
