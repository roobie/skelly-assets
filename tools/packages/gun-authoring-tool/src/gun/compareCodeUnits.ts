/** Orders strings by UTF-16 code unit, so an export is the same on every machine; `localeCompare` follows the runtime locale. */
export const compareCodeUnits = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
