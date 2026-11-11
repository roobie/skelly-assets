// The fabric looks a finish can take: how rough the cloth, hide or rubber is, how it sheens at grazing angles and the
// grain a renderer draws over its colour (tools/packages/thing-core/src/materials.ts, FabricSchema). `kind` names the
// pattern; a look reuses a kind with its own response, as velvet is felt with a bright, tight sheen. A sheen's colour
// is the finish's own lightened by `tint`, because cloth sheens in its dye rather than in white.
local looks = {
  woven: { roughness: 0.9, sheen: { tint: 0.35, roughness: 0.5 }, fabric: { kind: 'woven', grain: 0.0018, relief: 0.5, noise: 0.08, crease: 0.22, fold: 0.07 } },
  satin: { roughness: 0.5, sheen: { tint: 0.6, roughness: 0.25 }, fabric: { kind: 'woven', grain: 0.0012, relief: 0.25, noise: 0.04, crease: 0.25, fold: 0.06 } },
  twill: { roughness: 0.85, sheen: { tint: 0.3, roughness: 0.5 }, fabric: { kind: 'twill', grain: 0.0016, relief: 0.55, noise: 0.12, crease: 0.25, fold: 0.06 } },
  knit: { roughness: 0.95, sheen: { tint: 0.4, roughness: 0.45 }, fabric: { kind: 'knit', grain: 0.003, relief: 0.6, noise: 0.08, crease: 0.2, fold: 0.08 } },
  lycra: { roughness: 0.55, sheen: { tint: 0.55, roughness: 0.3 }, fabric: { kind: 'knit', grain: 0.0012, relief: 0.25, noise: 0.03, crease: 0.15, fold: 0.06 } },
  felt: { roughness: 1, sheen: { tint: 0.3, roughness: 0.7 }, fabric: { kind: 'felt', grain: 0.003, relief: 0.35, noise: 0.07, crease: 0.18, fold: 0.1 } },
  velvet: { roughness: 0.9, sheen: { tint: 0.7, roughness: 0.3 }, fabric: { kind: 'felt', grain: 0.0015, relief: 0.15, noise: 0.04, crease: 0.3, fold: 0.07 } },
  leather: { roughness: 0.55, sheen: { tint: 0.15, roughness: 0.6 }, fabric: { kind: 'leather', grain: 0.002, relief: 0.25, noise: 0.05, crease: 0.25, fold: 0.09 } },
  suede: { roughness: 1, sheen: { tint: 0.35, roughness: 0.6 }, fabric: { kind: 'felt', grain: 0.002, relief: 0.2, noise: 0.06, crease: 0.22, fold: 0.09 } },
  rubber: { roughness: 0.7, sheen: { tint: 0.12, roughness: 0.7 }, fabric: { kind: 'rubber', grain: 0.0025, relief: 0.2, noise: 0.03, crease: 0.12, fold: 0.12 } },
};
{
  looks: looks,
  // A material of `colour` (sRGB) in the fabric `look`, with `tune` patched over the look's values.
  material(colour, look, tune={})::
    local l = std.mergePatch(looks[look], tune);
    {
      colour: colour,
      finish: {
        metallic: 0,
        roughness: l.roughness,
        sheen: { colour: [c + (1 - c) * l.sheen.tint for c in colour], roughness: l.sheen.roughness },
        fabric: l.fabric,
      },
    },
}
