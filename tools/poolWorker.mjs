// @ts-check
// One thread of tools/workerPool.mjs: it imports the pool's module once and runs its function on every task posted.
/** @import { BaseIssue } from 'valibot' */
import { parentPort, workerData } from 'node:worker_threads';

/**
 * A failure as it crosses threads.
 * @typedef {object} PortableError
 * @property {string} message
 * @property {string | undefined} [stack]
 * @property {{ message: string; path: string[] | undefined }[] | undefined} [issues]
 * @property {PortableError | undefined} [cause]
 */
/**
 * What the thread answers a task with: what the function returned, or how it failed.
 * @template Value
 * @typedef {{ value: Value; error?: undefined } | { error: PortableError }} PoolAnswer
 */

/**
 * A failure crosses threads as plain data, keeping what a reader needs to find the fault: the stack, the cause chain
 * and a schema's issues by path (whole issues hold inputs and checks that do not clone).
 * @param {unknown} error
 * @returns {PortableError}
 */
const portable = (error) => {
  if (!(error instanceof Error)) return { message: String(error) };
  /** @type {readonly BaseIssue<unknown>[] | undefined} */
  const issues = 'issues' in error && Array.isArray(error.issues) ? error.issues : undefined;
  return {
    message: error.message,
    stack: error.stack,
    ...(issues === undefined
      ? {}
      : { issues: issues.map(({ message, path }) => ({ message, path: path?.map(({ key }) => String(key)) })) }),
    ...(error.cause === undefined ? {} : { cause: portable(error.cause) }),
  };
};

if (parentPort === null) throw new Error('tools/poolWorker.mjs runs only as a thread of tools/workerPool.mjs');
const port = parentPort;
/** @type {{ module: string; name: string }} */
const { module, name } = workerData;
/** @type {(input: unknown) => unknown} */
const work = (await import(module))[name];
port.on('message', async (input) => {
  try {
    /** @type {PoolAnswer<unknown>} */
    const answer = { value: await work(input) };
    port.postMessage(answer);
  } catch (error) {
    /** @type {PoolAnswer<unknown>} */
    const answer = { error: portable(error) };
    port.postMessage(answer);
  }
});
