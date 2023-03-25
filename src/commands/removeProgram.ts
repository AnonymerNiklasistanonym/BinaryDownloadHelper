// Type imports
import type { CommandWorkerError, CommandWorkerResult } from "./generic";
import type { EnvironmentVariable, Program, Variable } from "../config";
import type { CommandOptionsRemove } from "../cli";
import type { Logger } from "winston";
import type { WorkerDataRemoveProgram } from "./worker/removeProgram";
// Package imports
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { Worker } from "worker_threads";
// Local imports
import { createLogFunc, createLogger, LoggerLevel } from "../logging";
import {
  generateProgramInfoString,
  printChangeOfEnvironmentVariables,
} from "./generic";
import { concurrentMap } from "../other/concurrency";
import { fileExists } from "../other/asyncFileOperations";
import { name } from "../../package.json";
import { readProgramConfigFile } from "./readConfig";
import { replaceVariables } from "../macros";
import { resolveProgramInformation } from "./resolveProgramInformation";

export enum WorkerRemoveProgramResultStatus {
  SUCCESS = "SUCCESS",
  SKIPPED = "SKIPPED",
  ERROR = "ERROR",
}

export interface WorkerRemoveProgramResult {
  status: WorkerRemoveProgramResultStatus;
}

export interface WorkerRemoveProgramSuccess extends WorkerRemoveProgramResult {
  environmentVariablesToRemove: EnvironmentVariable[];
  status: WorkerRemoveProgramResultStatus.SUCCESS;
}

export interface WorkerRemoveProgramError extends WorkerRemoveProgramResult {
  error: Error;
  status: WorkerRemoveProgramResultStatus.ERROR;
}

export interface WorkerRemoveProgramSkipped extends WorkerRemoveProgramResult {
  info: string;
  status: WorkerRemoveProgramResultStatus.SKIPPED;
}

export type WorkerRemoveProgramResults =
  | WorkerRemoveProgramSuccess
  | WorkerRemoveProgramError
  | WorkerRemoveProgramSkipped;

export const removeProgramWorker = async (
  program: Program,
  variables: Variable[],
  commandOptions: CommandOptionsRemove
): Promise<WorkerRemoveProgramResults> => {
  const logger = createLogger(
    `${name}_worker_remove_${program.name}`,
    path.join(os.tmpdir(), `${name}_worker_remove_${program.name}_logs`),
    commandOptions.verbose ? LoggerLevel.DEBUG : LoggerLevel.INFO,
    LoggerLevel.DEBUG
  );
  const programInformation = resolveProgramInformation(program, variables);
  logger.debug(
    `programInformation='${JSON.stringify(
      programInformation.programOutputFilePath
    )}'`
  );
  const environmentVariablesToRemove: EnvironmentVariable[] = [];
  if (await fileExists(programInformation.programConfigFilePath)) {
    logger.debug("program config file was found, remove it");
    const programConfig = await readProgramConfigFile(
      programInformation.programConfigFilePath
    );
    const newVariables: Variable[] = [
      programInformation.outputDirectoryVariable,
    ];
    if (variables) {
      newVariables.push(...variables);
    }
    if (programConfig.environmentVariables !== undefined) {
      environmentVariablesToRemove.push(
        ...programConfig.environmentVariables.map((variable) => {
          // If no copy is done the original array value is manipulated
          const newEnvVar = { ...variable };
          const processed = replaceVariables(newEnvVar.value, newVariables);
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          newEnvVar.value = processed.processedString;
          programInformation.usedVariables.push(
            ...processed.usedVariables.filter(
              (usedVariable) =>
                usedVariable.name !==
                programInformation.outputDirectoryVariable.name
            )
          );
          return newEnvVar;
        })
      );
    }
    // Remove all files listed in the config file and the config file itself
    await fs.rm(programInformation.programConfigFilePath);
    await fs.rm(programInformation.programOutputFilePath, { recursive: true });
    return {
      status: WorkerRemoveProgramResultStatus.SUCCESS,
      environmentVariablesToRemove,
    };
  }
  if (await fileExists(programInformation.programOutputFilePath)) {
    logger.debug("program dir/file was found, remove it");
    await fs.rm(programInformation.programOutputFilePath, { recursive: true });
    return {
      status: WorkerRemoveProgramResultStatus.SUCCESS,
      environmentVariablesToRemove,
    };
  }
  logger.debug("program is not installed, skip it");
  return {
    status: WorkerRemoveProgramResultStatus.SKIPPED,
    info: "not installed",
  };
};

export const printRemoveMessage = (
  program: Program,
  data: WorkerRemoveProgramResults
) => {
  switch (data.status) {
    case WorkerRemoveProgramResultStatus.ERROR:
      // eslint-disable-next-line no-console
      console.info(
        `Remove of ${generateProgramInfoString(program)} threw an error`
      );
      console.error(data.error);
      break;
    case WorkerRemoveProgramResultStatus.SKIPPED:
      // eslint-disable-next-line no-console
      console.info(
        `Remove of ${generateProgramInfoString(program)} skipped (${data.info})`
      );
      break;
    case WorkerRemoveProgramResultStatus.SUCCESS:
      // eslint-disable-next-line no-console
      console.info(
        `Removal of ${generateProgramInfoString(program)} successful`
      );
      printChangeOfEnvironmentVariables(
        data.environmentVariablesToRemove,
        false
      );
      break;
  }
};

export const removeProgramCommand = async (
  workerFile: string,
  programs: Program[],
  globalVariables: Variable[],
  commandOptions: CommandOptionsRemove,
  logger: Logger
) => {
  const mapper = (program: Program) => {
    const logFunc = createLogFunc(logger, "remove_program", program.name);
    const variables = globalVariables.concat([
      {
        name: "VERSION",
        value: program.version,
      },
      {
        name: "NAME",
        value: program.name,
      },
    ]);
    return new Promise<CommandWorkerResult<WorkerRemoveProgramResults>>(
      (resolve, reject) => {
        logFunc.debug("Worker: create");
        const messages: string[] = [];
        let data: WorkerRemoveProgramResults;
        new Worker(workerFile, {
          workerData: {
            options: commandOptions,
            program,
            variables,
          } satisfies WorkerDataRemoveProgram,
        })
          .on("online", () => {
            logFunc.debug("Worker: online");
          })
          .on(
            "message",
            (message: WorkerRemoveProgramResults | CommandWorkerError) => {
              logFunc.debug(`Worker: message: '${JSON.stringify(message)}'`);
              if ("workerError" in message) {
                const error = Error(message.name, { cause: message.message });
                logFunc.error(error);
                reject(error);
              } else {
                data = message;
              }
            }
          )
          .on("error", (err) => {
            logFunc.error(err);
            reject(err);
          })
          .on("exit", (exitCode) => {
            logFunc.debug(`Worker: exit (exitCode=${exitCode})`);
            if (!commandOptions.sorted) {
              printRemoveMessage(program, data);
            }
            resolve({ exitCode, messages, data, program });
          });
      }
    );
  };
  const workerResults = await concurrentMap(
    programs,
    mapper,
    os.cpus().length / 2
  );
  for (const workerResult of workerResults) {
    logger.info(`workerResult=${workerResult.program.name}`);
    if (commandOptions.sorted) {
      printRemoveMessage(workerResult.program, workerResult.data);
    }
  }
};
