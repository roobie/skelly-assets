import { describe, expect, it } from 'vitest';
import { loadExportRecipe } from '../src/cli/exportRecipe.ts';

interface GunEntry {
  readonly parts?: Readonly<Record<string, unknown>>;
  readonly gun: {
    readonly attachments?: readonly { readonly node: string }[];
    readonly slots?: { readonly magazine?: { readonly node: string } };
  };
}

// A part node is `<part id>:<family>`; the sidecar keys a body part by its id.
const partId = (node: string) => node.slice(0, node.indexOf(':'));

describe('a gun export records every component node it draws', () => {
  it.for(loadExportRecipe().filter(({ kind }) => kind === 'design'))(
    '$id lists each component as a body part or as a fitted item, never both and never neither',
    (row) => {
      const { modelEntry, partNodes } = row.generate();
      const { parts = {}, gun } = modelEntry as unknown as GunEntry;
      // Fitted attachments and the seated magazine come off in play, so their weight is their own item's, not the body's.
      const fitted = [
        ...(gun.attachments ?? []).map(({ node }) => node),
        ...(gun.slots?.magazine ? [gun.slots.magazine.node] : []),
      ];
      const bodyNodes = partNodes.filter((node) => !fitted.includes(node));
      expect(fitted.filter((node) => !partNodes.includes(node))).toEqual([]);
      expect(Object.keys(parts).sort()).toEqual(bodyNodes.map(partId).sort());
    },
  );
});
