// Type imports
import type { Program, Variable } from "../../config";
import type { CommandOptionsInstall } from "../../cli";
import type { CommandWorkerError } from "../generic";
// Internal imports
import { parentPort, workerData } from "worker_threads";
// Local imports
import { installProgramWorker } from "../installProgram";

export interface WorkerDataInstallProgram {
  options: CommandOptionsInstall;
  program: Program;
  variables?: Variable[];
}

(async (): Promise<void> => {
  if (parentPort == null) {
    console.error(
      "Worker (install program) could not be started because parent port was null"
    );
  } else {
    const data = workerData as WorkerDataInstallProgram;
    try {
      const result = await installProgramWorker(
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
