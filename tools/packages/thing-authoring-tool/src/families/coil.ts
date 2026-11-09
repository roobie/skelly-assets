import type { Vec2 } from '@skelly/construct/shapes/solid.ts';
import { integer, parse, pipe, strictObject } from 'valibot';
import { link, positive, revolve } from './shapes.ts';

export const coil = (params: Readonly<Record<string, string>>, turnedSides?: number) => {
  const d = parse(
    strictObject({ radius: positive, tubeRadius: positive, turns: pipe(positive, integer()), pitch: positive }),
    params,
  );
  if (d.radius <= d.tubeRadius) {
    throw new Error('Coil needs a central opening');
  }
  const turns = Array.from({ length: d.turns }, (_, turn) => {
    const bottom = turn * d.pitch;
    const top = bottom + 2 * d.tubeRadius;
    const profile: Vec2[] = [
      [bottom, d.radius],
      [bottom + d.tubeRadius, d.radius + d.tubeRadius],
      [top, d.radius],
      [bottom + d.tubeRadius, d.radius - d.tubeRadius],
      [bottom, d.radius],
    ];
    return revolve(`turn-${turn}`, profile);
  });
  // The turns are separate rings, so a diagonal rod from the bottom turn to the top one holds them as one spring.
  const thickness = 2 * d.tubeRadius;
  // Turns drawn with flat sides put the rod's ends on a side's middle rather than a corner.
  const reach = turnedSides === undefined ? d.radius : d.radius * Math.cos(Math.PI / turnedSides);
  const rod = link(
    'rod',
    [
      [-reach, d.tubeRadius],
      [reach, (d.turns - 1) * d.pitch + d.tubeRadius],
    ],
    [thickness, thickness],
    'body',
  );
  return [...turns, rod];
};
