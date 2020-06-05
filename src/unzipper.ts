/* eslint-disable complexity */
import { createReadStream, createWriteStream, promises as fs } from "fs";
import os from "os";
import path from "path";
import unzipper from "unzipper";


interface ExtractFileInfo {
    id: string
    filePath: string[]
}

interface ExtractedFile {
    id: string
    buffer: Buffer
    filePath: string[]
}

export const extractFiles = async (buffer: Buffer, filePaths: ExtractFileInfo[]): Promise<ExtractedFile[]> => {
    const extractedFiles: ExtractedFile[] = [];
    const fileNameZip = path.join(os.tmpdir(), "temp_zip.zip");
    await fs.writeFile(fileNameZip, buffer);
    const zip = createReadStream(fileNameZip).pipe(unzipper.Parse({ forceStream: true }));
    for await (const entry of zip) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const fileName = entry.path;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const type = entry.type; // 'Directory' or 'File'

        let foundFile = false;
        let foundFilePath: string[] = [];
        let foundId = "";
        for (const filePath of filePaths) {
            const generatedFilePath = filePath.filePath.join("/");
            if (generatedFilePath === fileName) {
                foundFile = true;
                foundId = filePath.id;
                foundFilePath = filePath.filePath;
                break;
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
