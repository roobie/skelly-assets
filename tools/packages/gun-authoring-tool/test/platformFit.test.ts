import { resolve } from '@skelly/construct/assembly/resolve.ts';
import type { PortDef } from '@skelly/construct/assembly/schema.ts';
import { describe, expect, it } from 'vitest';
import { gunDomain } from '../src/gun/domain.ts';
import { type FitSide, fitMismatches } from '../src/gun/platformFit.ts';
import { withPlatformPorts } from '../src/gun/platforms.ts';
import { loadDesigns } from './helpers.ts';

const port = (overrides: Partial<PortDef>): PortDef => ({
  id: 'p',
  mount: 'barrel',
  gender: 'male',
  pos: [0, 0, 0],
  normal: [1, 0, 0],
  up: [0, 1, 0],
  ...overrides,
});
const side = (platform: string, overrides: Partial<PortDef>, name = 'part.p'): FitSide => ({
  platform,
  name,
  port: port(overrides),
});

/** Each curated design's joints, as the component met at a site and the site, with its platform's ports. */
const joints = loadDesigns().flatMap(({ label, assembly, platform }) => {
  if (platform === undefined) {
    throw new Error(`${label} names no platform`);
  }
  const resolved = withPlatformPorts(resolve(assembly, gunDomain), platform);
  return resolved.connections.map(({ conn, from, to }) => ({
    label,
    site: { platform: platform.id, name: conn.from, port: from.port },
    component: { platform: platform.id, name: conn.to, port: to.port },
  }));
});

describe('a component from one gun design fits a site on another', () => {
  it('fits where the mount type, size class and standard agree on one platform', () => {
    const site = side('ar', { gender: 'female', sizeClass: 'ar-15', standard: 'rifled' }, 'receiver.barrel');
    expect(fitMismatches(side('ar', { sizeClass: 'ar-15', standard: 'rifled' }), site)).toEqual([]);
  });

  it('refuses a component of another platform, even at a matching interface', () => {
    const site = side('ar', { gender: 'female', sizeClass: 'shared' });
    expect(fitMismatches(side('ak', { sizeClass: 'shared' }), site)).not.toEqual([]);
  });

  it('refuses a component of the same platform at another size class', () => {
    const site = side('ar', { gender: 'female', sizeClass: 'ar-15' });
    expect(fitMismatches(side('ar', { sizeClass: 'ar-10' }), site)).not.toEqual([]);
  });

  it('refuses a component whose interface does not meet the site', () => {
    const site = side('ar', { gender: 'female', sizeClass: 'ar-15' });
    for (const component of [
      side('ar', { gender: 'female', sizeClass: 'ar-15' }),
      side('ar', { mount: 'stock', sizeClass: 'ar-15' }),
      side('ar', { sizeClass: 'ar-15', standard: 'rifled' }),
    ]) {
      expect(fitMismatches(component, site), component.port.mount).not.toEqual([]);
    }
  });

  it('fits every curated component back onto its own site', () => {
    expect(joints.length).toBeGreaterThan(0);
    for (const { label, site, component } of joints) {
      expect(fitMismatches(component, site), `${label}: ${component.name} at ${site.name}`).toEqual([]);
    }
  });

  it('fits no curated component onto a site of a design of another platform', () => {
    const crossings = joints.flatMap(({ site }) =>
      joints
        .filter(({ component }) => component.platform !== site.platform)
        .map(({ component }) => ({ component, site })),
    );
    expect(crossings.length).toBeGreaterThan(0);
    const fits = crossings.filter(({ component, site }) => fitMismatches(component, site).length === 0);
    expect(fits.map(({ component, site }) => `${component.name} at ${site.name}`)).toEqual([]);
  });
});
