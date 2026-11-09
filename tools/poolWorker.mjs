// One thread of tools/workerPool.mjs: it imports the pool's module once and runs its function on every task posted.
import { parentPort, workerData } from 'node:worker_threads';

// A failure crosses threads as plain data, keeping what a reader needs to find the fault: the stack, the cause chain
// and a schema's issues by path (whole issues hold inputs and checks that do not clone).
const portable = (error) =>
  error instanceof Error
    ? {
        message: error.message,
        stack: error.stack,
        ...(Array.isArray(error.issues)
          ? { issues: error.issues.map(({ message, path }) => ({ message, path: path?.map(({ key }) => String(key)) })) }
          : {}),
        ...(error.cause === undefined ? {} : { cause: portable(error.cause) }),
      }
    : { message: String(error) };

const work = (await import(workerData.module))[workerData.name];
parentPort.on('message', async (input) => {
  try {
    parentPort.postMessage({ value: await work(input) });
  } catch (error) {
    parentPort.postMessage({ error: portable(error) });
  }
});
