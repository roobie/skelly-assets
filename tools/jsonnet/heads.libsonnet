// The head of a catalogue row: the fields a recipe reads of it, so a pack's recipes need the heads of the catalogue and
// not its rows. A recipe that reads another field of a row fails the equality of recipes over rows and over heads
// (tools/test/heads.test.mjs), because an optional field is read with std.objectHas or std.get and would only ever
// look absent.
local fields = ['id', 'title', 'taxonomy', 'exportMass', 'voxelClass', 'voxelGrain'];
{
  fields:: fields,
  // The heads of `rows`, each with the fields it has.
  // The heads of the row files under `folder` (a root-relative path, with its slash; empty for them all) from
  // models/catalogue/heads.libsonnet, in the order of the rows: the files by name without its extension, which is the
  // order of their row indexes.
  under(byFile, folder)::
    local files = std.sort(
      [path for path in std.objectFields(byFile) if std.startsWith(path, folder)],
      function(path) std.strReplace(path, '.libsonnet', ''),
    );
    std.flattenArrays([byFile[path] for path in files]),
  of(rows):: [{ [field]: row[field] for field in fields if std.objectHas(row, field) } for row in rows],
}
