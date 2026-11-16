export function jsonnetFiles(directory?: string): string[];
export function refreshJsonnetTwins(
  sources: readonly string[],
  options: { root: string; stamp: string; store: string; code?: readonly string[]; rowIndexes?: readonly string[] },
): Promise<void>;
export function compilerCode(): string[];
export function installJsonnetSources(): Promise<void>;
