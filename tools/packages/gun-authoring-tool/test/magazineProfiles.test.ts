import { describe, expect, it } from 'vitest';
import content from '../../../../models/guns/tables/magazines.json' with { type: 'json' };
import { loadMagazineContent } from '../src/gun/magazineProfiles.ts';

const withStandards = (standards: Record<string, string>) => ({ ...content, standards });

describe('the magazine table load check', () => {
  it('loads the authored table', () => {
    expect(loadMagazineContent(content).standards).toEqual(content.standards);
  });

  it('refuses a standard given to a profile no magazine has, naming it', () => {
    expect(() => loadMagazineContent(withStandards({ 'stanag-bent': 'ar15-magazine' }))).toThrow(
      'standards.stanag-bent: no magazine profile is named stanag-bent',
    );
  });

  it('refuses a profile cut for a standard magazine mounts do not list, naming it', () => {
    expect(() => loadMagazineContent(withStandards({ 'ak-curved': 'ak-magazine' }))).toThrow(
      'standards.ak-curved: magazine mounts do not list standard ak-magazine',
    );
  });
});
