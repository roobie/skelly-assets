import { readFileSync } from 'node:fs';
import { SurfaceSchema } from '@skelly/surfaces/schema';
import { describe, expect, it } from 'vitest';
import { missingNames, parseContent, pieceSurface } from '../src/content.ts';

// The twins the dev server reads, compiled by the pretest step from models/*.jsonnet.
const twin = (name: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../../../models/${name}`, import.meta.url), 'utf8'));
const content = parseContent({ finishes: twin('finishes.json'), lab: twin('shader-lab.json') }, SurfaceSchema);

describe('the lab content', () => {
  it('fits its schema, and every piece names a finish or a look that exists', () => {
    expect(missingNames(content)).toEqual([]);
  });

  it('shows one piece of each kind, and the stages the lab is judged under', () => {
    const kinds = content.lab.pieces.map((piece) => pieceSurface(piece, content)?.kind);
    expect(kinds).toContain('bark');
    expect(kinds).toContain('leaf');
    expect(Object.keys(content.lab.stages)).toEqual(
      expect.arrayContaining(['showcase', 'high-sun', 'low-sun', 'overcast', 'night']),
    );
  });

  it('ranges every see-through distance the inputs leave open', () => {
    const { ranges, ...values } = content.lab.seeThrough;
    for (const [name, value] of Object.entries(values)) {
      const range = name === 'nearCoverage' ? [0, 1] : ranges[name];
      expect(range, name).toBeDefined();
      expect(value).toBeGreaterThanOrEqual(range![0]!);
      expect(value).toBeLessThanOrEqual(range![1]!);
    }
  });

  it('names a misspelt finish rather than drawing the piece plain', () => {
    const misspelt = { ...content, lab: { ...content.lab, pieces: [{ ...content.lab.pieces[2]!, finish: 'brak' }] } };
    expect(missingNames(misspelt)).toEqual(['standing-log: no finish brak']);
  });
});
