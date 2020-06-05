declare module "node-7z";

/* eslint-disable complexity */
import { createReadStream, createWriteStream, promises as fs } from "fs";
import os from "os";
import path from "path";
import seven from "node-7z";
import unzipper from "unzipper";

export interface ExtractFileInfo {
    id: string
    isDirectory?: boolean
    filePath: string[]
}

export interface ExtractedFile {
    id: string
    buffer: Buffer
    filePath: string[]
}

export interface ExtractedFileOptions {
    filePaths?: ExtractFileInfo[]
    allFiles?: boolean
}

export const extractFilesBase = async (buffer: Buffer, options: ExtractedFileOptions): Promise<ExtractedFile[]> => {
    const extractedFiles: ExtractedFile[] = [];
    const fileNameZip = path.join(os.tmpdir(), "temp_zip.zip");
    await fs.writeFile(fileNameZip, buffer);
    const zip = createReadStream(fileNameZip).pipe(unzipper.Parse({ forceStream: true }));
    for await (const entry of zip) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const fileName: string = entry.path;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const type = entry.type; // 'Directory' or 'File'

        let foundFile = false;
        let foundFilePath: string[] = [];
        let foundId = "";
        if (options.allFiles) {
            foundFile = true;
            foundFilePath = fileName.split("/");
        } else {
            if (options.filePaths !== undefined) {
                for (const filePath of options.filePaths) {
                    const generatedFilePath = filePath.filePath.join("/");
                    if (generatedFilePath === fileName) {
                        foundFile = true;
                        foundId = filePath.id;
                        foundFilePath = filePath.filePath;
                        break;
                    }
                }
            }
        }
        if (!foundFile) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            await entry.autodrain();
            continue;
        }
        const tempFileName = path.join(os.tmpdir(), "temp_file_unzip");
        const tempFile = createWriteStream(tempFileName);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        entry.pipe(tempFile);
        await new Promise((resolve, reject) => {
            tempFile.on("finish", async () => {
                tempFile.close();
                try {
                    const fileBuffer = await fs.readFile(tempFileName);
                    await fs.unlink(tempFileName);
                    extractedFiles.push({
                        buffer: fileBuffer,
                        filePath: foundFilePath,
                        id: foundId
                    });
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
            tempFile.on("error", async err => {
                await fs.unlink(tempFileName);
                reject(err);
            });
        });
    }
    return extractedFiles;
};


export const extractAllFiles = async (buffer: Buffer, outputDirectory: string, moveDir?: string) => {
    const fileNameZip = path.join(os.tmpdir(), "temp_zip.zip");
    await fs.writeFile(fileNameZip, buffer);
    const files = unzipper.Extract({ path: outputDirectory });
    createReadStream(fileNameZip).pipe(files);
    await new Promise((resolve, reject) => {
        files.on("end", () => {
            resolve();
        });
    });
    if (moveDir) {
        // TODO
    }
};

export const extractAllFiles7z = async (buffer: Buffer, outputDirectory: string, moveDir?: string) => {
    const fileNameZip = path.join(os.tmpdir(), "temp_zip.zip");
    await fs.writeFile(fileNameZip, buffer);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const myStream = seven.extractFull(fileNameZip, outputDirectory);
    await new Promise((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        myStream.on("end", () => {
            resolve();
        });
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        myStream.on("error", (err: Error) => reject(err));
    });
    if (moveDir) {
        // TODO
    }
};


export const extractFiles = async (buffer: Buffer, filePaths: ExtractFileInfo[]): Promise<ExtractedFile[]> => {
    return await extractFilesBase(buffer, { filePaths });
};
