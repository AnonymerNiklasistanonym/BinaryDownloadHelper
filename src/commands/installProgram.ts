// Type imports
import type { CommandWorkerError, CommandWorkerResult } from "./generic";
import type { EnvironmentVariable, Program, Variable } from "../config";
import type { CommandOptionsInstall } from "../cli";
import type { Logger } from "winston";
import type { ProgramConfig } from "../unsorted";
import type { WorkerDataInstallProgram } from "./worker/installProgram";
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
import { downloadProgram } from "../downloadProgram";
import { fileExists } from "../other/asyncFileOperations";
import { makeArrayUnique } from "../other/arrayOperations";
import { name } from "../../package.json";
import { replaceVariables } from "../macros";
import { resolveProgramInformation } from "./resolveProgramInformation";

export enum WorkerInstallProgramResultStatus {
  SUCCESS = "SUCCESS",
  SKIPPED = "SKIPPED",
  ERROR = "ERROR",
}

export interface WorkerInstallProgramResult {
  status: WorkerInstallProgramResultStatus;
}

export interface WorkerInstallProgramSuccess
  extends WorkerInstallProgramResult {
  environmentVariablesToAdd: EnvironmentVariable[];
  programConfig: ProgramConfig;
  status: WorkerInstallProgramResultStatus.SUCCESS;
}

export interface WorkerInstallProgramError extends WorkerInstallProgramResult {
  error: Error;
  status: WorkerInstallProgramResultStatus.ERROR;
}

export interface WorkerInstallProgramSkipped
  extends WorkerInstallProgramResult {
  info: string;
  status: WorkerInstallProgramResultStatus.SKIPPED;
}

export type WorkerInstallProgramResults =
  | WorkerInstallProgramSuccess
  | WorkerInstallProgramError
  | WorkerInstallProgramSkipped;

export const installProgramWorker = async (
  program: Program,
  variables: Variable[],
  commandOptions: CommandOptionsInstall
): Promise<WorkerInstallProgramResults> => {
  const logger = createLogger(
    `${name}_worker_install_${program.name}`,
    path.join(os.tmpdir(), `${name}_worker_install_${program.name}_logs`),
    commandOptions.verbose ? LoggerLevel.DEBUG : LoggerLevel.INFO,
    LoggerLevel.DEBUG
  );
  const programInformation = resolveProgramInformation(program, variables);
  logger.debug(
    `programInformation='${JSON.stringify(
      programInformation.programOutputFilePath
    )}'`
  );

  // Check if the program download can be skipped
  if (await fileExists(programInformation.programOutputFilePath)) {
    logger.debug("program is installed, skip it");
    return {
      status: WorkerInstallProgramResultStatus.SKIPPED,
      info: "already installed",
    };
  }

  const environmentVariablesToAdd: EnvironmentVariable[] = [];
  try {
    // Download Program
    logger.debug("download program");
    await downloadProgram(program, programInformation, logger);
    logger.debug("download of program was successful");

    // Check for environment variables that need to be set
    if (program.environmentVariables) {
      logger.debug("found environment variables");
      const newVariables: Variable[] = [
        programInformation.outputDirectoryVariable,
      ];
      if (variables) {
        newVariables.push(...variables);
      }
      environmentVariablesToAdd.push(
        ...program.environmentVariables.map((variable) => {
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

    // Save program config information next to executable (directory)
    const updatedProgramConfig: ProgramConfig = {
      name: program.name,
      environmentVariables: program.environmentVariables,
      version: program.version,
      timeOfDownload: new Date().toISOString(),
      variables: makeArrayUnique(
        programInformation.usedVariables,
        (a) => a.name + a.value
      ),
    };
    await fs.writeFile(
      programInformation.programConfigFilePath,
      JSON.stringify(updatedProgramConfig)
    );
    return {
      status: WorkerInstallProgramResultStatus.SUCCESS,
      environmentVariablesToAdd,
      programConfig: updatedProgramConfig,
    };
  } catch (programDownloadError) {
    return {
      status: WorkerInstallProgramResultStatus.ERROR,
      error: programDownloadError as Error,
    };
  }
};

export const printInstallMessage = (
  program: Program,
  data: WorkerInstallProgramResults
) => {
  switch (data.status) {
    case WorkerInstallProgramResultStatus.ERROR:
      // eslint-disable-next-line no-console
      console.info(
        `Install of ${generateProgramInfoString(program)} threw an error`
      );
      console.error(data.error);
      break;
    case WorkerInstallProgramResultStatus.SKIPPED:
      // eslint-disable-next-line no-console
      console.info(
        `Install of ${generateProgramInfoString(program)} skipped (${
          data.info
        })`
      );
      break;
    case WorkerInstallProgramResultStatus.SUCCESS:
      // eslint-disable-next-line no-console
      console.info(
        `Install of ${generateProgramInfoString(program)} successful`
      );
      printChangeOfEnvironmentVariables(data.environmentVariablesToAdd, true);
      break;
  }
};

export const installProgramCommand = async (
  workerFile: string,
  programs: Program[],
  globalVariables: Variable[],
  commandOptions: CommandOptionsInstall,
  logger: Logger
) => {
  const mapper = (program: Program) => {
    const logFunc = createLogFunc(logger, "install_program", program.name);
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
    return new Promise<CommandWorkerResult<WorkerInstallProgramResults>>(
      (resolve, reject) => {
        logFunc.debug("Worker: create");
        const messages: string[] = [];
        let data: WorkerInstallProgramResults;
        new Worker(workerFile, {
          workerData: {
            options: commandOptions,
            program,
            variables,
          } satisfies WorkerDataInstallProgram,
        })
          .on("online", () => {
            logFunc.debug("Worker: online");
          })
          .on(
            "message",
            (message: WorkerInstallProgramResults | CommandWorkerError) => {
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
              printInstallMessage(program, data);
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
    if (commandOptions.sorted) {
      printInstallMessage(workerResult.program, workerResult.data);
    }
  }
};
