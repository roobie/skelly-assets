local params(values) = { [key]: std.toString(values[key]) for key in std.objectFields(values) };
local part(id, family, massKg, dimensions, finish, ports=[]) = { id: id, family: family, massKg: massKg, params: params(dimensions), finish: finish, ports: ports };
local port(id, gender, pos, normal, up=[1, 0, 0]) = { id: id, mount: 'assembly-joint', gender: gender, pos: pos, normal: normal, up: up, required: true };
{ part: part, port: port }
