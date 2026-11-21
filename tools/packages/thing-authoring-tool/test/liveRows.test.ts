import { expect, it } from 'vitest';
import { liveRows } from '../server/liveRows.ts';
import type { Half, HalfResult, RowMessage } from '../src/live.ts';

// Evaluations the test finishes by hand, so it decides what is still running when a page moves on.
const harness = () => {
  const started = new Map<string, (result: HalfResult) => void>();
  const delivered: RowMessage[] = [];
  const rows = liveRows<string>(
    (half: Half, id: string) => new Promise<HalfResult>((finish) => started.set(`${half} ${id}`, finish)),
    (_page, message) => delivered.push(message),
  );
  return { rows, started, delivered };
};
const settle = () => new Promise((done) => setTimeout(done));

it('answers each half in a message of its own, the item not waiting on its recipe row', async () => {
  const { rows, started, delivered } = harness();
  const view = { item: 'katana', row: 'katana_row' };
  rows.view('page', view);
  await settle();
  expect([...started.keys()]).toEqual(['item katana', 'row katana_row']);
  started.get('item katana')!({ value: 'item' });
  await settle();
  expect(delivered).toEqual([{ view, half: 'item', result: { value: 'item' } }]);
  started.get('row katana_row')!({ error: 'broken heads' });
  await settle();
  expect(delivered[1]).toEqual({ view, half: 'row', result: { error: 'broken heads' } });
});

it('evaluates the next view while a left view’s recipe row still runs, and delivers nothing of the left view', async () => {
  const { rows, started, delivered } = harness();
  const left = { item: 'katana', row: 'katana_row' };
  rows.view('page', left);
  rows.view('page', { item: 'saloon_shell', row: 'saloon_row' });
  rows.view('page', { item: 'armor_trooper_worn_upper' });
  await settle();
  started.get('item katana')!({ value: 'katana' });
  await settle();
  // The saloon was left while it waited, so neither of its halves evaluated.
  expect([...started.keys()]).toEqual(['item katana', 'row katana_row', 'item armor_trooper_worn_upper']);
  started.get('item armor_trooper_worn_upper')!({ value: 'trooper' });
  started.get('row katana_row')!({ value: 'katana row' });
  await settle();
  expect(delivered).toEqual([
    { view: { item: 'armor_trooper_worn_upper' }, half: 'item', result: { value: 'trooper' } },
  ]);
});
