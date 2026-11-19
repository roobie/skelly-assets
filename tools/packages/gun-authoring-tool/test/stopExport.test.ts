import { resolveMotion } from '@skelly/construct/assembly/motion.ts';
import type { PartMotion } from '@skelly/construct/assembly/schema.ts';
import { IDENTITY } from '@skelly/construct/foundation/math.ts';
import type { Solid } from '@skelly/construct/shapes/solid.ts';
import { stopClock } from '@skelly/motion/motion';
import { expect, it } from 'vitest';
import { fileMotion } from '../src/gun/exportFrame.ts';
import { modelIssues, parseModel } from './modelSchema.ts';

const block: Solid = { kind: 'box', id: 'block', box: { center: [0, 0, 0], half: [1, 1, 1] } };

const exportedPart = (authored: PartMotion) => {
  const motion = fileMotion(
    resolveMotion(authored, () => 6, [block]),
    IDENTITY,
    0.1,
  );
  // The timeline visits every stop in order and returns to rest, which is all a reader needs to play the part.
  const legs = [...motion.stops.slice(1), motion.stops[0]!].map(({ name }) => ({ to: name, seconds: 0.1 }));
  const entry = {
    id: 'fixture',
    file: 'assets/models/fixture.glb',
    gun: {
      calibre: '9x19',
      action: {
        parts: { part: { node: 'part', motion, modes: ['hand'] } },
        hand: { durationSimSeconds: legs.length * 0.1, legs },
        ejectAt: 0.5,
        ejectDirection: [0, 1, 0],
        holdOpen: false,
      },
    },
  };
  return { entry };
};

it('exports a part with six slide stops and round-trips them through the sidecar schema', () => {
  const names = ['rest', 'one', 'two', 'three', 'four', 'five'];
  const { entry } = exportedPart({
    stages: [{ kind: 'slide', direction: [1, 0, 0], travel: 5 }],
    stops: names.map((name, i) => ({ name, stage: 0, at: i })),
  });
  expect(modelIssues(entry)).toEqual([]);
  const parsed = parseModel(JSON.parse(JSON.stringify(entry)));
  const stops = parsed.gun?.action?.parts.part?.motion.stops;
  expect(stops?.map(({ name }) => name)).toEqual(names);
  expect(stops?.map(({ clock }) => clock)).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
});

it('exports a hinge with two stops and round-trips them through the sidecar schema', () => {
  const { entry } = exportedPart({
    stages: [{ kind: 'hinge', axis: { from: [0, 0, 0], to: [0, 1, 0] }, angle: -90 }],
    stops: [
      { name: 'open', stage: 0, at: 0 },
      { name: 'folded', stage: 0 },
    ],
  });
  expect(modelIssues(entry)).toEqual([]);
  const parsed = parseModel(JSON.parse(JSON.stringify(entry)));
  const exported = parsed.gun!.action!.parts.part!.motion;
  expect(exported.stops).toEqual([
    { name: 'open', clock: 0 },
    { name: 'folded', clock: 1 },
  ]);
  expect(stopClock(exported, 'folded')).toBe(1);
});
