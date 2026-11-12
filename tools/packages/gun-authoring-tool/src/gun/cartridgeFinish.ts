import type { Cartridge } from '../ammo/cartridge.ts';
import { GUN_APPEARANCE } from './palette.ts';
import { shotshellHullMaterial } from './shotshellGeometry.ts';

const OWN_CASES: Readonly<Record<string, string>> = GUN_APPEARANCE.cartridgeCases;

/** The material each slot of a cartridge's round and case shows, so every drawing of the cartridge looks alike. */
export const cartridgeFinish = (cartridge: Cartridge): Readonly<Record<string, string>> => ({
  ...GUN_APPEARANCE.cartridgeFinish,
  ...(Object.hasOwn(OWN_CASES, cartridge.id) ? { case: OWN_CASES[cartridge.id]! } : {}),
  ...(cartridge.kind === 'shotshell' ? { hull: shotshellHullMaterial(cartridge) } : {}),
});
