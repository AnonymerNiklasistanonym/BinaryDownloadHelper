/* eslint-disable complexity */
import { createReadStream, createWriteStream, promises as fs } from "fs";
import type { Config, Program, Variable } from "../schemas/config.schema";
// import { exec } from "child_process";
import os from "os";
import path from "path";
import request from "request";
import unzipper from "unzipper";

interface ProgramConfig extends Program {
    dateOfDownload: string
    variables: Variable[]
}

const download = async (url: string): Promise<Buffer> => new Promise((resolve, reject) => {
    const dest = path.join(os.tmpdir(), "temp_download");
    const file = createWriteStream(dest);
    const sendReq = request.get(url);

    // verify response code
    sendReq.on("response", (response) => {
        if (response.statusCode !== 200) {
            return reject(Error(`Response status code is not OK (${response.statusCode})`))
        }
        sendReq.pipe(file);
    });
    file.on("finish", async () => {
        file.close();
        try {
            const fileBuffer = await fs.readFile(dest);
            await fs.unlink(dest);
            return resolve(fileBuffer);
        } catch (err) {
            return reject(err);
        }
    });
    sendReq.on("error", async err => {
        await fs.unlink(dest);
        return reject(err);
    });
    file.on("error", async err => {
        await fs.unlink(dest);
        return reject(err);
    });
});

const downloadFile = async (url: string): Promise<Buffer> => {
    const fileBuffer = await download(url);
    return fileBuffer;
};

interface ExtractFileInfo {
    id: string
    filePath: string[]
}


interface ExtractedFile {
    id: string
    buffer: Buffer
    filePath: string[]
}

const extractFilesFromZip = async (buffer: Buffer, filePaths: ExtractFileInfo[]): Promise<ExtractedFile[]> => {
    const extractedFiles: ExtractedFile[] = [];
    const zipFile = path.join(os.tmpdir(), "temp_zip.zip");
    await fs.writeFile(zipFile, buffer);
    const zip = createReadStream(zipFile).pipe(unzipper.Parse({ forceStream: true }));
    for await (const entry of zip) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const fileName = entry.path;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const type = entry.type; // 'Directory' or 'File'
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const size = entry.vars.uncompressedSize; // There is also compressedSize;

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

const replaceAll = (str: string, find: string, replace: string) => {
    return str.replace(new RegExp(find, "g"), replace);
};

const variableStringReplacer = (source: string, variables?: Variable[]) => {
    let finalString = source;
    const usedVariables = [];
    if (variables) {
        for (const variable of variables) {
            const newString = replaceAll(finalString, `\\\$\\\{${variable.name}\\\}`, variable.value);
            if (newString !== finalString) {
                usedVariables.push(variable);
            }
            finalString = newString;
        }
    }
    return {
        newString: finalString,
        usedVariables
    };
};

const fileExists = async (path: string) => !!(await fs.stat(path).catch(() => false));

(async (): Promise<void> => {
    try {
        // Read config data
        const configFileContent = await fs.readFile(path.join(__dirname, "..", "..", "config.json"));
        const configData = JSON.parse(configFileContent.toString()) as Config;
        for (const program of configData.programs) {
            // Get program info strings
            const versionString = program.version ? ` [${program.version}]` : "";
            const infoString = `${program.name}${versionString}`;
            // Get new strings based on variable macros
            const usedVariables: Variable[] = [];
            const outputDirectoryReplaced = variableStringReplacer(program.outputDirectory, configData.variables);
            const outputDirectory = outputDirectoryReplaced.newString;
            usedVariables.push(... outputDirectoryReplaced.usedVariables);
            const renameToReplaced = variableStringReplacer(program.renameTo
                ? program.renameTo : "", configData.variables);
            const renameTo = renameToReplaced.newString;
            usedVariables.push(... renameToReplaced.usedVariables);
            // Get program/config paths
            const directProgramPath = program.downloadInformation.url.includes("?")
                ? program.downloadInformation.url.substr(
                    program.downloadInformation.url.lastIndexOf("/"),
                    program.downloadInformation.url.indexOf("?") - program.downloadInformation.url.lastIndexOf("/")
                )
                : program.downloadInformation.url.substring(program.downloadInformation.url.lastIndexOf("/") + 1);
            let programOutputFilePath = path.join(outputDirectory, directProgramPath);
            if (program.downloadInformation.id === "DOWNLOAD_PROGRAM_IN_ZIP") {
                const zipProgramPath = program.downloadInformation.zipLocation[
                    program.downloadInformation.zipLocation.length - 1
                ];
                programOutputFilePath = path.join(outputDirectory, zipProgramPath);
            }
            if (program.renameTo) {
                programOutputFilePath = path.join(outputDirectory, renameTo);
            }
            const programConfigFilePath = path.join(
                path.dirname(programOutputFilePath),
                `.program_info_${path.basename(programOutputFilePath)}.json`
            );

            // Check if the program already exists and no new information exists
            let skipProgram = false;
            if (await fileExists(programConfigFilePath)) {
                const existingConfigFileContent = await fs.readFile(programConfigFilePath);
                const existingConfigData = JSON.parse(existingConfigFileContent.toString()) as ProgramConfig;
                let differenceDetected = false;
                if (program.name !== existingConfigData.name) {
                    differenceDetected = true;
                    console.info(`Program name differs (${program.name} - ${existingConfigData.name})`);
                }
                if (program.version !== existingConfigData.version) {
                    differenceDetected = true;
                    console.info(`Program version differs (${program.version} - ${existingConfigData.version})`);
                }
                if (program.renameTo !== existingConfigData.renameTo) {
                    differenceDetected = true;
                    console.info(`Program rename to differs (${program.renameTo} - ${existingConfigData.renameTo})`);
                }
                if (program.downloadInformation.url !== existingConfigData.downloadInformation.url) {
                    differenceDetected = true;
                    console.info(`Program downloadInformation url differs (${program.downloadInformation.url} - `
                    + `${existingConfigData.downloadInformation.url})`);
                }
                if (program.downloadInformation.id !== existingConfigData.downloadInformation.id) {
                    differenceDetected = true;
                    console.info(`Program downloadInformation id differs (${program.downloadInformation.id} - `
                    + `${existingConfigData.downloadInformation.id})`);
                } else {
                    if (program.downloadInformation.id === "DOWNLOAD_PROGRAM_IN_ZIP" &&
                    existingConfigData.downloadInformation.id === "DOWNLOAD_PROGRAM_IN_ZIP" &&
                    program.downloadInformation.zipLocation.join("") !==
                    existingConfigData.downloadInformation.zipLocation.join("")) {
                        differenceDetected = true;
                        console.info(`Program downloadInformation zipLocation differs (`
                        + `${program.downloadInformation.zipLocation} - `
                        + `${existingConfigData.downloadInformation.zipLocation})`);
                    }
                }
                if (!await fileExists(programOutputFilePath)) {
                    differenceDetected = true;
                    console.info(`Program output path was not found (${programOutputFilePath})`);
                }
                if (!differenceDetected) {
                    skipProgram = true;
                }
            }
            if (skipProgram) {
                console.info(`${infoString} was skipped: no difference detected`);
                continue;
            }

            const buffer = await downloadFile(program.downloadInformation.url);
            await fs.mkdir(outputDirectory, { recursive: true });
            if (program.downloadInformation.id === "DOWNLOAD_PROGRAM_IN_ZIP") {
                const extractedFiles = await extractFilesFromZip(buffer, [
                    {
                        filePath: program.downloadInformation.zipLocation,
                        id: "program"
                    }
                ]);
                if (extractedFiles.length !== 1) {
                    throw Error(`More/Less than one (${extractedFiles.length}) file was extracted from zip file`);
                }
                await fs.writeFile(programOutputFilePath, extractedFiles[0].buffer);
            } else if (program.downloadInformation.id === "DOWNLOAD_PROGRAM_DIRECTLY") {
                await fs.writeFile(programOutputFilePath, buffer);
            } else {
                throw Error(`Download method is not supported: ${JSON.stringify(program.downloadInformation)}`);
            }
            console.info(`${infoString} was added: '${programOutputFilePath}'`);

            const uniqueVariables: string[] = [];
            const localProgramConfig: ProgramConfig = {
                ... program,
                dateOfDownload: new Date().toISOString(),
                variables: [
                    ... outputDirectoryReplaced.usedVariables,
                    ... renameToReplaced.usedVariables
                ].filter(variable => {
                    if (!uniqueVariables.includes(variable.name)) {
                        uniqueVariables.push(variable.name);
                        return true;
                    }
                    return false;
                })
            };
            await fs.writeFile(programConfigFilePath, JSON.stringify(localProgramConfig, null, 4));
        }
    } catch (error) {
        throw error;
    }
})().catch(error => {
    console.error(error);
    process.exit(1);
});
