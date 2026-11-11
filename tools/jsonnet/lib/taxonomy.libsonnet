// The taxonomy inheritance rule for Jsonnet sources (models/TAXONOMY.md); tools/taxonomy.mjs, inheritTaxonomy, is the
// same rule for JSON sources, and tools/test/taxonomy.test.mjs holds the two to each other.
{
  // A row's own taxonomy over a default: its category and keywords replace the default's, and each facet it names
  // replaces that facet's terms, so the facets it leaves out are inherited.
  over(base, own):: base + own + { tags: std.get(base, 'tags', {}) + std.get(own, 'tags', {}) },
  // Rows with `default` beneath each row's own taxonomy: wrap a set, a kit or a recipe's rows. Wrapping again with an
  // outer default fills only what the inner layers left unset.
  inherit(default, rows):: [row + { taxonomy: $.over(default, std.get(row, 'taxonomy', {})) } for row in rows],
  // The field that carries a source row's taxonomy onto the export row made from it, when it has one.
  of(row):: if std.objectHas(row, 'taxonomy') then { taxonomy: row.taxonomy } else {},
}
