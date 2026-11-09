// Runs one exported function of a module over many tasks on worker threads, a task at a time per worker and the
// next task to whichever worker frees first. Model exports are CPU-bound and independent, so a build uses every core.
import { availableParallelism } from 'node:os';
import { Worker } from 'node:worker_threads';

const WORKER = new URL('./poolWorker.mjs', import.meta.url);

// A task's failure as poolWorker.mjs, portable, sent it.
const revived = ({ message, stack, issues, cause }) =>
  Object.assign(new Error(message, cause === undefined ? undefined : { cause: revived(cause) }), {
    stack,
    ...(issues === undefined ? {} : { issues }),
  });

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
      else reject(revived(error));
      next(worker);
    });
    // A worker that dies, by a throw outside a task or by exiting, takes only its own task down; the pool replaces it
    // for the rest. Without this its task would never settle and the build would wait on it forever.
    const lost = (error) => {
      if (!workers.delete(worker)) return;
      if (idle.includes(worker)) idle.splice(idle.indexOf(worker), 1);
      worker.task?.reject(error);
      worker.task = undefined;
      if (queue.length > 0 && !closed) next(start());
    };
    worker.on('error', lost);
    worker.on('exit', (code) => {
      if (!closed) lost(new Error(`a pool worker exited with code ${code}`));
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
