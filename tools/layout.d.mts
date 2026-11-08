export function outputPath(packId: string, file: string): string;
export function readRoster(root?: string): { packId: string; id: string; file: string }[];
export function rosterFile(packId: string, id: string): string;
export function readMobRows(root?: string): Record<string, unknown>[];
export function declaredPacks(root?: string): Set<string>;
export function undeclaredDirectories(paths: string[], declared: Set<string>): string[];
