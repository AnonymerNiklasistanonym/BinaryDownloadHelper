// Type imports
import type { Program, Variable } from "../../config";
import type { CommandOptionsRemove } from "../../cli";
import type { CommandWorkerError } from "../generic";
// Internal imports
import { parentPort, workerData } from "worker_threads";
// Local imports
import { removeProgramWorker } from "../removeProgram";

export interface WorkerDataRemoveProgram {
  options: CommandOptionsRemove;
  program: Program;
  variables?: Variable[];
}

(async (): Promise<void> => {
  if (parentPort == null) {
    console.error(
      "Worker (remove program) could not be started because parent port was null"
    );
  } else {
    const data = workerData as WorkerDataRemoveProgram;
    try {
      const result = await removeProgramWorker(
        data.program,
        data.variables || [],
        data.options
      );
      parentPort.postMessage(result);
    } catch (err) {
      parentPort.postMessage({
        workerError: "workerError",
        message: (err as Error).message,
        name: (err as Error).name,
        stack: (err as Error).stack,
      } satisfies CommandWorkerError);
    }
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
