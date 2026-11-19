import { motionTransform } from '@skelly/construct/assembly/motion.ts';
import { resolve } from '@skelly/construct/assembly/resolve.ts';
import type { Assembly, PartFamily, Resolved } from '@skelly/construct/assembly/schema.ts';
import { applyDir, applyPoint, IDENTITY, type Vec3 } from '@skelly/construct/foundation/math.ts';
import { localSolidBounds, penetrationWorld, worldSolid } from '@skelly/construct/shapes/geometry.ts';
import type { BoxSolid } from '@skelly/construct/shapes/solid.ts';
import { describe, expect, it } from 'vitest';
import { resolveGunAction } from '../src/gun/actionDescription.ts';
import { gunDomain } from '../src/gun/domain.ts';
import { sweepPartStops, sweepStops } from '../src/gun/stopSweep.ts';
import { loadCorpus, loadFixture } from './helpers.ts';

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

  it.each(loadCorpus())('finds every stop and the path between stops clear: $label', ({ assembly }) => {
    expect(sweepStops(resolve(assembly, gunDomain))).toEqual([]);
  });
});
