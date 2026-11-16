export const REPOSITORY_ROOT: string;
export function libraryPaths(repositoryRoot?: string): string[];
export function compileJsonnetFile(sourcePath: string, repositoryRoot?: string, options?: { overlay?: string }): string;
export function evaluateJsonnet(expression: string, repositoryRoot?: string): string;
export function evaluateJsonnetAsync(
  expression: string,
  repositoryRoot?: string,
  options?: { label?: string },
): Promise<string>;
export function compileJsonnetFiles(
  sourcePaths: readonly string[],
  repositoryRoot?: string,
  options?: { overlay?: string },
): string[];
