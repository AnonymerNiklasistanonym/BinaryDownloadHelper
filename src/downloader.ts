import { createWriteStream, promises as fs } from "fs";
import got from "got";
import os from "os";
import path from "path";

export const downloadFile = async (url: string): Promise<Buffer> => new Promise((resolve, reject) => {
    const fileName = path.join(os.tmpdir(), "temp_download");
    const file = createWriteStream(fileName);
    got.stream(url).pipe(file);

    // Check if file download is finished
    file.on("finish", async () => {
        file.close();
        try {
            const fileBuffer = await fs.readFile(fileName);
            await fs.unlink(fileName);
            resolve(fileBuffer);
        } catch (err) {
            reject(err);
        }
    });

    // Error checking
    file.on("error", async err => {
        await fs.unlink(fileName);
        reject(err);
    });
});
