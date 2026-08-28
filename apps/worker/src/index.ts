import { run } from "graphile-worker";
import { env } from "@yinne/config";
import { closeDatabase } from "@yinne/database";
import { taskList } from "./tasks";

const runner = await run({
  connectionString: env().WORKER_DATABASE_URL,
  concurrency: 5,
  noHandleSignals: true,
  pollInterval: 1000,
  taskList,
});

let stopping = false;
async function stop(signal: string): Promise<void> {
  if (stopping) return;
  stopping = true;
  console.log("Worker received " + signal + "; stopping gracefully.");
  await runner.stop();
  await closeDatabase();
}

process.once("SIGTERM", () => {
  void stop("SIGTERM");
});
process.once("SIGINT", () => {
  void stop("SIGINT");
});
