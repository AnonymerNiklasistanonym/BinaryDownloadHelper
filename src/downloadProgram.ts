// Type imports
import type { Logger } from "winston";
import type { Program } from "./config";
// Package imports
import { promises as fs } from "fs";
import path from "path";
// Local imports
import { downloadFile } from "./other/downloadFile";
import { extractFilesFromZipArchiveBuffer } from "./unzipper";
import { isDirectory } from "./other/asyncFileOperations";
import { ProgramInformation } from "./commands/resolveProgramInformation";

/**
 * Download a program.
 *
 * @param program The program that should be downloaded.
 * @param programInformation The processed program information.
 * @param updateVarStr Function to update a string containing variables.
 * @param logger Logger
 * @returns list of downloaded/extracted files
 */
export const downloadProgram = async (
  program: Program,
  programInformation: ProgramInformation,
  logger: Logger
): Promise<string[]> => {
  // Download the file
  const downloadFileInfo = await downloadFile(
    programInformation.downloadInformation.url
  );
  // If the program is a directory clean the existing one
  if (
    program.isDirectory &&
    (await isDirectory(programInformation.programOutputFilePath))
  ) {
    logger.debug(
      `Remove programOutDir='${programInformation.programOutputFilePath}'`
    );
    await fs.rm(programInformation.programOutputFilePath, { recursive: true });
  }
  logger.debug(
    `Create programOutDir='${programInformation.programOutputFilePath}'`
  );
  await fs.mkdir(programInformation.programOutputDir, { recursive: true });
  const outputPath = programInformation.programOutputFilePath;
  if (programInformation.downloadInformation.id === "DOWNLOAD_PROGRAM_IN_ZIP") {
    // If the program download is a zip directory
    let moveDir;
    let moveFile;
    const extractedFilePaths: string[] = [];
    if (program.isDirectory) {
      if (
        programInformation.downloadInformation.zipLocation !== undefined &&
        programInformation.downloadInformation.zipLocation.length > 0
      ) {
        moveDir = path.join(
          ...programInformation.downloadInformation.zipLocation
        );
      }
    } else {
      if (
        programInformation.downloadInformation.zipLocation !== undefined &&
        programInformation.downloadInformation.zipLocation.length > 0
      ) {
        moveFile = path.join(
          ...programInformation.downloadInformation.zipLocation
        );
      }
    }
    logger.debug(
      `Extract from zip archive buffer to outputPath='${outputPath}' (moveDir='${moveDir}', moveFile='${moveFile}')`
    );
    await extractFilesFromZipArchiveBuffer(
      downloadFileInfo.buffer,
      outputPath,
      { moveDir, moveFile }
    );
    return extractedFilePaths;
  } else if (program.downloadInformation.id === "DOWNLOAD_PROGRAM_DIRECTLY") {
    logger.debug(`Write from file buffer to outputPath='${outputPath}'`);
    await fs.writeFile(outputPath, downloadFileInfo.buffer);
    return [outputPath];
  } else {
    throw Error(
      `Download method is not supported: ${JSON.stringify(
        program.downloadInformation
      )}`
    );
  }
};
