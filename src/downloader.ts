import { createWriteStream, promises as fs } from "fs";
import os from "os";
import path from "path";
import request from "request";

export const downloadFile = async (url: string): Promise<Buffer> => new Promise((resolve, reject) => {
    const fileName = path.join(os.tmpdir(), "temp_download");
    const file = createWriteStream(fileName);
    const downloadRequest = request.get(url);

    // Verify response code
    downloadRequest.on("response", (response) => {
        if (response.statusCode !== 200) {
            return reject(Error(`Response status code is not OK (${response.statusCode})`))
        }
        downloadRequest.pipe(file);
    });

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
    downloadRequest.on("error", async err => {
        await fs.unlink(fileName);
        reject(err);
    });
    file.on("error", async err => {
        await fs.unlink(fileName);
        reject(err);
    });
});
