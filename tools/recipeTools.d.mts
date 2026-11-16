export interface RecipeTool {
  readonly kinds: readonly string[];
  tasks(rows: unknown[]): unknown[] | Promise<unknown[]>;
  exportOf(task: unknown): unknown;
  readonly directory: string;
  readonly index: boolean;
  readonly code?: readonly string[];
  readonly data?: readonly string[];
}
export function recipeTools(): Promise<Record<'gun' | 'thing', RecipeTool>>;
export function generateRow(input: { tool: 'gun' | 'thing'; task: unknown; cache?: string }): Promise<unknown>;
