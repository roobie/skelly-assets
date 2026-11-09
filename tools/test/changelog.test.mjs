import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { test } from 'node:test';
import { addedNotes, NOTES_DIR, parseNote, readNotes, release, versionSection } from '../changelog.mjs';

const note = (type, body) => `---\ntype: ${type}\n---\n${body}\n`;
const breaking = (change, upgrade) => note('breaking', `${change}\n\nUpgrade:\n${upgrade}`);

function withRoot(run) {
  const root = mkdtempSync(join(tmpdir(), 'changelog-'));
  try {
    mkdirSync(join(root, NOTES_DIR));
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const writeNotes = (root, notes) => {
  for (const [file, text] of Object.entries(notes)) writeFileSync(join(root, NOTES_DIR, file), text);
};

test('a note is refused without a known type, with a stray field or with an empty body', () => {
  assert.throws(() => parseNote('---\n---\nA line.\n', 'a.md'), /a\.md: missing type/);
  assert.throws(() => parseNote(note('tweaked', 'A line.'), 'a.md'), /unknown type "tweaked"/);
  assert.throws(() => parseNote('---\ntype: added\ntpye: fixed\n---\nA line.\n', 'a.md'), /unknown field "tpye"/);
  assert.throws(() => parseNote(note('added', '  '), 'a.md'), /empty body/);
  assert.throws(() => parseNote('A line.\n', 'a.md'), /front matter/);
  assert.deepEqual(parseNote(note('fixed', 'A line.'), 'a.md'), { file: 'a.md', type: 'fixed', change: 'A line.' });
});

test('a breaking note must say what a consumer does, and only a breaking note has an upgrade block', () => {
  assert.throws(() => parseNote(note('breaking', 'Renamed a thing.'), 'a.md'), /needs an "Upgrade:" line/);
  assert.throws(() => parseNote(breaking('Renamed a thing.', ''), 'a.md'), /needs an "Upgrade:" line/);
  assert.throws(() => parseNote(note('added', 'A thing.\n\nUpgrade:\n- Do it.'), 'a.md'), /only a breaking note/);
  assert.deepEqual(parseNote(breaking('Renamed a thing.', '- Rename it.'), 'a.md'), {
    file: 'a.md',
    type: 'breaking',
    change: 'Renamed a thing.',
    upgrade: '- Rename it.',
  });
});

test('reading the notes names every invalid note, not only the first, and skips the guide', () => {
  withRoot((root) => {
    writeNotes(root, { 'README.md': '# not a note\n', 'one.md': note('nope', 'x'), 'two.md': note('added', ''), 'ok.md': note('added', 'x') });
    assert.throws(() => readNotes(join(root, NOTES_DIR)), (error) => /one\.md/.test(error.message) && /two\.md/.test(error.message));
  });
});

test('a release groups its notes by type, breaking first, above the newest section, and deletes them', () => {
  withRoot((root) => {
    const preamble = '---\nread_if:\n  - x\n---\n\n# Changelog\n\nIntro.\n\n';
    writeFileSync(join(root, 'CHANGELOG.md'), `${preamble}## 0.1.0 - 2000-01-01\n\n### Added\n\n- Old.\n`);
    writeNotes(root, {
      'README.md': '# guide\n',
      'a.md': note('fixed', 'Fixed a thing.'),
      'b.md': breaking('Renamed a thing.\nIt reads better.', '- Rename your references.\n- Rebuild.'),
      'c.md': note('added', 'Added a thing.'),
      'd.md': breaking('Moved a thing.', 'Read it from its new path.'),
    });
    release(root, 'v0.2.0', '2000-02-02');
    const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
    assert.ok(changelog.startsWith(`${preamble}## 0.2.0 - 2000-02-02\n`));
    const groups = versionSection(changelog, '0.2.0');
    assert.deepEqual(groups.match(/^### .+/gm), ['### Breaking', '### Upgrading from 0.1.0', '### Added', '### Fixed']);
    assert.match(groups, /### Breaking\n\n- Renamed a thing\.\n {2}It reads better\.\n- Moved a thing\.\n/);
    assert.match(groups, /### Upgrading from 0\.1\.0\n\n- Rename your references\.\n- Rebuild\.\n- Read it from its new path\.\n/);
    assert.doesNotMatch(groups, /Old\./);
    assert.equal(versionSection(changelog, 'v0.1.0'), '### Added\n\n- Old.\n');
    assert.ok(!existsSync(join(root, NOTES_DIR, 'a.md')) && existsSync(join(root, NOTES_DIR, 'README.md')));
    assert.throws(() => release(root, '0.3.0', '2000-03-03'), /no change notes/);
  });
});

test('a tag without its changelog section is refused rather than released with empty notes', () => {
  assert.throws(() => versionSection('# Changelog\n\n## 0.1.0 - 2000-01-01\n\n- x\n', 'v0.1.1'), /no section for 0\.1\.1/);
});

test('only notes a range adds count for a PR, not edits to pending notes or to the guide', () => {
  withRoot((root) => {
    // Inherited GIT_* bindings would point the fixture's git at the repository running the test.
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
    const git = (...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: root, env });
    git('init', '-q');
    writeNotes(root, { 'README.md': '# guide\n', 'old.md': note('added', 'x') });
    git('add', '.');
    git('commit', '-qm', 'base');
    writeNotes(root, { 'README.md': '# guide, edited\n', 'old.md': note('added', 'y') });
    git('commit', '-qam', 'edits');
    assert.deepEqual(addedNotes(root, 'HEAD~1', env), []);
    writeNotes(root, { 'new.md': note('fixed', 'z') });
    git('add', '.');
    git('commit', '-qm', 'note');
    assert.deepEqual(addedNotes(root, 'HEAD~2', env), ['new.md']);
  });
});
