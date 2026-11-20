import type { Solid } from '@skelly/construct/shapes/solid.ts';
import { box } from '../antiMateriel/common.ts';

export type Span = readonly [number, number];

/** A block centred on the bore's vertical plane. */
export const block = (id: string, { x, y, halfWidthU }: { x: Span; y: Span; halfWidthU: number }): Solid =>
  box(id, [x[0], y[0], -halfWidthU], [x[1], y[1], halfWidthU]);
