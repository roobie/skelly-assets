local port(gender, normal) = {
  id: 'binding', mount: 'assembly-joint', gender: gender,
  pos: [0, 0, 0], normal: normal, up: [1, 0, 0], required: true,
};
local part(id, massKg, pieces, finish, binding) = {
  id: id, family: 'compound', massKg: massKg,
  params: { pieces: std.manifestJson(pieces) },
  finish: { paper: finish }, ports: [binding],
};
{ port: port, part: part }
