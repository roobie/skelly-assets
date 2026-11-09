local params(values) = { [key]: if std.type(values[key]) == 'array' then std.manifestJson(values[key]) else std.toString(values[key]) for key in std.objectFields(values) };
local item(id, family, massKg, dimensions, finish) = {
  id: id,
  exportMass: 'parts',
  parts: [{ id: id, family: family, massKg: massKg, params: params(dimensions), finish: finish, ports: [] }],
  connections: [],
};
local compound(id, massKg, pieces, finish) = item(id, 'compound', massKg, { pieces: pieces }, finish);
local box(id, slot, min, max) = { id: id, slot: slot, kind: 'box', min: min, max: max };
local turned(id, slot, axis, profile, origin=null) = { id: id, slot: slot, kind: 'turned', axis: axis, profile: profile } + (if origin == null then {} else { origin: origin });
local prism(id, slot, axis, profile, start, end) = { id: id, slot: slot, kind: 'prism', axis: axis, profile: profile, start: start, end: end };
// A tool lies along x as compound.libsonnet's `gripOn` says; a flat-bladed one lies in the xz plane, as deadvox's melee tools do.
local gripOn = (import 'compound.libsonnet').gripOn;
{ item: item, compound: compound, box: box, turned: turned, prism: prism, gripOn: gripOn }
