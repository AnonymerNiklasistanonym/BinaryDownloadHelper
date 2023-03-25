// Type imports
import type {
  DownloadProgram,
  DownloadProgramInZip,
  Program,
  Variable,
} from "../config";
// Package imports
import path from "path";
// Local imports
import { makeArrayUnique } from "../other/arrayOperations";
import { name } from "../../package.json";
import { replaceVariables } from "../macros";

export interface ProgramInformation {
  downloadInformation: DownloadProgram | DownloadProgramInZip;
  programOutputFilePath: string;
  programOutputDir: string;
  programConfigFilePath: string;
  outputDirectoryVariable: Variable;
  usedVariables: Variable[];
}

export const resolveProgramInformation = (
  program: Program,
  variables: Variable[]
): ProgramInformation => {
  const outputDirectoryProcessed = replaceVariables(
    program.outputDirectory,
    variables
  );
  const programOutputDir = outputDirectoryProcessed.processedString;
  const renameToProcessed = replaceVariables(
    program.renameTo ? program.renameTo : "",
    variables
  );
  const renameTo = renameToProcessed.processedString;
  const downloadUrlProcessed = replaceVariables(
    program.downloadInformation.url,
    variables
  );
  const downloadUrl = downloadUrlProcessed.processedString;
  const zipLocationsUsedVariables: Variable[] = [];
  // Program(config) paths
  const urlFileName = downloadUrl.includes("?")
    ? downloadUrl.substring(
        downloadUrl.lastIndexOf("/"),
        downloadUrl.indexOf("?") - downloadUrl.lastIndexOf("/")
      )
    : downloadUrl.substring(downloadUrl.lastIndexOf("/") + 1);
  const downloadInformation = { ...program.downloadInformation };
  downloadInformation.url = downloadUrl;
  let programOutputFilePath = programOutputDir;
  if (downloadInformation.id === "DOWNLOAD_PROGRAM_IN_ZIP") {
    downloadInformation.zipLocation = downloadInformation?.zipLocation?.map(
      (a) => {
        const newVal = replaceVariables(a, variables);
        zipLocationsUsedVariables.push(...newVal.usedVariables);
        return newVal.processedString;
      }
    );
    if (program.isDirectory) {
      if (program.renameTo) {
        throw Error("Directories cannot be renamed!");
      }
    } else {
      if (
        downloadInformation.zipLocation === undefined ||
        downloadInformation.zipLocation.length === 0
      ) {
        throw Error("Can't extract file with no name from ZIP file!");
      } else {
        programOutputFilePath = path.join(
          programOutputDir,
          downloadInformation.zipLocation.slice(-1)[0]
        );
      }
      if (program.renameTo) {
        programOutputFilePath = path.join(programOutputDir, renameTo);
      }
    }
  } else if (program.downloadInformation.id === "DOWNLOAD_PROGRAM_DIRECTLY") {
    programOutputFilePath = path.join(programOutputDir, urlFileName);
    if (program.renameTo) {
      programOutputFilePath = path.join(programOutputDir, renameTo);
    }
  }
  const outputDirectoryVariable: Variable<"OUTPUT_DIRECTORY"> = {
    name: "OUTPUT_DIRECTORY",
    value: programOutputDir,
  };
  const programConfigFilePath = path.join(
    programOutputDir,
    `.${program.name}.${name}_program_config`
  );
  const usedVariables: Variable[] = makeArrayUnique<Variable>(
    [
      ...outputDirectoryProcessed.usedVariables,
      ...renameToProcessed.usedVariables,
      ...downloadUrlProcessed.usedVariables,
      ...zipLocationsUsedVariables,
    ],
    (element) => element.name
  );
  return {
    downloadInformation,
    outputDirectoryVariable,
    programConfigFilePath,
    programOutputFilePath,
    programOutputDir,
    usedVariables,
  };
};
