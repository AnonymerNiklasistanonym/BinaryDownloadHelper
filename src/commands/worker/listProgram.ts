// Type imports
import type { Program, Variable } from "../../config";
import type { CommandOptionsList } from "../../cli";
// Internal imports
import { parentPort, workerData } from "worker_threads";
// Local imports
import { listProgramWorker } from "../listProgram";

export interface WorkerDataListProgram {
  options: CommandOptionsList;
  program: Program;
  variables?: Variable[];
}

(async (): Promise<void> => {
  if (parentPort == null) {
    console.error(
      "Worker (list program) could not be started because parent port was null"
    );
  } else {
    const data = workerData as WorkerDataListProgram;
    try {
      const result = await listProgramWorker(
        data.program,
        data.variables || [],
        data.options
      );
      parentPort.postMessage(result);
    } catch (err) {
      parentPort.postMessage(err);
    }
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
