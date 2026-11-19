import type { SurfaceEdit } from '@skelly/surfaces/patch';
import { expect, describe as group, it } from 'vitest';
import { describe, shaderErrors } from '../src/shaderError.ts';

const EDIT: SurfaceEdit = {
  stage: 'fragment',
  anchor: '#include <map_fragment>',
  code: 'float a = 1.0;\nfloat b = c;',
};
const EDITS = { bark: { colour: [EDIT] } };
const SOURCE = ['#version 300 es', 'void main() {', EDIT.code, '}'].join('\n');

group('shaderErrors', () => {
  it('places an error in the edit holding its line, by kind, pass, anchor and line within the edit', () => {
    const [error] = shaderErrors(
      { stage: 'fragment', log: "ERROR: 0:4: 'c' : undeclared identifier\n", source: SOURCE },
      EDITS,
    );
    expect(error).toEqual({
      stage: 'fragment',
      message: "'c' : undeclared identifier",
      line: 4,
      text: 'float b = c;',
      kind: 'bark',
      pass: 'colour',
      anchor: '#include <map_fragment>',
      editLine: 2,
    });
    expect(describe(error!)).toBe(
      "bark colour edit after #include <map_fragment>, line 2: 'c' : undeclared identifier\n  float b = c;",
    );
  });

  it('names the kind the program holds for a line outside its edits', () => {
    const [error] = shaderErrors({ stage: 'fragment', log: 'ERROR: 0:2: oops', source: SOURCE }, EDITS);
    expect(error).toMatchObject({ kind: 'bark', pass: 'colour', line: 2, text: 'void main() {' });
    expect(error?.anchor).toBeUndefined();
  });

  it('keeps the whole log when the driver gives no numbered error', () => {
    const errors = shaderErrors({ stage: 'vertex', log: 'link failed\n', source: SOURCE }, EDITS);
    expect(errors).toEqual([{ stage: 'vertex', message: 'link failed', line: 0, text: '' }]);
  });
});
