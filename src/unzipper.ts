// Package imports
import { promises as fs } from "fs";
import { move } from "fs-extra";
import os from "os";
import path from "path";
// Local imports
import { name } from "../package.json";

export interface ExtractFilesFromZipArchiveBufferOptions {
  /** A extracted sub directory which should be used as output directory. */
  moveDir?: string;
  /** A extracted file which should be put into the output directory. */
  moveFile?: string;
}

/**
 * Extract files from zip archive buffer.
 *
 * @param buffer The zip archive.
 * @param outputPath The directory to which the files should be extracted.
 * @param options Further options.
 */
export const extractFilesFromZipArchiveBuffer = async (
  buffer: Buffer,
  outputPath: string,
  options: ExtractFilesFromZipArchiveBufferOptions = {}
): Promise<void> => {
  const unzipper = await import("unzipper");
  const zipArchive = await unzipper.Open.buffer(buffer);
  const tempExtractDir = path.join(
    os.tmpdir(),
    `${name}_extract_${performance.now()}`
  );
  await zipArchive.extract({ path: tempExtractDir });
  if (options.moveDir) {
    await move(path.join(tempExtractDir, options.moveDir), outputPath, {
      overwrite: true,
    });
  } else if (options.moveFile) {
    await fs.rename(path.join(tempExtractDir, options.moveFile), outputPath);
  } else {
    await move(tempExtractDir, outputPath, { overwrite: true });
  }
  await fs.rm(tempExtractDir, { recursive: true, force: true });
};
