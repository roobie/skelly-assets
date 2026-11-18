import type { Cartridge } from '../ammo/cartridge.ts';
import { GUN_APPEARANCE } from './palette.ts';
import { shotshellHullMaterial } from './shotshellGeometry.ts';

/** The material each slot of a cartridge's round and case shows. */
export type CartridgeFinish = Readonly<Record<string, string>>;

/** The material each slot of a cartridge's round and case shows, so every drawing of the cartridge looks alike. */
export const cartridgeFinish = (
  cartridge: Cartridge,
  ownFinishes: Readonly<Record<string, CartridgeFinish>> = GUN_APPEARANCE.cartridgeFinishes,
): CartridgeFinish => ({
  ...GUN_APPEARANCE.cartridgeFinish,
  ...(Object.hasOwn(ownFinishes, cartridge.id) ? ownFinishes[cartridge.id] : {}),
  ...(cartridge.kind === 'shotshell' ? { hull: shotshellHullMaterial(cartridge) } : {}),
});
