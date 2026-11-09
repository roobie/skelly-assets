// Runs one exported function of a module over many tasks on worker threads, a task at a time per worker and the
// next task to whichever worker frees first. Model exports are CPU-bound and independent, so a build uses every core.
import { availableParallelism } from 'node:os';
import { Worker } from 'node:worker_threads';

const WORKER = new URL('./poolWorker.mjs', import.meta.url);

// `module` is a file URL and `name` the function it exports; tasks and results cross threads by structured clone.
export function workerPool(module, name, size = availableParallelism()) {
  const queue = [];
  const idle = [];
  const workers = new Set();
  let closed = false;

  const start = () => {
    const worker = new Worker(WORKER, { workerData: { module: String(module), name } });
    workers.add(worker);
    worker.on('message', ({ value, error }) => {
      const { resolve, reject } = worker.task;
      worker.task = undefined;
      if (error === undefined) resolve(value);
      else reject(new Error(error));
      next(worker);
    });
    // A worker that dies takes only its own task down; the pool replaces it for the rest.
    worker.on('error', (error) => {
      workers.delete(worker);
      if (idle.includes(worker)) idle.splice(idle.indexOf(worker), 1);
      worker.task?.reject(error);
      worker.task = undefined;
      if (queue.length > 0 && !closed) next(start());
    });
    return worker;
  };

  const next = (worker) => {
    const task = queue.shift();
    if (task === undefined) {
      idle.push(worker);
      return;
    }
    worker.task = task;
    worker.postMessage(task.input);
  };

  return {
    run(input) {
      if (closed) throw new Error('the worker pool is closed');
      return new Promise((resolve, reject) => {
        queue.push({ input, resolve, reject });
        const worker = idle.pop() ?? (workers.size < size ? start() : undefined);
        if (worker) next(worker);
      });
    },
    async close() {
      closed = true;
      await Promise.all([...workers].map((worker) => worker.terminate()));
    },
  };
}
