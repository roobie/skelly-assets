// A part built as a core and accessories that are each a row of their own, and the two ways a vehicle fits it: one
// fused model, or the core with each accessory at its own site, so each is its own loot. Both are drawn from the same
// pieces and weigh the same, so a vehicle or a mod picks the detail without changing what it is; see
// `docs/decisions/0004-assemblies.md`.
//
// A drawing is { pieces, finish }. An accessory is { site, id, massKg, drawn, at }: the site it is fitted at, its row,
// and where its own frame's origin sits in the part's frame. One row may be fitted at several sites.
local k = import 'kit.libsonnet';
local site = import 'site.libsonnet';
local plus(a, b) = [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// An accessory's pieces in the part's frame, renamed after its site so they cannot clash with the core's or another
// fitting's of the same row. The body paint slot keeps its name, so a site's paint repaints the fused part as it
// repaints the core and each accessory (`docs/decisions/0003-vehicle-paint.md`).
local paint = 'paint';
local fitted(accessory) = {
  local role = accessory.site,
  local named(slot) = if slot == paint then paint else role + '_' + slot,
  pieces: [
    k.moved(piece, accessory.at) + { id: role + '_' + piece.id, slot: named(piece.slot) }
    for piece in accessory.drawn.pieces
  ],
  finish: { [named(slot)]: accessory.drawn.finish[slot] for slot in std.objectFields(accessory.drawn.finish) },
};
// The finish of the core and its fitted accessories, which must agree on the body paint they share.
local merged(core, dressed) = std.foldl(function(all, d)
  assert !std.objectHas(all, paint) || !std.objectHas(d.finish, paint) || all[paint] == d.finish[paint] : 'an assembly paints its parts in one finish';
  all + d.finish, dressed, core.finish);

{
  // The core and fused rows of a part whose whole dressed mass is `massKg`, so the core takes what its accessories
  // leave; `title` is the fused row's and `coreTitle` the core's.
  rows(fusedId, coreId, title, coreTitle, massKg, core, accessories):
    local dressed = [fitted(a) for a in accessories];
    local accessoryMass = std.sum([a.massKg for a in accessories]);
    assert accessoryMass < massKg : fusedId + "'s accessories outweigh the whole part";
    [
      k.compound(coreId, massKg - accessoryMass, core.pieces, core.finish) + { title: coreTitle },
      k.compound(fusedId, massKg, core.pieces + std.flattenArrays([d.pieces for d in dressed]), merged(core, dressed)) + { title: title },
    ],
  // An accessory's own row.
  row(id, title, massKg, drawn): k.compound(id, massKg, drawn.pieces, drawn.finish) + { title: title },
  // Every site the part can take: its core's and each accessory's.
  siteIds(coreSite, accessories): [coreSite] + [a.site for a in accessories],
  // The part's sites, its frame placed at `at`. `detail` picks how much of it is salvageable: 'fused' fits the whole
  // part as one model at `coreSite`, and 'assembly' fits the core there and each accessory at its own site. A body
  // kit that builds a game's blueprint passes its own vehicle kit (`site.libsonnet`, `kit`) and what holds the part
  // on, so its fittings and placements come from one list.
  sites(coreSite, fusedId, coreId, accessories, at, detail, kit=site.kit, supportedBy=[]):
    assert std.member(['fused', 'assembly'], detail) : 'a part is fused or an assembly, not ' + detail;
    if detail == 'fused' then [kit.fitting(coreSite, fusedId, at, supportedBy)]
    else [kit.fitting(coreSite, coreId, at, supportedBy)] + [kit.fitting(a.site, a.id, plus(at, a.at), supportedBy) for a in accessories],
}
