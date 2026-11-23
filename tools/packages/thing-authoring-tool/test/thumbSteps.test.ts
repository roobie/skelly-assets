import { readdirSync, readFileSync } from 'node:fs';
import type { Box } from '@skelly/construct/shapes/solid.ts';
import { expect, it } from 'vitest';
import { avatarArm } from '../src/families/avatarLimbs.ts';

type Row = { parts: { id: string; params: Record<string, string> }[] };
type Corners = { min: readonly number[]; max: readonly number[] };

const items = new URL('../items/', import.meta.url);
const row = (id: string): Row => JSON.parse(readFileSync(new URL(`${id}.json`, items), 'utf8'));
const corners = ({ center, half }: Box): Corners => ({
  min: center.map((c, a) => c - half[a]!),
  max: center.map((c, a) => c + half[a]!),
});
const middle = ({ min, max }: Corners, axis: number) => (min[axis]! + max[axis]!) / 2;

// Each doll's arm draws its thumb's skin; every glove's thumb pieces are drawn over it on either doll.
const DOLL_ARMS = ['player_arm', 'ual_arm'];
const gloves = readdirSync(items)
  .map((file) => /^(.+_worn_(thumb_\d+))\.json$/.exec(file))
  .filter((found) => found !== null)
  .map(([, id, part]) => ({ id: id!, part: part! }));

// A glove's thumb and the skin under it each lean in upright steps, the glove's in worn-fit.libsonnet and the skin's in
// the arm family; a glove stepped another way would leave skin poking through its corners.
it.each(DOLL_ARMS.flatMap((arm) => gloves.map((glove) => ({ arm, ...glove }))))(
  "steps $id's thumb as $arm steps its skin",
  ({ arm, id, part }) => {
    const skin = avatarArm(row(arm).parts.find((p) => p.id === part)!.params).flatMap((solid) =>
      solid.kind === 'box' && /^thumb(-\d+)?$/.test(solid.id) ? [corners(solid.box)] : [],
    );
    const pieces: { id: string; min: number[]; max: number[] }[] = JSON.parse(row(id).parts[0]!.params.pieces!);
    const steps = pieces.filter((piece) => /^thumb(-\d+)?$/.test(piece.id));
    expect(steps.map((step) => step.id)).toEqual(skin.map((_, i) => (i === 0 ? 'thumb' : `thumb-${i}`)));
    steps.forEach((step, i) => {
      for (const axis of [0, 2]) expect(middle(step, axis)).toBeCloseTo(middle(skin[i]!, axis), 9);
      for (const axis of [0, 1, 2]) {
        expect(step.min[axis]).toBeLessThan(skin[i]!.min[axis]!);
        expect(step.max[axis]).toBeGreaterThan(skin[i]!.max[axis]!);
      }
    });
  },
);
