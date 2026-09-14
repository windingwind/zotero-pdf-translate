import type { TranslateTask } from "./task";

/**
 * The batch concurrency setting: how many tasks of one batch may be in flight at the same time.
 *
 * 1 means the batch runs strictly serially. There is no upper bound; anything that is not a usable
 * number reads as 1.
 */
export function normalizeBatchConcurrency(value: unknown) {
  const concurrency = Math.trunc(Number(value));
  return Number.isFinite(concurrency) && concurrency > 1 ? concurrency : 1;
}

/**
 * The item that a running translation task is writing to.
 *
 * A task for an item waits for the task already holding it, across batches as well: two tasks
 * writing the same item at the same time lose one of the two results.
 */
const itemLocks = new Map<number, Promise<void>>();

function withItemLock<T>(
  itemId: number | undefined,
  job: () => Promise<T>,
): Promise<T> {
  if (itemId === undefined) {
    return job();
  }
  const busy = itemLocks.get(itemId) ?? Promise.resolve();
  // Chained onto whatever holds the item, so `job` starts only once that has settled.
  const done = busy.then(job, job);
  const tail = done.then(
    () => undefined,
    () => undefined,
  );
  itemLocks.set(itemId, tail);
  return done.finally(() => {
    if (itemLocks.get(itemId) === tail) {
      itemLocks.delete(itemId);
    }
  });
}

/**
 * Run a batch of tasks with at most `concurrency` of them in flight.
 *
 * Each worker awaits `waitBetweenTasks()` between its own consecutive tasks, so a concurrency of 1
 * reproduces the serial loop this replaces. A task that fails is reported to `onTaskError` and does
 * not stop the rest of the batch.
 */
export async function runTranslateBatch(
  tasks: TranslateTask[],
  {
    concurrency,
    run,
    onTaskError,
    waitBetweenTasks,
  }: {
    concurrency: number;
    run: (task: TranslateTask) => Promise<void>;
    onTaskError: (task: TranslateTask, error: unknown) => void;
    waitBetweenTasks: () => Promise<void>;
  },
) {
  const pending = tasks.slice();
  const worker = async () => {
    for (let task = pending.shift(); task; task = pending.shift()) {
      try {
        await withItemLock(task.itemId, () => run(task));
      } catch (e) {
        onTaskError(task, e);
      }
      await waitBetweenTasks();
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, pending.length) }, worker),
  );
}
