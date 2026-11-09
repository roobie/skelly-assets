// One thread of tools/workerPool.mjs: it imports the pool's module once and runs its function on every task posted.
import { parentPort, workerData } from 'node:worker_threads';

const work = (await import(workerData.module))[workerData.name];
parentPort.on('message', async (input) => {
  try {
    parentPort.postMessage({ value: await work(input) });
  } catch (error) {
    parentPort.postMessage({ error: error instanceof Error ? error.message : String(error) });
  }
});
