import { promises as fs } from "fs";
import path from "path";

export const fileExists = async (filePath: string): Promise<boolean> =>
  !!(await fs.stat(filePath).catch(() => false));

export const isDirectory = async (filePath: string): Promise<boolean> => {
  if (!(await fileExists(filePath))) {
    return false;
  }
  const stat = await fs.lstat(filePath);
  return stat.isDirectory();
};

export const getFiles = async (filePath: string): Promise<string[]> => {
  if (await isDirectory(filePath)) {
    let filesInDir = await fs.readdir(filePath);
    filesInDir = filesInDir.map((name) => path.join(filePath, name));
    const files: string[] = [];
    for (const file of filesInDir) {
      if (await isDirectory(file)) {
        files.push(...(await getFiles(file)));
      } else {
        files.push(file);
      }
    }
    return files;
  } else {
    return [filePath];
  }
};
