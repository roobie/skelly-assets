import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { evaluateJsonnet } from '../jsonnet/index.mjs';
import { PLACEMENTS_SOURCE, VEHICLE_ROWS_SOURCE } from '../placements.mjs';

const repo = resolve(import.meta.dirname, '../..');
const vehicles = join(repo, 'models/vehicles');

// The vehicle sources with borrowing switched off, so every vehicle fits its own pressings as it did before rows that
// differ only in paint were merged. The copy's files import their siblings by relative path, so swapping its kit swaps
// it for every vehicle; the row index imports by root path, so the copy's is made relative.
function withOwnPressings(use) {
  const copy = mkdtempSync(join(tmpdir(), 'own-pressings-'));
  try {
    cpSync(vehicles, copy, { recursive: true });
    writeFileSync(join(copy, 'kit.libsonnet'), `(import ${JSON.stringify(join(vehicles, 'kit.libsonnet'))}) + {
      borrows(s, suffix): false,
      partId(id, s, suffix): id + suffix,
      unborrowed(id, s, rows): rows,
      painted(id, s, pressings, fittings): fittings,
    }`);
    const index = join(copy, 'index.libsonnet');
    writeFileSync(index, readFileSync(index, 'utf8').replaceAll("import 'models/vehicles/", "import '"));
    return use(copy);
  } finally {
    rmSync(copy, { recursive: true, force: true });
  }
}

// The body part of each named row, from a row index. Only those rows are manifested.
const bodies = (indexImport, ids) => JSON.parse(evaluateJsonnet(`
  local byId = { [row.id]: row for row in std.flattenArrays(std.objectValues(import ${JSON.stringify(indexImport)})) };
  { [id]: byId[id].parts[0] for id in ${JSON.stringify([...ids])} }`, repo));

const drawnSlots = (part) => new Set(JSON.parse(part.params.pieces).map((piece) => piece.slot));

// A part as a vehicle shows it: its shape, mass and ports, and the material of each slot it draws, where a paintable
// slot takes the site's finish when it has one.
function shown(part, finish) {
  const { finish: slots, paintable = [], ...rest } = part;
  const drawn = drawnSlots(part);
  const looks = Object.fromEntries(Object.entries(slots).filter(([slot]) => drawn.has(slot))
    .map(([slot, material]) => [slot, paintable.includes(slot) ? finish ?? material : material]));
  return { ...rest, finish: looks };
}

// Merging rows that differ only in paint moves a vehicle's paint from its own row onto the sites that fit the lender.
// Every former site must still be there, where it was, showing the same part in the same paint.
test('a merged vehicle still places a part at every former site', () => {
  const merged = JSON.parse(evaluateJsonnet(`import '${PLACEMENTS_SOURCE}'`, repo));
  withOwnPressings((copy) => {
    const former = JSON.parse(evaluateJsonnet(`import ${JSON.stringify(join(copy, 'placements.libsonnet'))}`, repo));
    assert.deepEqual(Object.keys(merged).sort(), Object.keys(former).sort());
    const moved = [];
    for (const [vehicle, { sites }] of Object.entries(merged)) {
      const before = new Map(former[vehicle].sites.map((site) => [site.id, site]));
      assert.deepEqual(sites.map(({ id }) => id).sort(), [...before.keys()].sort(), vehicle);
      for (const site of sites) {
        const { part, finish, ...where } = site;
        const { part: own, ...was } = before.get(site.id);
        assert.deepEqual(where, was, `${vehicle}/${site.id}`);
        if (part !== own) moved.push({ where: `${vehicle}/${site.id}`, lender: part, own, finish });
      }
    }
    assert.ok(moved.length > 0, 'no vehicle borrows a pressing, so nothing was merged');
    const lent = bodies(join(repo, VEHICLE_ROWS_SOURCE), new Set(moved.map(({ lender }) => lender)));
    const owned = bodies(join(copy, 'index.libsonnet'), new Set(moved.map(({ own }) => own)));
    for (const { where, lender, own, finish } of moved) {
      assert.deepEqual(shown(lent[lender], finish), shown(owned[own]), `${where}: ${lender} in place of ${own}`);
    }
  });
});
