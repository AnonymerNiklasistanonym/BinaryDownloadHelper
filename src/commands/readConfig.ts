// Type imports
import type { Config, ProgramConfig } from "../config";
import type { TypeErrors } from "../other/verifyType";
// Package imports
import path from "path";
// Local imports
import { promises as fs } from "fs";
import { isType } from "../other/verifyType";

const jsonSchemaDirPath = path.join(__dirname, "..", "..", "..", "schemas");

const jsonSchemaConfigPath = path.join(jsonSchemaDirPath, "config.schema.json");

const jsonSchemaProgramConfigPath = path.join(
  jsonSchemaDirPath,
  "programConfig.schema.json"
);

/**
 * Read config file and validate it
 *
 * @param configFilePath The file path to the config file
 * @returns A valid config file object
 */
export const readConfigFile = async (
  configFilePath: string
): Promise<Config> => {
  const configBuffer = await fs.readFile(configFilePath);
  const jsonSchemaBuffer = await fs.readFile(jsonSchemaConfigPath);
  const config = JSON.parse(configBuffer.toString()) as unknown;
  const errors: TypeErrors = {};
  const isConfig = isType<Config>(config, jsonSchemaBuffer.toString(), errors);
  if (isConfig) {
    return config;
  }
  throw Error(`Not a valid config file! (${JSON.stringify(errors.errors)})`);
};

/**
 * Read program config file and validate it
 *
 * @param configFilePath The file path to the config file
 * @returns A valid config file object
 */
export const readProgramConfigFile = async (
  configFilePath: string
): Promise<ProgramConfig> => {
  const programConfigBuffer = await fs.readFile(configFilePath);
  const jsonSchemaBuffer = await fs.readFile(jsonSchemaProgramConfigPath);
  const programConfig = JSON.parse(programConfigBuffer.toString()) as unknown;
  const errors: TypeErrors = {};
  const isProgramConfig = isType<ProgramConfig>(
    programConfig,
    jsonSchemaBuffer.toString(),
    errors
  );
  if (isProgramConfig) {
    return programConfig;
  }
  throw Error(
    `Not a valid program config file! (${JSON.stringify(errors.errors)})`
  );
};
