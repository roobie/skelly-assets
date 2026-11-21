import { expect, it } from 'vitest';
import { evaluateJsonnetAsync } from '../../../jsonnet/index.mjs';
import { evaluateHalf } from '../server/evaluateRow.ts';

// One row of each kind of row file: an authored set, a numbered batch, a code-built kit and a vehicle.
const IDS = ['katana', 'fruit_press', 'armor_trooper_worn_upper', 'saloon_shell'];

// The server evaluates only the row file that holds a row, so that row must be the one the whole catalogue makes.
it('evaluates a row from its own file as the whole catalogue has it', { timeout: 120_000 }, async () => {
  const catalogue = JSON.parse(
    await evaluateJsonnetAsync(
      `[row for row in import 'models/index.libsonnet' if std.member(${JSON.stringify(IDS)}, row.id)]`,
      undefined,
      { label: 'catalogue rows' },
    ),
  ) as { id: string }[];
  expect(catalogue.map(({ id }) => id).sort()).toEqual([...IDS].sort());
  for (const row of catalogue) expect(await evaluateHalf('item', row.id)).toEqual({ value: row });
});
