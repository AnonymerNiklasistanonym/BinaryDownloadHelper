// Type imports
import type { EnvironmentVariable, Program, Variable } from "./config";
// Local imports
import { makeArrayUnique } from "./other/arrayOperations";

/**
 * A local programming configuration of installed programs.
 * This makes it able to remove and upgrade by storing program specific information.
 */
export interface ProgramConfig
  extends Pick<Program, "name" | "environmentVariables" | "version"> {
  timeOfDownload: string;
  variables: Variable[];
}

interface EnvVariablesToAdd {
  name: string;
  system?: boolean;
  append?: boolean;
  value: string | string[];
}

export const mergeEnvironmentVariables = (
  envVariables: EnvironmentVariable[]
): EnvVariablesToAdd[] => {
  const finalVariables: EnvVariablesToAdd[] = [];
  for (const envVariable of envVariables) {
    let found = false;
    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let index = 0; index < finalVariables.length; index++) {
      if (finalVariables[index].name === envVariable.name) {
        const appendSituationSame =
          finalVariables[index].append === envVariable.append;
        const systemSituationSame =
          finalVariables[index].system === envVariable.system;
        // Can be merged
        if (envVariable.append && appendSituationSame && systemSituationSame) {
          finalVariables[index].value = makeArrayUnique(
            [envVariable.value].concat(finalVariables[index].value),
            (a) => a
          );
          found = true;
          break;
        }
      }
    }
    if (!found) {
      finalVariables.push(envVariable);
    }
  }
  return finalVariables;
};
