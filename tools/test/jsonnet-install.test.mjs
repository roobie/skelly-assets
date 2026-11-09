import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, mkdirSync, mkdtempSync, openSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { test } from 'node:test';

import { installJsonnetArchive } from '../jsonnet/setup.mjs';

const EXECUTABLE_NAME = process.platform === 'win32' ? 'jsonnet.exe' : 'jsonnet';

function fixtureArchive(content) {
  const directory = mkdtempSync(join(tmpdir(), 'jsonnet-install-fixture-'));
  try {
    writeFileSync(join(directory, EXECUTABLE_NAME), content);
    const archivePath = join(directory, 'fixture.tar.gz');
    execFileSync('tar', ['-czf', archivePath, '-C', directory, EXECUTABLE_NAME]);
    const archive = readFileSync(archivePath);
    return { archive, hash: createHash('sha256').update(archive).digest('hex') };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function withTarget(body) {
  const target = mkdtempSync(join(tmpdir(), 'jsonnet-install-target-'));
  try {
    body(join(target, 'bin'));
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
}

test('reinstalling replaces the binary instead of rewriting the one a process may be running', () => {
  withTarget((target) => {
    const first = fixtureArchive('first binary');
    const second = fixtureArchive('second binary, longer');
    const executable = installJsonnetArchive(first.archive, first.hash, target);
    const running = openSync(executable, 'r');
    try {
      const inodeBefore = statSync(executable).ino;
      installJsonnetArchive(second.archive, second.hash, target);

      assert.notEqual(statSync(executable).ino, inodeBefore);
      assert.equal(readFileSync(running, 'utf8'), 'first binary');
      assert.equal(readFileSync(executable, 'utf8'), 'second binary, longer');
    } finally {
      closeSync(running);
    }
  });
});

test('installs into the same directory leave only the finished binary', () => {
  withTarget((target) => {
    const { archive, hash } = fixtureArchive('binary');
    installJsonnetArchive(archive, hash, target);
    installJsonnetArchive(archive, hash, target);

    assert.deepEqual(readdirSync(target), [EXECUTABLE_NAME]);
  });
});

test('a failed install removes its temporary file', () => {
  withTarget((target) => {
    const { archive, hash } = fixtureArchive('binary');
    mkdirSync(join(target, EXECUTABLE_NAME, 'occupied'), { recursive: true });

    assert.throws(() => installJsonnetArchive(archive, hash, target));
    assert.deepEqual(readdirSync(target), [EXECUTABLE_NAME]);
  });
});
