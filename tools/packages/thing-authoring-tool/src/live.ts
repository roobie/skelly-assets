import { type InferOutput, optional, parse, strictObject, string } from 'valibot';

/**
 * The page tells the dev server which row it views, and the server answers with that row evaluated from its Jsonnet,
 * now and after every saved source. It answers in halves, each as soon as it evaluates: the item alone draws the model,
 * and its recipe row reads every row's head, so it takes far longer and fails on any broken row file.
 */
export const LIVE_VIEW = 'tat:view';
export const LIVE_ROW = 'tat:row';

const RowViewSchema = strictObject({ item: string(), row: optional(string()) });

/** The catalogue item a page draws, and the recipe row that exports it where one does. */
export type RowView = InferOutput<typeof RowViewSchema>;

/** A view as a page sent it, which the server must not trust to be one. */
export const parseView = (value: unknown): RowView => parse(RowViewSchema, value);

/** What names a view, so the page and the server agree on which of them a result answers. */
export const viewKey = ({ item, row }: RowView) => JSON.stringify([item, row]);

/** One half of a view: its item, or its recipe row. */
export type Half = keyof RowView;

/** A view's halves with the ids they evaluate. */
export const halves = ({ item, row }: RowView): readonly (readonly [Half, string])[] => [
  ['item', item],
  ...(row === undefined ? [] : [['row', row] as const]),
];

/** A half's evaluated data, still to be validated by the page, or why it did not evaluate. */
export type HalfResult = { readonly value: unknown } | { readonly error: string };

export interface RowMessage {
  readonly view: RowView;
  readonly half: Half;
  readonly result: HalfResult;
}
