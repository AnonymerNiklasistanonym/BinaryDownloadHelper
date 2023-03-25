// Type imports
import type { Program, Variable } from "../config";
import type { CommandOptionsSearch } from "../cli";
import type { Logger } from "winston";
// Local imports
import { generateProgramInfoString } from "./generic";

export const searchProgramCommand = async (
  programs: Program[],
  _variables: Variable[],
  _commandOptions: CommandOptionsSearch,
  _logger: Logger
) => {
  for (const program of programs) {
    // eslint-disable-next-line no-console
    console.info(generateProgramInfoString(program, true));
  }
};
