// Change notes in changes/ and the CHANGELOG.md sections assembled from them; why, and the note format, are in
// changes/README.md.
// Usage: node tools/changelog.mjs check                 validate every pending note
//        node tools/changelog.mjs require-note <base>   fail unless a note was added since <base>
//        node tools/changelog.mjs unreleased            print the pending notes as a release body
//        node tools/changelog.mjs release <version>     write the version's section and delete its notes
//        node tools/changelog.mjs notes <version>       print the version's section as a release body
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const NOTES_DIR = 'changes';
const CHANGELOG = 'CHANGELOG.md';
const GUIDE = 'README.md';

// Breaking comes first because it is the one group a consumer must act on before upgrading.
export const TYPES = ['breaking', 'added', 'changed', 'fixed', 'removed'];
const HEADINGS = { breaking: 'Breaking', added: 'Added', changed: 'Changed', fixed: 'Fixed', removed: 'Removed' };

const FRONT_MATTER = /^---\n((?:.*\n)*?)---\n([\s\S]*)$/;
// A breaking note's what-to-do follows this line, so the release can gather every step a consumer takes in one list.
const UPGRADE = /^Upgrade:[ \t]*$/m;

const plainVersion = (version) => version.replace(/^v/, '');
const isNote = (name) => name.endsWith('.md') && name !== GUIDE;

/** Parses one note; throws with every problem it has, named by the note's file. */
export function parseNote(text, file) {
  const match = FRONT_MATTER.exec(text.replaceAll('\r\n', '\n'));
  if (!match) throw new Error(`${file}: must start with front matter between --- lines`);
  const problems = [];
  const fields = {};
  for (const line of match[1].split('\n').filter((l) => l.trim())) {
    const field = /^(\w+):\s*(.*?)\s*$/.exec(line);
    if (!field) problems.push(`unreadable front matter line "${line}"`);
    else if (field[1] !== 'type') problems.push(`unknown field "${field[1]}"`);
    else fields.type = field[2];
  }
  if (!fields.type) problems.push(`missing type, one of: ${TYPES.join(', ')}`);
  else if (!TYPES.includes(fields.type)) problems.push(`unknown type "${fields.type}", one of: ${TYPES.join(', ')}`);
  const [change, upgrade] = splitUpgrade(match[2]);
  if (!change) problems.push('empty body');
  if (fields.type === 'breaking' && !upgrade) problems.push('a breaking note needs an "Upgrade:" line followed by what a consumer must do');
  if (fields.type !== 'breaking' && upgrade !== undefined) problems.push('only a breaking note has an "Upgrade:" block');
  if (problems.length) throw new Error(`${file}: ${problems.join('; ')}`);
  return upgrade === undefined ? { file, type: fields.type, change } : { file, type: fields.type, change, upgrade };
}

function splitUpgrade(body) {
  const marker = UPGRADE.exec(body);
  if (!marker) return [body.trim(), undefined];
  return [body.slice(0, marker.index).trim(), body.slice(marker.index + marker[0].length).trim()];
}

// A block that is already a list keeps its items; prose becomes one item.
const listItems = (block) => (block.startsWith('- ') ? block : `- ${block.split('\n').join('\n  ')}`);

/** Reads every pending note in `dir`, ordered by file name; throws listing every invalid note. */
export function readNotes(dir) {
  const files = readdirSync(dir).filter(isNote).sort();
  const notes = [];
  const problems = [];
  for (const file of files) {
    try {
      notes.push(parseNote(readFileSync(join(dir, file), 'utf8'), file));
    } catch (error) {
      problems.push(error.message);
    }
  }
  if (problems.length) throw new Error(problems.join('\n'));
  return notes;
}

/**
 * Renders notes grouped by type as `### <Group>` lists: breaking first, then every upgrade step since `previous`
 * (the version a consumer moves from, if any), then the other types.
 */
export function renderGroups(notes, previous) {
  const group = (heading, items) => `### ${heading}\n\n${items.join('\n')}\n`;
  const ofType = (type) => notes.filter((note) => note.type === type);
  const groups = [];
  for (const type of TYPES) {
    if (!ofType(type).length) continue;
    groups.push(group(HEADINGS[type], ofType(type).map((note) => listItems(note.change))));
    if (type === 'breaking') {
      groups.push(group(previous ? `Upgrading from ${plainVersion(previous)}` : 'Upgrading', ofType(type).map((note) => listItems(note.upgrade))));
    }
  }
  return groups.join('\n');
}

/** The newest version in the changelog, the one a consumer upgrades from. */
export function newestVersion(changelog) {
  return /^## (\S+)/m.exec(changelog)?.[1];
}

const sectionStart = (version) => new RegExp(`^## ${plainVersion(version).replaceAll('.', '\\.')}(?= |$)`, 'm');

/** Inserts the version's section above the newest one, keeping the file's front matter and preamble. */
export function addSection(changelog, version, date, notes) {
  if (sectionStart(version).test(changelog)) throw new Error(`${CHANGELOG} already has a section for ${plainVersion(version)}`);
  const section = `## ${plainVersion(version)} - ${date}\n\n${renderGroups(notes, newestVersion(changelog))}\n`;
  const newest = changelog.search(/^## /m);
  return newest < 0 ? `${changelog.trimEnd()}\n\n${section.trimEnd()}\n` : changelog.slice(0, newest) + section + changelog.slice(newest);
}

/** The groups of the version's section, without its heading, for a release body. */
export function versionSection(changelog, version) {
  const start = changelog.search(sectionStart(version));
  if (start < 0) throw new Error(`${CHANGELOG} has no section for ${plainVersion(version)}; run the release step before tagging`);
  const body = changelog.slice(changelog.indexOf('\n', start) + 1);
  const next = body.search(/^## /m);
  return `${(next < 0 ? body : body.slice(0, next)).trim()}\n`;
}

/** Moves the pending notes into the version's CHANGELOG section and deletes them. */
export function release(root, version, date) {
  const dir = join(root, NOTES_DIR);
  const notes = readNotes(dir);
  if (!notes.length) throw new Error(`no change notes in ${NOTES_DIR}/ to release`);
  const path = join(root, CHANGELOG);
  writeFileSync(path, addSection(readFileSync(path, 'utf8'), version, date, notes));
  for (const note of notes) rmSync(join(dir, note.file));
  return notes;
}

/** The notes a commit range adds, so a PR's own note is told apart from those already pending. */
export function addedNotes(root, base, env = process.env) {
  const prefix = `${NOTES_DIR}/`;
  const out = execFileSync('git', ['diff', '--name-only', '--diff-filter=A', base, 'HEAD', '--', prefix], { cwd: root, env, encoding: 'utf8' });
  return out
    .split('\n')
    .filter((path) => path.startsWith(prefix))
    .map((path) => path.slice(prefix.length))
    .filter((name) => !name.includes('/') && isNote(name));
}

const today = () => new Date().toISOString().slice(0, 10);

function main([command, arg]) {
  const notesDir = join(ROOT, NOTES_DIR);
  switch (command) {
    case 'check':
      console.log(`${readNotes(notesDir).length} change notes are valid`);
      return;
    case 'require-note': {
      if (!arg) throw new Error('usage: require-note <base>');
      const added = addedNotes(ROOT, arg);
      if (!added.length) {
        throw new Error(`add a change note under ${NOTES_DIR}/ (see ${NOTES_DIR}/${GUIDE}), or label the PR no-changelog if consumers notice nothing`);
      }
      console.log(`adds ${added.join(' ')}`);
      return;
    }
    case 'unreleased':
      process.stdout.write(renderGroups(readNotes(notesDir), newestVersion(readFileSync(join(ROOT, CHANGELOG), 'utf8'))));
      return;
    case 'release': {
      if (!arg) throw new Error('usage: release <version>');
      const notes = release(ROOT, arg, today());
      console.log(`wrote ${plainVersion(arg)} to ${CHANGELOG} from ${notes.length} notes and deleted them`);
      return;
    }
    case 'notes':
      if (!arg) throw new Error('usage: notes <version>');
      process.stdout.write(versionSection(readFileSync(join(ROOT, CHANGELOG), 'utf8'), arg));
      return;
    default:
      throw new Error('usage: node tools/changelog.mjs check | require-note <base> | unreleased | release <version> | notes <version>');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
