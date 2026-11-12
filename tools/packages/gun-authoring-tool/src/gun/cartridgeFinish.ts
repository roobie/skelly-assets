import type { Cartridge } from '../ammo/cartridge.ts';
import { GUN_APPEARANCE } from './palette.ts';
import { shotshellHullMaterial } from './shotshellGeometry.ts';

/** The material each slot of a cartridge's round and case shows. */
export type CartridgeFinish = Readonly<Record<string, string>>;

/** The material each slot of a cartridge's round and case shows, so every drawing of the cartridge looks alike. */
export const cartridgeFinish = (
  cartridge: Cartridge,
  ownCases: Readonly<Record<string, string>> = GUN_APPEARANCE.cartridgeCases,
): CartridgeFinish => ({
  ...GUN_APPEARANCE.cartridgeFinish,
  ...(Object.hasOwn(ownCases, cartridge.id) ? { case: ownCases[cartridge.id]! } : {}),
  ...(cartridge.kind === 'shotshell' ? { hull: shotshellHullMaterial(cartridge) } : {}),
});
