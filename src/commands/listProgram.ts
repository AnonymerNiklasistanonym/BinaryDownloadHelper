// Type imports
import type { Config, Program, ProgramConfig, Variable } from "../config";
import type { CommandOptionsList } from "../cli";
import type { CommandWorkerResult } from "./generic";
import type { Logger } from "winston";
import type { WorkerDataListProgram } from "./worker/listProgram";
// Package imports
import os from "os";
import path from "path";
import { Worker } from "worker_threads";
// Local imports
import { createLogFunc, createLogger, LoggerLevel } from "../logging";
import { defaultVariables, generateProgramInfoString } from "./generic";
import { fileExists } from "../other/asyncFileOperations";
import { name } from "../../package.json";
import { readProgramConfigFile } from "./readConfig";
import { resolveProgramInformation } from "./resolveProgramInformation";

export enum WorkerListProgramResultStatus {
  FOUND = "FOUND",
  NOT_FOUND = "NOT_FOUND",
}

export interface WorkerListProgramResult {
  status: WorkerListProgramResultStatus;
}

export interface WorkerListProgramFound extends WorkerListProgramResult {
  status: WorkerListProgramResultStatus.FOUND;
  programConfig: ProgramConfig;
}

export interface WorkerListProgramNotFound extends WorkerListProgramResult {
  status: WorkerListProgramResultStatus.NOT_FOUND;
}

export type WorkerListProgramResults =
  | WorkerListProgramFound
  | WorkerListProgramNotFound;

export const listProgramWorker = async (
  program: Program,
  variables: Variable[],
  commandOptions: CommandOptionsList
): Promise<WorkerListProgramResults> => {
  const logger = createLogger(
    `${name}_worker_list_${program.name}`,
    path.join(os.tmpdir(), `${name}_worker_list_${program.name}_logs`),
    commandOptions.verbose ? LoggerLevel.DEBUG : LoggerLevel.INFO,
    LoggerLevel.DEBUG
  );
  const programInformation = resolveProgramInformation(program, variables);
  logger.debug(
    `programInformation='${JSON.stringify(
      programInformation.programOutputFilePath
    )}'`
  );
  if (await fileExists(programInformation.programConfigFilePath)) {
    logger.debug("program config file was found, list it");
    const programConfig = await readProgramConfigFile(
      programInformation.programConfigFilePath
    );
    return { status: WorkerListProgramResultStatus.FOUND, programConfig };
  }
  logger.debug("program config file was not found");
  return { status: WorkerListProgramResultStatus.NOT_FOUND };
};

export const printListMessage = (
  program: Program,
  data: WorkerListProgramResults
) => {
  switch (data.status) {
    case WorkerListProgramResultStatus.NOT_FOUND:
      // eslint-disable-next-line no-console
      console.info(
        `${generateProgramInfoString(program)} was not found installed`
      );
      break;
    case WorkerListProgramResultStatus.FOUND:
      // eslint-disable-next-line no-console
      console.info(
        `${generateProgramInfoString(program)} was not found: (${
          data.programConfig.version
        }, ${new Date(data.programConfig.timeOfDownload).toLocaleDateString()})`
      );
      break;
  }
};

export const listProgramCommand = async (
  workerFile: string,
  programs: Program[],
  globalVariables: Variable[],
  commandOptions: CommandOptionsList,
  logger: Logger
) => {
  const workers = programs.map((program) => {
    const logFunc = createLogFunc(logger, "list_program", program.name);
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
    return new Promise<CommandWorkerResult<WorkerListProgramResults>>(
      (resolve, reject) => {
        logFunc.debug("Worker: create");
        const messages: string[] = [];
        let data: WorkerListProgramResults;
        new Worker(workerFile, {
          workerData: {
            options: commandOptions,
            program,
            variables,
          } satisfies WorkerDataListProgram,
        })
          .on("online", () => {
            logFunc.debug("Worker: online");
          })
          .on("message", (message: WorkerListProgramResults) => {
            logFunc.debug(`Worker: message: '${JSON.stringify(message)}'`);
            data = message;
          })
          .on("error", (err) => {
            logFunc.error(err);
            reject(err);
          })
          .on("exit", (exitCode) => {
            logFunc.debug(`Worker: exit (exitCode=${exitCode})`);
            if (!commandOptions.sorted && !commandOptions.json) {
              printListMessage(program, data);
            }
            resolve({ exitCode, messages, data, program });
          });
      }
    );
  });
  const workerResults = await Promise.all(workers);
  for (const workerResult of workerResults) {
    if (commandOptions.sorted && !commandOptions.json) {
      printListMessage(workerResult.program, workerResult.data);
    }
  }
  if (commandOptions.json) {
    const configJson: Config = {
      programs: workerResults
        .filter((a) => a.data.status === WorkerListProgramResultStatus.FOUND)
        .map((b) => b.program),
      variables: globalVariables.filter(
        (a) => defaultVariables.find((b) => b.name === a.name) === undefined
      ),
    };
    // eslint-disable-next-line no-console
    console.info(JSON.stringify(configJson, undefined, 4));
  }
};
