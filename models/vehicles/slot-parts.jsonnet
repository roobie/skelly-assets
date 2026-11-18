// What the stowage check reads of the vehicles, compiled to a twin (tools/sources.mjs) so a build reuses it until a
// file it imports changes; tools/stowage.mjs, readSlotParts, gives its shape. Only rows with slots are manifested,
// which keeps the evaluation cheap.
local mount = (import 'models/stowage.libsonnet').mount;
local rows = std.flattenArrays(std.objectValues(import 'models/vehicles/index.libsonnet'));
{
  grain: (import 'models/voxel-grains.libsonnet').classes.vehicle.grain,
  parts: [
    {
      id: row.id,
      partCount: std.length(row.parts),
      ports: [port for port in row.parts[0].ports if port.mount == mount],
      pieces: std.parseJson(std.get(row.parts[0].params, 'pieces', '[]')),
    }
    for row in rows
    if std.length([port for part in row.parts for port in part.ports if port.mount == mount]) > 0
  ],
}
