// Holds a row file to plain data; see tools/sources.mjs, compileFragments. `rows(value)` is `value` when nothing an
// importer could reach differs from its manifested JSON, and otherwise an error naming the field path.
//
// Late binding shows only under extension, so each field is evaluated with every other field of its object overridden
// by an error, and with an error beneath every field: a read of `self`, `$` or `super` meets one and names the field
// it read.
local fail(path, problem) = error path + ': ' + problem;

local check(value, path) =
  if std.isFunction(value) then fail(path, 'is a function')
  else if std.isArray(value) then std.all([check(value[at], '%s[%d]' % [path, at]) for at in std.range(0, std.length(value) - 1)])
  else if std.isObject(value) then
    local fields = std.objectFieldsAll(value);
    local hidden = std.setDiff(fields, std.objectFields(value));
    if hidden != [] then fail('%s.%s' % [path, hidden[0]], 'is hidden')
    else std.all([
      local at = '%s.%s' % [path, field];
      local beneath = { [other]: fail(at, 'reads super.' + other) for other in fields };
      local over = { [other]: fail(at, 'reads late-bound self.' + other) for other in fields if other != field };
      check((beneath + value + over)[field], at)
      for field in fields
    ])
  else true;

{
  rows(value):: assert check(value, ''); value,
}
