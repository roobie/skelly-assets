export function outputPath(packId: string, file: string): string;
export function readRoster(root?: string): { packId: string; id: string; file: string }[];
export function sidecarFile(packId: string, directory: string, id: string): string;
export function thingEntryFile(packId: string, id: string): string;
export function readMobRows(root?: string): Record<string, unknown>[];
export const SOUNDS: string;
export function soundPackIds(root?: string): string[];
export function readSoundPacks(root?: string): Record<string, Record<string, unknown>>;
export function readSoundRows(root?: string): {
  id: string;
  pack: string;
  row: { seeds: number[] } & Record<string, unknown>;
  data: string;
  variants: { seed: number; path: string }[];
}[];
export function smoothPack(packId: string): string;
export function smoothedPack(packId: string): string | undefined;
export function declaredPacks(root?: string): Set<string>;
export function undeclaredDirectories(paths: string[], declared: Set<string>): string[];
