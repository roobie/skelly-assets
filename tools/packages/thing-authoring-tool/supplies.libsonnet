local params(values) = { [key]: std.toString(values[key]) for key in std.objectFields(values) };
local part(id, family, massKg, dimensions, finish, ports=[]) = { id: id, family: family, massKg: massKg, params: params(dimensions), finish: finish, ports: ports };
local atom(id, family, massKg, dimensions, finish, exportMass) = { id: id, exportMass: exportMass, parts: [part(id, family, massKg, dimensions, finish)], connections: [] };
{ atom: atom }
