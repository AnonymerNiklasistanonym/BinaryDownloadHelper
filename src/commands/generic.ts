#!/usr/bin/env node

// Type imports
import type { CommandOptionsGlobal, CommandOptionsList } from "../cli";
import type { EnvironmentVariable, Program, Variable } from "../config";
// Package imports
import os from "os";
import path from "path";
// Local imports
import { createLogger, LoggerLevel } from "../logging";
import { installProgramCommand } from "../commands/installProgram";
import { listProgramCommand } from "./listProgram";
import { name } from "../../package.json";
import { readConfigFile } from "../commands/readConfig";
import { removeProgramCommand } from "./removeProgram";
import { searchProgramCommand } from "./searchProgram";

export interface CommandWorkerResult<COMMAND_DATA extends object> {
  exitCode: number;
  messages: string[];
  data: COMMAND_DATA;
  program: Program;
}

export interface CommandWorkerError {
  workerError: "workerError";
  message: string;
  name: string;
  stack?: string;
}

export enum CommandId {
  INSTALL = "INSTALL",
  UPDATE = "UPDATE",
  REMOVE = "REMOVE",
  LIST = "LIST",
  SEARCH = "SEARCH",
}

export const defaultVariables: Variable[] = [
  {
    name: "HOME",
    value: os.homedir(),
  },
  {
    name: "USER",
    value: os.userInfo().username,
  },
];

export const generateProgramInfoString = (
  program: Program,
  detailed = false
): string => {
  let programInfo;
  if (program.displayName) {
    programInfo = `${program.displayName} (${program.name})`;
  } else {
    programInfo = `${program.name}`;
  }
  programInfo += ` [${program.version}]`;
  if (detailed) {
    programInfo += `: ${program.description}`;
  }
  return programInfo;
};

export const printChangeOfEnvironmentVariables = (
  environmentVariables?: EnvironmentVariable[],
  add = true
) => {
  if (environmentVariables === undefined || environmentVariables.length === 0) {
    return;
  }
  // eslint-disable-next-line no-console
  console.info(
    `> ${add ? "Add/Append" : "Remove"} the following environment variables:`
  );
  for (const environmentVariable of environmentVariables) {
    // eslint-disable-next-line no-console
    console.info(
      `  - '${environmentVariable.name}'${
        environmentVariable.append ? `${add ? "+" : "-"}=` : "="
      }'${environmentVariable.value}'`
    );
  }
};

export const genericCommandRunner = async <
  OPTIONS extends CommandOptionsGlobal
>(
  commandId: CommandId,
  commandPrograms: string[],
  commandOptions: OPTIONS
) => {
  const config = await readConfigFile(commandOptions.config);
  const logger = createLogger(
    name,
    path.join(os.tmpdir(), `${name}_logs`),
    commandOptions.verbose ? LoggerLevel.DEBUG : LoggerLevel.INFO,
    LoggerLevel.DEBUG
  );
  const programs: Program[] = [];
  if (commandPrograms.length === 0) {
    // Run command for all programs
    logger.debug("Select all programs...");
    programs.push(...config.programs);
  } else {
    // Run command only for specified programs
    logger.debug(
      `Look for specified programs... (${commandPrograms.join(",")})`
    );
    programs.push(
      ...commandPrograms.map((program) => {
        const foundProgram = config.programs.find(
          (a) => a.name.toLowerCase() === program.toLowerCase().trim()
        );
        if (foundProgram === undefined) {
          throw Error(
            `The program '${program}' was not found in '${commandOptions.config}'!`
          );
        }
        logger.debug(`Found program '${program}'`);
        return foundProgram;
      })
    );
  }
  logger.debug(
    `${commandId} the programs ${programs.map((a) => a.name).join(",")}`
  );
  const variables =
    config.variables !== undefined
      ? defaultVariables.concat(config.variables)
      : defaultVariables;
  const workerFileDir = path.join(__dirname, "worker");
  switch (commandId) {
    case CommandId.INSTALL:
      return await installProgramCommand(
        path.join(workerFileDir, "installProgram.js"),
        programs,
        variables,
        commandOptions,
        logger
      );
    case CommandId.REMOVE:
      return await removeProgramCommand(
        path.join(workerFileDir, "removeProgram.js"),
        programs,
        variables,
        commandOptions,
        logger
      );
    case CommandId.UPDATE:
      break;
    case CommandId.LIST:
      return await listProgramCommand(
        path.join(workerFileDir, "listProgram.js"),
        programs,
        variables,
        commandOptions as unknown as CommandOptionsList,
        logger
      );
    case CommandId.SEARCH:
      return await searchProgramCommand(
        programs,
        variables,
        commandOptions,
        logger
      );
  }
  throw Error("TODO");
};
