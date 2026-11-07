import type { VehicleBlueprintInput } from '../../src/export.ts';

export const FRAME = 'vat_fx_frame';
export const PANEL = 'vat_fx_panel';
export const FLOOR = 'vat_fx_floor';
export const CARGO = 'vat_fx_cargo';
/** The panel model's datum: a nonzero local z, so a mirror cannot pass by negating the vehicle coordinate. */
export const DATUM = 'mark';
export const DATUM_LOCAL: readonly [number, number, number] = [0.1, 0.2, 0.3];
export const MOUNT = 'vat_fx_mount';
export const serviceFor = (name: string, durationSimSeconds = 30) => ({
  name,
  mount: MOUNT,
  durationSimSeconds,
  qualities: { wrenching: 1 },
});

/** A host with a floor and cargo space, a panel off the centre plane, and a wheel pair-to-be. */
export const host: VehicleBlueprintInput = {
  id: 'vat_fx_host',
  name: 'VAT fixture host',
  fittings: [
    { id: 'frame', part: FRAME, at: [0, 0, 0], supportedBy: [] },
    { id: 'floor', part: FLOOR, at: [0, 0, 0], supportedBy: ['frame'] },
    { id: 'hold', part: CARGO, at: [0.2, 0, 0.2], supportedBy: ['floor'], cargo: [2, 2, 2] },
    { id: 'panel', part: PANEL, at: [1, 0.5, 0.4], supportedBy: ['frame'] },
    { id: 'bolt', part: PANEL, at: [0.5, 0.5, 0], supportedBy: ['panel'] },
    { id: 'strut_near', part: PANEL, at: [1.2, 0.5, 0.7], supportedBy: ['frame'] },
    { id: 'strut_far', part: PANEL, at: [1.2, 0.5, -0.7], mirror: true, supportedBy: ['frame'] },
    {
      id: 'wheel',
      part: PANEL,
      at: [1.2, 0.3, 0.7],
      supportedBy: ['frame', 'strut_near'],
      service: serviceFor('Wheel'),
    },
    { id: 'cap', part: PANEL, at: [1.2, 0.4, 0.7], supportedBy: ['wheel'] },
    { id: 'reflector', part: PANEL, at: [1.2, 0.45, 0.7], supportedBy: ['wheel', 'frame'] },
  ],
};
