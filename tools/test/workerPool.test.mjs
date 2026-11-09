import assert from 'node:assert/strict';
import { test } from 'node:test';
import { workerPool } from '../workerPool.mjs';

const TASKS = new URL('./fixtures/poolTasks.mjs', import.meta.url);
// A lost worker used to leave its task unsettled, which hangs rather than fails; the limit turns a hang into a failure.
const HANG = { timeout: 10_000 };

test('a worker that exits mid-task fails only that task; the pool finishes the rest', HANG, async () => {
  const pool = workerPool(TASKS, 'poolTask', 1);
  try {
    const [exited, after] = await Promise.allSettled([pool.run({ ending: 'exit' }), pool.run({ value: 7 })]);
    assert.match(exited.reason.message, /exited with code 3/);
    assert.equal(after.value, 7);
  } finally {
    await pool.close();
  }
});

test('a task failure reaches the caller with its stack, cause and schema issues', async () => {
  const pool = workerPool(TASKS, 'poolTask', 1);
  try {
    const failure = await pool.run({ ending: 'throw' }).catch((error) => error);
    assert.match(failure.stack, /poolTasks\.mjs/);
    assert.deepEqual(failure.cause.issues, [{ message: 'too small', path: ['grain'] }]);
  } finally {
    await pool.close();
  }
});

