import type { PortDef } from './schema.ts';

type PortSlots = NonNullable<PortDef['slots']>;

/**
 * The slot a connection's `slot` names on a port's `slots`, counted from the port's near end, or none when it lies
 * past either end. A negative slot counts from the far end, so a part can stand at a rail's end however long the rail.
 */
export const slotIndex = ({ count }: PortSlots, slot: number): number | undefined => {
  if (!Number.isInteger(slot) || slot < -count || slot >= count) {
    return undefined;
  }
  return slot < 0 ? count + slot : slot;
};

/** The slots a port offers, as a message names them. */
export const slotRange = ({ count }: PortSlots): string =>
  `slots 0 to ${count - 1}, or -1 to -${count} from the far end`;
