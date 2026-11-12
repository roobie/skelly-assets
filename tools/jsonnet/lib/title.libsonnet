// The field that carries a source row's authored title onto the export row made from it. A row without a title carries
// none, so the recipe schema refuses it by id (tools/packages/thing-export/src/recipe.ts, RowSchema).
{
  of(row):: if std.objectHas(row, 'title') then { title: row.title } else {},
}
