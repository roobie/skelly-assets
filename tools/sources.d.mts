export function installJsonnetSources(): void;
export function jsonnetFiles(directory?: string): string[];
export function refreshJsonnetTwins(sources: string[], options: { root: string; stamp: string }): void;
