// @ts-check
// Runs one exported function of a module over many tasks on worker threads, a task at a time per worker and the
// next task to whichever worker frees first. Model exports are CPU-bound and independent, so a build uses every core.
/** @import { PoolAnswer, PortableError } from './poolWorker.mjs' */
import { availableParallelism } from 'node:os';
import { Worker } from 'node:worker_threads';

/**
 * A pool that runs `Work`, the function its module exports by its name: a caller names `Work` by declaring the pool's
 * type, since the module is only loaded on the threads.
 * @template {(input: never) => unknown} Work
 * @typedef {object} WorkerPool
 * @property {(input: Parameters<Work>[0]) => Promise<Awaited<ReturnType<Work>>>} run
 * @property {() => Promise<void>} close
 */

const WORKER = new URL('./poolWorker.mjs', import.meta.url);

/**
 * A task's failure as poolWorker.mjs, portable, sent it.
 * @param {PortableError} error
 * @returns {Error}
 */
const revived = ({ message, stack, issues, cause }) =>
  Object.assign(new Error(message, cause === undefined ? undefined : { cause: revived(cause) }), {
    stack,
    ...(issues === undefined ? {} : { issues }),
  });

/**
 * `module` is a file URL and `name` the function it exports; tasks and results cross threads by structured clone.
 * @template {(input: never) => unknown} Work
 * @param {URL | string} module
 * @param {string} name
 * @returns {WorkerPool<Work>}
 */
export function workerPool(module, name, size = availableParallelism()) {
  /**
   * @typedef {object} Task
   * @property {Parameters<Work>[0]} input
   * @property {(value: Awaited<ReturnType<Work>>) => void} resolve
   * @property {(error: unknown) => void} reject
   */
  /** @type {Task[]} */
  const queue = [];
  /** @type {Worker[]} */
  const idle = [];
  /** @type {Map<Worker, Task>} the task each busy worker runs */
  const running = new Map();
  /** @type {Set<Worker>} */
  const workers = new Set();
  let closed = false;

  const start = () => {
    const worker = new Worker(WORKER, { workerData: { module: String(module), name } });
    workers.add(worker);
    worker.on('message', (/** @type {PoolAnswer<Awaited<ReturnType<Work>>>} */ answer) => {
      const task = running.get(worker);
      if (task === undefined) throw new Error('a pool worker answered with no task');
      running.delete(worker);
      if (answer.error === undefined) task.resolve(answer.value);
      else task.reject(revived(answer.error));
      next(worker);
    });
    // A worker that dies, by a throw outside a task or by exiting, takes only its own task down; the pool replaces it
    // for the rest. Without this its task would never settle and the build would wait on it forever.
    /** @param {unknown} error */
    const lost = (error) => {
      if (!workers.delete(worker)) return;
      if (idle.includes(worker)) idle.splice(idle.indexOf(worker), 1);
      running.get(worker)?.reject(error);
      running.delete(worker);
      if (queue.length > 0 && !closed) next(start());
    };
    worker.on('error', lost);
    worker.on('exit', (code) => {
      if (!closed) lost(new Error(`a pool worker exited with code ${code}`));
    });
    return worker;
  };

  /** @param {Worker} worker */
  const next = (worker) => {
    const task = queue.shift();
    if (task === undefined) {
      idle.push(worker);
      return;
    }
    running.set(worker, task);
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
