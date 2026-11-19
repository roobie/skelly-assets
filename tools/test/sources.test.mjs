import assert from 'node:assert/strict';
import { execFile, execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import process from 'node:process';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import { SHARED_ENTRY_LIFE_MS } from '../entryFolder.mjs';
import { compilerCode, jsonnetFiles, refreshJsonnetTwins } from '../sources.mjs';

const execFileAsync = promisify(execFile);

const root = resolve(import.meta.dirname, '../..');
const tracked = execFileSync('git', ['-C', root, 'ls-files', '-z', '*.json'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);

const sources = jsonnetFiles();

test('package discovery finds Jsonnet sources', () => {
  assert.ok(sources.length > 0, `No Jsonnet sources discovered under ${join(root, 'tools/packages')}`);
});

for (const source of sources) {
  const twin = relative(root, source.replace(/\.jsonnet$/, '.json'));
  test(`${twin} is ignored and untracked`, () => {
    const ignored = spawnSync('git', ['-C', root, 'check-ignore', '--no-index', '--quiet', '--', twin]);
    assert.equal(ignored.status, 0, `${twin} must be ignored: ${ignored.stderr}`);
    assert.ok(!tracked.includes(twin), `${twin} must not be tracked`);
  });
}

test('no tracked JSON has a Jsonnet twin', () => {
  assert.deepEqual(
    tracked.filter((path) => existsSync(join(root, path.replace(/\.json$/, '.jsonnet')))),
    [],
  );
});

const moduleUrl = (path) => JSON.stringify(pathToFileURL(resolve(import.meta.dirname, path)).href);

// Another process's refresh, as a checkout sharing the store runs it.
const REFRESH_ELSEWHERE = `
import { refreshJsonnetTwins } from ${moduleUrl('../sources.mjs')};
const { sources, ...options } = JSON.parse(process.argv[1]);
await refreshJsonnetTwins(sources, options);
`;

// A refresh whose compiler finds `file` saved as `text` just before it evaluates the first expression that starts with
// `prefix`, as an edit landing after the refresh keyed the files would. The edit is saved once: the compiles run
// concurrently, and saving again under a running one would hand it a truncated file.
const REFRESH_EDITED_MIDWAY = `
import { writeFileSync } from 'node:fs';
import { mock } from 'node:test';
const { prefix, file, text, sources, ...options } = JSON.parse(process.argv[1]);
const real = await import(${moduleUrl('../jsonnet/index.mjs')});
let saved = false;
const editFirst = (expression, ...args) => {
  if (!saved && expression.startsWith(prefix)) {
    writeFileSync(file, text);
    saved = true;
  }
  return real.evaluateJsonnetAsync(expression, ...args);
};
mock.module(${moduleUrl('../jsonnet/index.mjs')}, { exports: { ...real, evaluateJsonnetAsync: editFirst } });
const { refreshJsonnetTwins } = await import(${moduleUrl('../sources.mjs')});
await refreshJsonnetTwins(sources, options);
`;

// A miniature repository: two twins over libraries, one over a row index, and the empty compile root the compiler runs
// in. The store sits under the root, as the default store does, and never enters a closure, unless the test names one.
const withTwinFixture = async (check, { store: sharedStore } = {}) => {
  const root = mkdtempSync(join(tmpdir(), 'sources-'));
  const write = (path, text) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  };
  try {
    mkdirSync(join(root, 'tools'));
    write('lib/value.libsonnet', '{ value: 1 }');
    write('lib/other.libsonnet', '{ other: 1 }');
    write('rows/a.libsonnet', "[{ id: 'a', value: 1 }]");
    write('rows/b.libsonnet', "[{ id: 'b' }]");
    write('rows/index.libsonnet', "{ a: import 'rows/a.libsonnet', b: import 'rows/b.libsonnet' }");
    write('source.jsonnet', "import 'lib/value.libsonnet'");
    write('other.jsonnet', "import 'lib/other.libsonnet'");
    write('pkg/nested.jsonnet', "import 'lib/value.libsonnet'");
    write('catalogue.jsonnet', "std.flattenArrays(std.objectValues(import 'rows/index.libsonnet'))");
    // The heads list each row file's rows by their id, as models/catalogue/heads.libsonnet lists the six fields; a
    // reader of them needs no row.
    write(
      'rows/heads.libsonnet',
      "local heads(rows) = [{ id: row.id } for row in rows]; { 'rows/a.libsonnet': heads(import 'rows/a.libsonnet'), 'rows/b.libsonnet': heads(import 'rows/b.libsonnet') }",
    );
    write('pkg/reader.jsonnet', "std.flattenArrays(std.objectValues(import 'rows/heads.libsonnet'))");
    const sources = ['source', 'other', 'pkg/nested', 'catalogue', 'pkg/reader'].map((name) =>
      join(root, `${name}.jsonnet`),
    );
    const store = sharedStore ?? join(root, '.build', 'store');
    const stamp = join(root, '.build', 'stamp');
    const options = (code) => ({
      root,
      stamp,
      store,
      code,
      rowIndexes: [join(root, 'rows/index.libsonnet')],
      heads: join(root, 'rows/heads.libsonnet'),
    });
    const refresh = (code = []) => refreshJsonnetTwins(sources, options(code));
    const refreshElsewhere = () =>
      execFileAsync(process.execPath, [
        '--input-type=module',
        '-e',
        REFRESH_ELSEWHERE,
        JSON.stringify({ sources, ...options([]) }),
      ]);
    const refreshEditedMidway = (prefix, path, text) =>
      execFileAsync(process.execPath, [
        '--experimental-test-module-mocks',
        '--input-type=module',
        '-e',
        REFRESH_EDITED_MIDWAY,
        JSON.stringify({ prefix, file: join(root, path), text, sources, ...options([]) }),
      ]);
    const twin = (name) => readFileSync(join(root, `${name}.json`), 'utf8');
    const value = (name) => JSON.parse(twin(name));
    const keep = (name) => writeFileSync(join(root, `${name}.json`), 'kept');
    // The stored entry, of `kind` rows or twins, whose JSON value `matches`.
    const entry = (kind, matches) =>
      readdirSync(join(store, kind))
        .filter((name) => name.endsWith('.json'))
        .map((name) => join(store, kind, name))
        .find((path) => matches(JSON.parse(readFileSync(path, 'utf8'))));
    await check({
      root,
      write,
      sources,
      store,
      stamp,
      refresh,
      refreshElsewhere,
      refreshEditedMidway,
      twin,
      value,
      keep,
      entry,
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

const fixtureTest = (name, check) =>
  test(name, () =>
    withTwinFixture(async (fixture) => {
      await fixture.refresh();
      await check(fixture);
    }),
  );

fixtureTest('unchanged inputs reuse the existing twins without recompiling', async ({ refresh, twin, keep }) => {
  keep('source');
  await refresh();
  assert.equal(twin('source'), 'kept');
});

fixtureTest(
  'an edited library recompiles the twins that import it and no other',
  async ({ write, refresh, value, twin, keep }) => {
    keep('other');
    write('lib/value.libsonnet', '{ value: 2 }');
    await refresh();
    assert.deepEqual(value('source'), { value: 2 });
    assert.deepEqual(value('pkg/nested'), { value: 2 });
    assert.equal(twin('other'), 'kept');
  },
);

fixtureTest(
  'an edited row file recompiles its own fragment, which the twin reads',
  async ({ write, refresh, value, entry }) => {
    writeFileSync(
      entry('rows', ([row]) => row.id === 'b'),
      JSON.stringify([{ id: 'b', kept: true }]),
    );
    write('rows/a.libsonnet', "[{ id: 'a', value: 2 }]");
    await refresh();
    assert.deepEqual(value('catalogue'), [
      { id: 'a', value: 2 },
      { id: 'b', kept: true },
    ]);
  },
);

fixtureTest(
  "a row file over another row file compiles over that file's fragment, which an edit of either recompiles",
  async ({ write, refresh, value, entry }) => {
    write('rows/c.libsonnet', "[{ id: 'c', from: (import 'rows/a.libsonnet')[0].value }]");
    write(
      'rows/index.libsonnet',
      "{ a: import 'rows/a.libsonnet', b: import 'rows/b.libsonnet', c: import 'rows/c.libsonnet' }",
    );
    await refresh();
    assert.deepEqual(value('catalogue').at(-1), { id: 'c', from: 1 });
    writeFileSync(
      entry('rows', ([row]) => row.id === 'a'),
      JSON.stringify([{ id: 'a', value: 5 }]),
    );
    write('rows/c.libsonnet', "[{ id: 'c', from: (import 'rows/a.libsonnet')[0].value, edited: true }]");
    await refresh();
    assert.deepEqual(value('catalogue').at(-1), { id: 'c', from: 5, edited: true });
    write('rows/a.libsonnet', "[{ id: 'a', value: 7 }]");
    await refresh();
    assert.deepEqual(value('catalogue').at(-1), { id: 'c', from: 7, edited: true });
  },
);

fixtureTest('row files that import each other fail naming their order', async ({ write, refresh }) => {
  write('rows/a.libsonnet', "[{ id: 'a', from: (import 'rows/c.libsonnet')[0].id }]");
  write('rows/c.libsonnet', "[{ id: 'c', from: (import 'rows/a.libsonnet')[0].id }]");
  write(
    'rows/index.libsonnet',
    "{ a: import 'rows/a.libsonnet', b: import 'rows/b.libsonnet', c: import 'rows/c.libsonnet' }",
  );
  await assert.rejects(refresh(), /row files that import each other have no order to compile in/);
});

// A fragment is its row file's manifested JSON, so a row file that is not plain data would build differently from its
// source; the compile refuses it, naming the file and the field.
for (const [problem, row, message] of [
  ['a function', "{ id: 'b', shape: function(x) x }", /\[0\]\.shape: is a function/],
  ['a hidden field', "{ id: 'b', parts:: [] }", /\[0\]\.parts: is hidden/],
  ['a late-bound self', "{ id: 'b', size: 1, box: { edge: $.size } }", /\[0\]\.box: reads late-bound self\.size/],
  ['a super', "{ id: 'b', tags+: ['round'] }", /\[0\]\.tags: reads super\.tags/],
]) {
  fixtureTest(`a row file with ${problem} fails naming its file and field`, async ({ write, refresh }) => {
    write('rows/b.libsonnet', `[${row}]`);
    await assert.rejects(
      refresh(),
      (error) => error.message.includes('rows/b.libsonnet') && message.test(error.message),
    );
  });
}

fixtureTest('a new file that shadows an import recompiles its importer', async ({ write, refresh, value }) => {
  write('pkg/lib/value.libsonnet', '{ value: 3 }');
  await refresh();
  assert.deepEqual(value('pkg/nested'), { value: 3 });
});

// The refresh keyed the file before the edit, so the edited output must not land under that key, nor the twin be
// stamped with it, or undoing the edit would leave the edited twin in place. A twin over an edited fragment is keyed by
// that fragment's digest, which it was built from, so it may be stored; the fragment may not.
const edited = (json) => JSON.stringify(json).includes('"value":2');
// A twin compiles by importing its source, and a row file by the expression that reads its rows.
for (const [compiled, prefix, path, text, name, kinds] of [
  ['a twin', 'import ', 'lib/value.libsonnet', '{ value: 2 }', 'source', ['rows', 'twins']],
  ['a row file', 'local ', 'rows/a.libsonnet', "[{ id: 'a', value: 2 }]", 'catalogue', ['rows']],
]) {
  test(`a file edited before ${compiled} reads it serves the checkout but lands nowhere under its old key`, () =>
    withTwinFixture(async ({ root, write, refresh, refreshEditedMidway, value, entry }) => {
      const original = readFileSync(join(root, path), 'utf8');
      await refreshEditedMidway(prefix, path, text);
      assert.ok(edited(value(name)), 'the checkout gets the output of the files the compile read');
      for (const kind of kinds) assert.equal(entry(kind, edited), undefined, `an edited ${kind} entry`);
      write(path, original);
      await refresh();
      assert.ok(!edited(value(name)), 'undoing the edit recompiles the twin');
    }));
}

fixtureTest(
  'a fresh checkout takes the stored twins of the same inputs',
  async ({ root, stamp, refresh, twin, entry }) => {
    writeFileSync(
      entry('twins', (twin) => twin.value === 1),
      '"stored"',
    );
    rmSync(join(root, 'source.json'));
    rmSync(stamp);
    await refresh();
    assert.equal(twin('source'), '"stored"');
  },
);

fixtureTest(
  'a private store left by other inputs yields their twins never and keeps none of them',
  async ({ root, write, stamp, refresh, value, entry }) => {
    const old = entry('twins', (twin) => twin.value === 1);
    write('lib/value.libsonnet', '{ value: 2 }');
    rmSync(join(root, 'source.json'));
    rmSync(stamp);
    await refresh();
    assert.deepEqual(value('source'), { value: 2 });
    assert.ok(!existsSync(old), 'the stale entry is pruned');
  },
);

// A store shared by worktrees and users is setgid and group-writable, as the host's would be.
const withSharedStore = async (check) => {
  const store = mkdtempSync(join(tmpdir(), 'twin-store-'));
  chmodSync(store, 0o2775);
  try {
    await check(store);
  } finally {
    rmSync(store, { recursive: true, force: true });
  }
};

test('a shared store keeps what other checkouts used lately and drops what none used for an entry life', () =>
  withSharedStore((store) =>
    withTwinFixture(
      async ({ write, refresh, value, entry }) => {
        const recompile = async (text) => {
          write('lib/value.libsonnet', text);
          await refresh();
        };
        await refresh();
        const first = entry('twins', (twin) => twin.value === 1);
        await recompile('{ value: 2 }');
        assert.ok(existsSync(first), 'an entry another checkout may still use is kept');
        const second = entry('twins', (twin) => twin.value === 2);
        const aged = (Date.now() - SHARED_ENTRY_LIFE_MS - 60_000) / 1000;
        utimesSync(first, aged, aged);
        await recompile('{ value: 3 }');
        assert.deepEqual(value('source'), { value: 3 });
        assert.ok(!existsSync(first), 'an entry unused for its life is dropped');
        assert.ok(existsSync(second), 'a recently used entry is kept');
      },
      { store },
    ),
  ));

test('a shared store counts the fragments a refresh still names as used, though its stored twins served it all', () =>
  withSharedStore((store) =>
    withTwinFixture(
      async ({ root, stamp, refresh }) => {
        await refresh();
        const fragments = readdirSync(join(store, 'rows')).map((name) => join(store, 'rows', name));
        const aged = (Date.now() - SHARED_ENTRY_LIFE_MS - 60_000) / 1000;
        for (const fragment of fragments) utimesSync(fragment, aged, aged);
        rmSync(join(root, 'catalogue.json'));
        rmSync(stamp);
        await refresh();
        for (const fragment of fragments)
          assert.ok(statSync(fragment).mtimeMs > Date.now() - SHARED_ENTRY_LIFE_MS, `${fragment} is in use`);
      },
      { store },
    ),
  ));

// A store root no refresh may write, with kind folders it may: anything of a refresh's own landing in the root, which
// another user could not prune, would fail the refresh.
test('a refresh lands nothing in the store root, only in its kind folders', () =>
  withSharedStore((store) =>
    withTwinFixture(
      async ({ refresh, value }) => {
        for (const kind of ['rows', 'twins']) mkdirSync(join(store, kind));
        chmodSync(store, 0o2555);
        try {
          await refresh();
        } finally {
          chmodSync(store, 0o2775);
        }
        assert.deepEqual(value('catalogue'), [{ id: 'a', value: 1 }, { id: 'b' }]);
      },
      { store },
    ),
  ));

test('checkouts refreshing into one shared store at once each get whole twins from one whole entry per unit', () =>
  withSharedStore((store) =>
    withTwinFixture(
      (one) =>
        withTwinFixture(
          async (other) => {
            await Promise.all([one, other, one, other].map(({ refreshElsewhere }) => refreshElsewhere()));
            for (const { value } of [one, other]) {
              assert.deepEqual(value('source'), { value: 1 });
              assert.deepEqual(value('catalogue'), [{ id: 'a', value: 1 }, { id: 'b' }]);
            }
            assert.deepEqual(readdirSync(store).sort(), ['rows', 'twins']);
            const partial = ['rows', 'twins']
              .flatMap((kind) => readdirSync(join(store, kind)))
              .filter((name) => !/^[0-9a-f]{64}\.(json|heads)$/.test(name));
            assert.deepEqual(partial, []);
            // One entry per unit, whichever checkout compiled it: a key that named the checkout would give two.
            assert.equal(readdirSync(join(store, 'rows')).length, 4, 'a fragment and its heads per row file');
            assert.equal(readdirSync(join(store, 'twins')).length, 5, 'a twin per source');
          },
          { store },
        ),
      { store },
    ),
  ));

fixtureTest('a changed compiler file recompiles the twins', async ({ root, refresh, value, keep }) => {
  const compiler = join(root, 'compile.mjs');
  writeFileSync(compiler, '// one compiler');
  await refresh([compiler]);
  keep('source');
  writeFileSync(compiler, '// another compiler');
  await refresh([compiler]);
  assert.deepEqual(value('source'), { value: 1 });
});

fixtureTest('an import of a text block fails rather than going untraced', async ({ write, refresh }) => {
  write('source.jsonnet', 'import |||\n  lib/value.libsonnet\n|||');
  await assert.rejects(refresh(), /text block/);
});

test('the twin digest covers this module, the compiler driver, the plain-data check and the compiler pin', () => {
  const code = compilerCode().map((path) => relative(root, path));
  for (const driver of [
    'tools/sources.mjs',
    'tools/jsonnet/index.mjs',
    'tools/jsonnet/plain-data.libsonnet',
    'tools/jsonnet/runtime.json',
  ])
    assert.ok(code.includes(driver), driver);
});

fixtureTest(
  'a twin whose bytes come out as they were keeps its mtime',
  async ({ root, write, refresh, value, twin, keep }) => {
    const mtime = (name) => statSync(join(root, `${name}.json`)).mtimeMs;
    const past = new Date(mtime('source') - 60_000);
    for (const name of ['source', 'other']) utimesSync(join(root, `${name}.json`), past, past);
    // Both twins go stale: one comes out different, the other the same, as a comment edit does.
    write('lib/value.libsonnet', '{ value: 2 }');
    write('lib/other.libsonnet', '{ other: 1 } // reworded');
    await refresh();
    assert.deepEqual(value('source'), { value: 2 });
    assert.ok(mtime('source') > past.getTime(), 'a changed twin is written');
    assert.equal(mtime('other'), past.getTime(), 'an identical twin is not');
    // The identical twin counts as fresh, so the next refresh leaves it alone.
    keep('other');
    await refresh();
    assert.equal(twin('other'), 'kept');
  },
);

// A twin keys by the digest of what stands in for a row file, not by the file: an edit that leaves the fragment as it
// was reaches no twin, and one that leaves the heads as they were reaches no twin that reads only them.
fixtureTest(
  'an edit that changes a row but no head recompiles the twins over the row and not those over the heads',
  async ({ write, refresh, value, twin, keep }) => {
    keep('pkg/reader');
    write('rows/a.libsonnet', "[{ id: 'a', value: 2 }]");
    await refresh();
    assert.deepEqual(value('catalogue'), [{ id: 'a', value: 2 }, { id: 'b' }]);
    assert.equal(twin('pkg/reader'), 'kept');
  },
);

fixtureTest(
  'an edit that changes a head recompiles the twins over the heads',
  async ({ write, refresh, value, twin, keep }) => {
    keep('catalogue');
    write('rows/a.libsonnet', "[{ id: 'a2', value: 1 }]");
    await refresh();
    assert.deepEqual(value('pkg/reader'), [{ id: 'a2' }, { id: 'b' }]);
    assert.equal(value('catalogue')[0].id, 'a2');
    keep('pkg/reader');
    await refresh();
    assert.equal(twin('pkg/reader'), 'kept');
  },
);

fixtureTest(
  'an edit that leaves every fragment as it was recompiles the row file and no twin',
  async ({ write, refresh, keep, twin }) => {
    keep('catalogue');
    keep('pkg/reader');
    write('rows/a.libsonnet', "[{ id: 'a', value: 1 }] // reworded");
    await refresh();
    assert.equal(twin('catalogue'), 'kept');
    assert.equal(twin('pkg/reader'), 'kept');
  },
);

fixtureTest('an unchanged tree reads no store entry', async ({ store, refresh, keep, twin }) => {
  keep('catalogue');
  for (const kind of ['rows', 'twins']) rmSync(join(store, kind), { recursive: true });
  await refresh();
  assert.equal(twin('catalogue'), 'kept');
});

fixtureTest(
  'the stamp names each row file by its key and the digests of its fragment and its heads',
  async ({ stamp, entry }) => {
    const { rows } = JSON.parse(readFileSync(stamp, 'utf8'));
    const [key, fragmentDigest, headsDigest] = rows['rows/a.libsonnet'];
    const fragment = entry('rows', ([row]) => row.id === 'a');
    const digest = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
    assert.equal(basename(fragment), `${key}.json`);
    assert.equal(digest(fragment), fragmentDigest);
    assert.equal(digest(fragment.replace(/\.json$/, '.heads')), headsDigest);
  },
);

// The stamp spares the refresh from reading the heads, so a row file added or deleted must still reach the twins over
// them, though no file of theirs changed.
fixtureTest('a row file deleted reaches the twins over the heads', async ({ root, write, refresh, value }) => {
  write('rows/index.libsonnet', "{ a: import 'rows/a.libsonnet' }");
  rmSync(join(root, 'rows/b.libsonnet'));
  await refresh();
  assert.deepEqual(value('pkg/reader'), [{ id: 'a' }]);
});

fixtureTest('a row file added reaches the twins over the heads', async ({ write, refresh, value }) => {
  write('rows/c.libsonnet', "[{ id: 'c' }]");
  write(
    'rows/index.libsonnet',
    "{ a: import 'rows/a.libsonnet', b: import 'rows/b.libsonnet', c: import 'rows/c.libsonnet' }",
  );
  await refresh();
  assert.deepEqual(value('pkg/reader'), [{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
});

// A compile stands in for a row file through the overlay, which mirrors only the plain paths below the root and is only
// a library path: any other way to the file would read it under a key that holds the stand-in's digest.
for (const [name, files] of [
  ['from the root beside it', { 'source.jsonnet': "import 'rows/a.libsonnet'" }],
  [
    'from the folder beside it',
    {
      'rows/c.libsonnet': "[{ id: 'c', from: (import 'a.libsonnet')[0].id }]",
      'rows/index.libsonnet':
        "{ a: import 'rows/a.libsonnet', b: import 'rows/b.libsonnet', c: import 'rows/c.libsonnet' }",
    },
  ],
  ['by its absolute path', { 'source.jsonnet': (root) => `import '${join(root, 'rows/a.libsonnet')}'` }],
  ['by a path up from beside the heads', { 'pkg/reader.jsonnet': "import '../rows/heads.libsonnet'" }],
  [
    'through a library path and a path up',
    {
      'pkg/nested.jsonnet': "import 'pkg/deep/x.libsonnet'",
      'pkg/deep/x.libsonnet': "import '../rows/a.libsonnet'",
    },
  ],
]) {
  fixtureTest(`a file that imports a stand-in ${name} is refused`, async ({ root, write, refresh }) => {
    for (const [path, text] of Object.entries(files)) write(path, typeof text === 'function' ? text(root) : text);
    await assert.rejects(refresh(), /a file a compile stands in for/);
  });
}

fixtureTest('a file that imports a stand-in by its root-relative path is served', async ({ write, refresh, value }) => {
  write('pkg/nested.jsonnet', "(import 'rows/a.libsonnet')[0]");
  await refresh();
  assert.deepEqual(value('pkg/nested'), { id: 'a', value: 1 });
});
