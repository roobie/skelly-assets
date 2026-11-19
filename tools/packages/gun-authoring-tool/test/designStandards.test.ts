import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DESIGNS } from '../src/cli/content.ts';
import { designTextProblem } from '../src/cli/designCheck.ts';
import { gunDomain } from '../src/gun/domain.ts';
import { GUN_PLATFORMS } from '../src/gun/platforms.ts';

const design = (name: string) => JSON.parse(readFileSync(join(DESIGNS, `${name}.json`), 'utf8'));

describe('the publish check on a design whose ports declare standards', () => {
  it('fails a joint of mismatched standards, naming both ports', () => {
    const shotgun = design('archetype-pump-shotgun');
    shotgun.assembly.parts.suppressor = { family: 'suppressor', params: { type: 'real-suppressor' } };
    shotgun.assembly.connections.push({ from: 'barrel.muzzle', to: 'suppressor.base' });
    const { problem } = designTextProblem(JSON.stringify(shotgun));
    expect(problem).toContain('Standard mismatch: barrel.muzzle is smoothbore but suppressor.base is rifled');
  });

  it('cuts a well that reshapes to its magazine for that magazine standard, or none for a magazine of none', () => {
    const wellStandard = (magazineProfile: string) =>
      gunDomain.families
        .lower!.build({ layout: 'conventional', magazineWell: 'recessed', magazineProfile })
        .ports.find((port) => port.id === 'magazine')?.standard;
    expect(wellStandard('stanag-curved')).toBe('ar15-magazine');
    expect(wellStandard('ak-curved')).toBeUndefined();
  });

  it('fails a STANAG magazine in a fixed well sized by no magazine, which is cut for no standard', () => {
    const rifle = design('archetype-battle-rifle');
    rifle.assembly.parts.magazine.params = { ...rifle.assembly.parts.magazine.params, profile: 'stanag-curved' };
    expect(designTextProblem(JSON.stringify(rifle)).problem).toContain(
      'Standard mismatch: lower.magazine is unstated but magazine.top is ar15-magazine.',
    );
  });

  it('fails a magazine of another family in the large AR frame well, which is cut for SR-25 magazines', () => {
    for (const profile of ['ak-curved', 'stanag-straight']) {
      const rifle = design('archetype-ar-large');
      rifle.assembly.parts.magazine.params = { ...rifle.assembly.parts.magazine.params, profile };
      expect(designTextProblem(JSON.stringify(rifle)).problem, profile).toContain(
        'Standard mismatch: lower.magazine is ar10-magazine but magazine.top is',
      );
    }
  });

  it('fails a port declaring a standard its mount type does not list, naming the port', () => {
    const withoutMuzzleStandards = {
      ...GUN_PLATFORMS,
      standards: new Map([...GUN_PLATFORMS.standards].filter(([mount]) => mount !== 'muzzle')),
    };
    const { problem } = designTextProblem(JSON.stringify(design('archetype-pump-shotgun')), withoutMuzzleStandards);
    expect(problem).toContain('barrel.muzzle declares standard smoothbore, which muzzle mounts do not list');
  });
});

describe('the platform table', () => {
  it('gives every mount type that lists standards a swap path', () => {
    for (const mount of GUN_PLATFORMS.standards.keys()) {
      expect(GUN_PLATFORMS.swaps.has(mount), mount).toBe(true);
    }
  });
});
