import { motionTransform, resolveMotion } from '@skelly/construct/assembly/motion.ts';
import { resolve } from '@skelly/construct/assembly/resolve.ts';
import type { Assembly, PartFamily, Resolved } from '@skelly/construct/assembly/schema.ts';
import { TOLERANCE } from '@skelly/construct/foundation/conventions.ts';
import { applyDir, applyPoint, IDENTITY, type Vec3 } from '@skelly/construct/foundation/math.ts';
import { localSolidBounds, penetrationWorld, worldSolid } from '@skelly/construct/shapes/geometry.ts';
import type { BoxSolid } from '@skelly/construct/shapes/solid.ts';
import type { MotionStage } from '@skelly/motion/motion';
import { describe, expect, it } from 'vitest';
import { resolveGunAction } from '../src/gun/actionDescription.ts';
import { AR15_FRAME, u } from '../src/gun/arModular/frame.ts';
import { gunDomain } from '../src/gun/domain.ts';
import { FAL_FOLDING_STOCK } from '../src/gun/falFoldingStock.ts';
import { sweepPartStops, sweepStops } from '../src/gun/stopSweep.ts';
import { loadCorpus, loadDesignAssembly, loadFixture } from './helpers.ts';

const centreOf = (solid: Parameters<typeof localSolidBounds>[0]): Vec3 => {
  const [min, max] = localSolidBounds(solid);
  return min.map((value, axis) => (value + max[axis]!) / 2) as unknown as Vec3;
};

/** `assembly` with a fixed box of half-width `half` at `centre` (in the model frame), bolted to the receiver. */
const withBlocker = (assembly: Assembly, baseline: Resolved, centre: Vec3, half = 0.01): Resolved => {
  const blocker: BoxSolid = { id: 'blocker', kind: 'box', box: { center: centre, half: [half, half, half] } };
  const receiver = [...baseline.defs].find(([, def]) => def.family === 'receiver')!;
  const rail = receiver[1].ports.find(({ id }) => id === 'rail')!;
  const placed = baseline.placed.get(receiver[0])!;
  const normal = applyDir(placed, rail.normal).map((value) => -value) as unknown as Vec3;
  const family: PartFamily = {
    name: 'sweep-blocker',
    params: {},
    build: () => ({
      family: 'sweep-blocker',
      solids: [blocker],
      keepOuts: [],
      axes: [],
      ports: [
        {
          id: 'base',
          mount: rail.mount,
          gender: 'male',
          pos: applyPoint(placed, rail.pos),
          normal,
          up: applyDir(placed, rail.up),
        },
      ],
    }),
  };
  const fixture = {
    ...assembly,
    parts: { ...assembly.parts, 'sweep-blocker': { family: 'sweep-blocker' } },
    connections: [...assembly.connections, { from: `${receiver[0]}.rail`, to: 'sweep-blocker.base', slot: 0 }],
  };
  return resolve(fixture, { ...gunDomain, families: { ...gunDomain.families, 'sweep-blocker': family } });
};

describe('the stop sweep', () => {
  it.each(['turn', 'draw'] as const)('detects a %s obstruction between clear endpoint poses', (phase) => {
    const assembly = loadFixture('archetype-bolt-rifle');
    const baseline = resolve(assembly, gunDomain);
    const knob = resolveGunAction(baseline)!.parts.knob!;
    const solid = knob.def.solids[0]!;
    const [turnStage, drawStage] = knob.motion.stages;
    const pose = (progress: number) =>
      motionTransform(
        knob.placed,
        knob.motion,
        phase === 'turn' ? progress * turnStage!.share : turnStage!.share + progress * drawStage!.share,
      );
    const contactPhase = phase === 'turn' ? 0.2 : 0.25;
    const resolved = withBlocker(assembly, baseline, applyPoint(pose(contactPhase), centreOf(solid)));
    const blocker = worldSolid(IDENTITY, [...resolved.defs.values()].flatMap((def) => def.solids).at(-1)!);
    expect(penetrationWorld(worldSolid(pose(contactPhase), solid), blocker)).toBeGreaterThan(0);
    for (const endpoint of [0, 1]) {
      expect(penetrationWorld(worldSolid(pose(endpoint), solid), blocker)).toBeLessThan(1e-7);
    }
    expect(sweepStops(resolved).some((issue) => issue.includes('sweep-blocker.blocker'))).toBe(true);
  });

  it('fails a stop that a part cannot rest at, naming the span that ends there', () => {
    const assembly = loadCorpus().find(({ label }) => label.includes('compact-smg'))!.assembly;
    const baseline = resolve(assembly, gunDomain);
    expect(sweepStops(baseline)).toEqual([]);
    const handle = resolveGunAction(baseline)!.parts.handle!;
    const solid = handle.def.solids[0]!;
    const notched = handle.motion.stops.find(({ name }) => name === 'notched')!;
    const centre = applyPoint(motionTransform(handle.placed, handle.motion, notched.clock), centreOf(solid));
    const blocker: BoxSolid = { id: 'blocker', kind: 'box', box: { center: centre, half: [0.01, 0.01, 0.01] } };
    const part = { id: handle.id, placed: handle.placed, solids: handle.def.solids, motion: handle.motion };
    const obstacle = { id: 'blocker', shape: worldSolid(IDENTITY, blocker) };
    expect(sweepPartStops(part, [])).toEqual([]);
    const issues = sweepPartStops(part, [obstacle]);
    expect(issues.some((issue) => issue.endsWith('vs blocker from open to notched'))).toBe(true);
  });

  it.each([
    ['rests flush against an obstacle and draws away from it', [-1, 0, 0]],
    ['slides flush along an obstacle the whole way', [0, 0, 1]],
  ] as const)('passes a part that %s', (_, direction) => {
    const solid: BoxSolid = { id: 'slab', kind: 'box', box: { center: [0.5, 0.5, 0.5], half: [0.5, 0.5, 0.5] } };
    const motion = resolveMotion(
      {
        stages: [{ kind: 'slide', direction, travel: 3 }],
        stops: [
          { name: 'a', stage: 0, at: 0 },
          { name: 'b', stage: 0 },
        ],
      },
      () => 0,
      [solid],
    );
    const wall: BoxSolid = { id: 'wall', kind: 'box', box: { center: [1.5, 0, 0], half: [0.5, 5, 5] } };
    const part = { id: 'slab', placed: IDENTITY, solids: [solid], motion };
    const obstacle = { id: 'wall', shape: worldSolid(IDENTITY, wall) };
    expect(penetrationWorld(worldSolid(IDENTITY, solid), obstacle.shape)).toBeLessThan(1e-9);
    expect(sweepPartStops(part, [obstacle])).toEqual([]);
  });

  it('certifies a span over stages of unequal pace by the fastest of them', () => {
    const near: BoxSolid = { id: 'near', kind: 'box', box: { center: [0, 0, 0], half: [0.05, 0.05, 0.05] } };
    const far: BoxSolid = { id: 'far', kind: 'box', box: { center: [0, 10, 0], half: [0.05, 0.05, 0.05] } };
    const motion = resolveMotion(
      {
        stages: [
          { kind: 'slide', direction: [1, 0, 0], travel: 1 },
          { kind: 'hinge', axis: { from: [0, 0, 0], to: [0, 0, 1] }, angle: 90 },
        ],
      },
      () => 0,
      [near, far],
    );
    const blocker: BoxSolid = { id: 'blocker', kind: 'box', box: { center: [0.5, 0, 0], half: [0.02, 0.02, 0.02] } };
    const part = { id: 'p', placed: IDENTITY, solids: [near, far], motion };
    expect(sweepPartStops(part, [{ id: 'blocker', shape: worldSolid(IDENTITY, blocker) }])).toEqual([
      'p.near vs blocker from rest to open',
    ]);
  });

  it('finds a blocker on the arc a hinge turns the solid through after a long slide', () => {
    // The stages are given in the rest frame and the first is outermost, so the hinge turns the solid about the pivot as
    // it rests, and the slide has carried the pivot with it: the arc's radius is the rest hull's, whatever the slide did.
    const solid: BoxSolid = { id: 'p', kind: 'box', box: { center: [0.3, 0, 0], half: [0.05, 0.05, 0.05] } };
    const motion = resolveMotion(
      {
        stages: [
          { kind: 'slide', direction: [1, 0, 0], travel: 2 },
          { kind: 'hinge', axis: { from: [0, 0, 0], to: [0, 0, 1] }, angle: 90 },
        ],
      },
      () => 0,
      [solid],
    );
    const arc = Math.PI / 4;
    const blocker: BoxSolid = {
      id: 'blocker',
      kind: 'box',
      box: { center: [2 + 0.3 * Math.cos(arc), 0.3 * Math.sin(arc), 0], half: [0.01, 0.01, 0.01] },
    };
    const part = { id: 'p', placed: IDENTITY, solids: [solid], motion };
    expect(sweepPartStops(part, [{ id: 'blocker', shape: worldSolid(IDENTITY, blocker) }])).toEqual([
      'p.p vs blocker from rest to open',
    ]);
  });

  describe('the position allowance', () => {
    const slideThrough = (plate: BoxSolid, partHalf: number) => {
      const solid: BoxSolid = { id: 'p', kind: 'box', box: { center: [0, 0, 0], half: [partHalf, 0.5, 0.5] } };
      const motion = resolveMotion(
        {
          stages: [{ kind: 'slide', direction: [1, 0, 0], travel: 3 }],
          stops: [
            { name: 'a', stage: 0, at: 0 },
            { name: 'b', stage: 0 },
          ],
        },
        () => 0,
        [solid],
      );
      return sweepPartStops({ id: 'p', placed: IDENTITY, solids: [solid], motion }, [
        { id: 'plate', shape: worldSolid(IDENTITY, plate) },
      ]);
    };
    const plateAt = (x: number, half: number): BoxSolid => ({
      id: 'plate',
      kind: 'box',
      box: { center: [x, 0, 0], half: [half, 1, 1] },
    });

    it('fails a thin plate that the coarse samples step over, which a tenfold allowance would let through', () => {
      // The part's samples fall 0.094 apart on its way and the plate sits between two of them; only a finer sample finds it.
      expect(slideThrough(plateAt(0.047, 0.025), 0.01)).toEqual(['p.p vs plate from a to b']);
    });

    it('lets a clash no deeper than the position allowance pass between samples', () => {
      // The needle crosses the plate between two samples and sinks 0.002 into it: far under TOLERANCE.position.
      expect(0.002).toBeLessThan(TOLERANCE.position);
      expect(slideThrough(plateAt(0.3, 0.003), 0.001)).toEqual([]);
    });
  });

  it('checks the action parts at every stop: the bolt carrier in the stock clearance fails once it is not allowed', () => {
    const rifle = resolve(loadCorpus().find(({ label }) => label.includes('hunting-rifle'))!.assembly, gunDomain);
    expect(sweepStops(rifle)).toEqual([]);
    const receiver = [...rifle.defs].find(([, def]) => def.family === 'receiver')!;
    const stripped = receiver[1].keepOuts.map((keepOut) => {
      const { allowPort: _port, allowFamilies: _families, ...unallowed } = keepOut;
      return keepOut.id === 'bolt-stock-clearance' ? unallowed : keepOut;
    });
    const strict = { ...rifle, defs: new Map(rifle.defs).set(receiver[0], { ...receiver[1], keepOuts: stripped }) };
    expect(sweepStops(strict).some((issue) => /^bolt-carrier at open: .*bolt-stock-clearance/.test(issue))).toBe(true);
  });

  it('fails a stop that sits in a keep-out, naming the stop and the volume', () => {
    const rifle = loadFixture('archetype-battle-rifle');
    const folding = resolve(
      {
        ...rifle,
        parts: { ...rifle.parts, stock: { family: 'stock', params: { length: 'M', style: 'fal-folding' } } },
      },
      gunDomain,
    );
    expect(sweepStops(folding)).toEqual([]);
    // The upper tube raised by its own thickness lies in the ejection volume once the stock is folded.
    const [tubeBottom, tubeTop] = FAL_FOLDING_STOCK.tube.upperYU;
    const stock = folding.defs.get('stock')!;
    const raised = stock.solids.map((solid) =>
      solid.id === 'tube-upper' && solid.kind === 'box'
        ? {
            ...solid,
            box: {
              ...solid.box,
              center: [solid.box.center[0], solid.box.center[1] + (tubeTop - tubeBottom), solid.box.center[2]] as Vec3,
            },
          }
        : solid,
    );
    const intruding = { ...folding, defs: new Map(folding.defs).set('stock', { ...stock, solids: raised }) };
    expect(sweepStops(intruding).some((issue) => /^stock at folded: .*ejection volume of receiver/.test(issue))).toBe(
      true,
    );
  });

  describe('the AR-15 carbine', () => {
    const carbine = resolve(loadDesignAssembly('ar15-carbine-free-float'), gunDomain);
    /** The carbine with `id`'s single stage carried `by` further than its table says, its stops kept. */
    const overrun = (id: string, by: (stage: MotionStage) => MotionStage): Resolved => {
      const motion = carbine.motions.get(id)!;
      return { ...carbine, motions: new Map(carbine.motions).set(id, { ...motion, stages: motion.stages.map(by) }) };
    };

    it('opens the port cover to the magazine well and no further', () => {
      expect(sweepStops(carbine)).toEqual([]);
      const past = overrun('port-cover', (stage) =>
        stage.kind === 'hinge' ? { ...stage, angle: stage.angle + 2 } : stage,
      );
      expect(sweepStops(past).some((issue) => /^port-cover\.cover vs lower\./.test(issue))).toBe(true);
    });

    const { chargingHandle, stock, stockA2 } = AR15_FRAME.table;
    it.each([
      ['ar15-carbine-free-float', stock.topY, /^stock at collapsed: .*clearance volume of charging-handle/],
      ['ar15-rifle-a2', stockA2.combY, /^charging-handle\.shaft vs stock\./],
    ])('draws the charging handle back clear over the stock: %s', (design, stockTopY, clash) => {
      const rifle = resolve(loadDesignAssembly(design), gunDomain);
      expect(sweepStops(rifle)).toEqual([]);
      const handle = rifle.defs.get('charging-handle')!;
      // Down past the stock's top by the handle's clearance.
      const drop = u(chargingHandle.bottomY) - u(stockTopY) + u(chargingHandle.clearance);
      const lowered = <T extends { readonly box: BoxSolid['box'] }>(piece: T): T => ({
        ...piece,
        box: { ...piece.box, center: [piece.box.center[0], piece.box.center[1] - drop, piece.box.center[2]] },
      });
      const sagging = {
        ...handle,
        solids: handle.solids.map((solid) => (solid.kind === 'box' ? lowered(solid) : solid)),
        keepOuts: handle.keepOuts.map(lowered),
      };
      const issues = sweepStops({ ...rifle, defs: new Map(rifle.defs).set('charging-handle', sagging) });
      expect(issues.some((issue) => clash.test(issue))).toBe(true);
    });

    it('collapses the stock through its positions to just short of the castle nut', () => {
      expect(carbine.motions.get('stock')!.stops.map(({ name }) => name)).toEqual([
        'extended',
        'position-5',
        'position-4',
        'position-3',
        'position-2',
        'collapsed',
      ]);
      const pitch = u(AR15_FRAME.table.stock.pitch);
      const past = overrun('stock', (stage) =>
        stage.kind === 'slide' ? { ...stage, travel: stage.travel + pitch } : stage,
      );
      expect(sweepStops(past).some((issue) => /^stock\.sleeve.* vs receiver-extension\.castle-nut/.test(issue))).toBe(
        true,
      );
    });
  });

  it.each(loadCorpus())('finds every stop and the path between stops clear: $label', ({ assembly }) => {
    expect(sweepStops(resolve(assembly, gunDomain))).toEqual([]);
  });
});
