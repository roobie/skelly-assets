// Every kind compiles and links in every pass it patches, on every program and draw variant a game gives it, on the
// target both consumers have: WebGL2 on SwiftShader. A broken edit in each pass must be reported, so the run cannot
// pass by never seeing an error.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { surfacePasses } from '../../src/patch.ts';
import { SURFACE_KINDS } from '../../src/schema.ts';
import { lookOf } from '../looks.ts';
import { openSurfaceTest } from './harness.ts';
import { type CompileCase, PROGRAMS, VARIANTS } from './page/cases.ts';

const call = await openSurfaceTest();

test('the page draws with WebGL2 on SwiftShader', async () => {
  const { webgl2, renderer } = await call('context');
  assert(webgl2, `not WebGL2: ${renderer}`);
  assert.match(renderer, /SwiftShader/);
});

const cases = (broken: boolean): CompileCase[] =>
  SURFACE_KINDS.flatMap((kind) =>
    surfacePasses(kind).flatMap((pass) =>
      PROGRAMS[pass].flatMap((program) =>
        VARIANTS.map((variant) => ({ surface: lookOf(kind), pass, program, variant, broken })),
      ),
    ),
  );

const named = ({ surface, pass, program, variant }: CompileCase) =>
  `${surface.kind} ${pass} pass on the ${program} program, ${variant}`;

for (const each of cases(false))
  test(`${named(each)} compiles and links`, async () => {
    assert.deepEqual(await call('compile', each), []);
  });

for (const each of cases(true).filter(({ surface, variant }) => surface.kind === 'leaf' && variant === 'plain'))
  test(`${named(each)} reports a broken edit`, async () => {
    const errors = await call('compile', each);
    assert(
      errors.some((error) => error.includes('surfaceUndeclared')),
      errors.join('\n'),
    );
  });
