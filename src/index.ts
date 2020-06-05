import type { Config, Program, Variable } from "../schemas/config.schema";
import { fileExists, makeArrayUnique } from "./extras";
import { downloadFile } from "./downloader";
import { extractFiles } from "./unzipper";
import { promises as fs } from "fs";
import path from "path";
import { replaceVariables } from "./macros";

interface ProgramConfig extends Program {
    timeOfDownload: string
    variables: Variable[]
}

const detectDifferenceBetweenProgramConfigs = (
    foundConfig: ProgramConfig, latestConfig: Program, variables?: Variable[]
): boolean => {
    let differenceDetected = false;
    if (foundConfig.name !== latestConfig.name) {
        differenceDetected = true;
        // eslint-disable-next-line no-console
        console.info(`> Program name differs (${foundConfig.name} - ${latestConfig.name})`);
    }
    if (foundConfig.version !== foundConfig.version) {
        differenceDetected = true;
        // eslint-disable-next-line no-console
        console.info(`> Program version differs (${foundConfig.version} - ${latestConfig.version})`);
    }
    if (foundConfig.renameTo !== foundConfig.renameTo) {
        differenceDetected = true;
        // eslint-disable-next-line no-console
        console.info(`> Program rename to differs (${foundConfig.renameTo} - ${latestConfig.renameTo})`);
    }
    if (foundConfig.downloadInformation.url !== foundConfig.downloadInformation.url) {
        differenceDetected = true;
        // eslint-disable-next-line no-console
        console.info(`> Program download information url differs (${foundConfig.downloadInformation.url} - `
        + `${latestConfig.downloadInformation.url})`);
    }
    if (foundConfig.downloadInformation.id !== latestConfig.downloadInformation.id) {
        differenceDetected = true;
        // eslint-disable-next-line no-console
        console.info(`> Program download information id differs (${foundConfig.downloadInformation.id} - `
        + `${latestConfig.downloadInformation.id})`);
    } else {
        if (
            foundConfig.downloadInformation.id === "DOWNLOAD_PROGRAM_IN_ZIP" &&
            latestConfig.downloadInformation.id === "DOWNLOAD_PROGRAM_IN_ZIP" &&
            foundConfig.downloadInformation.zipLocation.join("") !==
            latestConfig.downloadInformation.zipLocation.join("")
        ) {
            differenceDetected = true;
            // eslint-disable-next-line no-console
            console.info("Program download information zip location differs ("
            + `[${foundConfig.downloadInformation.zipLocation.join(", ")}] - `
            + `[${latestConfig.downloadInformation.zipLocation.join(", ")}])`);
        }
    }
    return differenceDetected;
};

const downloadProgram = async (program: Program, outputDirectory: string, programOutputFilePath: string) => {
    const buffer = await downloadFile(program.downloadInformation.url);
    await fs.mkdir(outputDirectory, { recursive: true });
    if (program.downloadInformation.id === "DOWNLOAD_PROGRAM_IN_ZIP") {
        const extractedFiles = await extractFiles(buffer, [
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
};

// eslint-disable-next-line complexity
(async (): Promise<void> => {
    try {
        // Read config data
        const configFileContent = await fs.readFile(path.join(__dirname, "..", "..", "config.json"));
        const configData = JSON.parse(configFileContent.toString()) as Config;

        // Do the following for each program in the configuration
        let progressCounter = 0;
        for (const program of configData.programs) {
            const progressString = `(${++progressCounter}/${configData.programs.length})`;
            // Program info strings
            const versionString = program.version ? ` [${program.version}]` : "";
            const infoString = `${program.name}${versionString}`;
            // Process strings with given variable macros
            const outputDirectoryProcessed = replaceVariables(program.outputDirectory, configData.variables);
            const outputDirectory = outputDirectoryProcessed.processedString;
            const renameToProcessed = replaceVariables(program.renameTo ? program.renameTo : "", configData.variables);
            const renameTo = renameToProcessed.processedString;
            const usedVariables: Variable[] = makeArrayUnique([
                ... outputDirectoryProcessed.usedVariables,
                ... renameToProcessed.usedVariables
            ], element => element.name);
            // Program(config) paths
            const urlFileName = program.downloadInformation.url.includes("?")
                ? program.downloadInformation.url.substr(
                    program.downloadInformation.url.lastIndexOf("/"),
                    program.downloadInformation.url.indexOf("?") - program.downloadInformation.url.lastIndexOf("/")
                )
                : program.downloadInformation.url.substring(program.downloadInformation.url.lastIndexOf("/") + 1);
            let programOutputFilePath = path.join(outputDirectory, urlFileName);
            if (program.renameTo) {
                programOutputFilePath = path.join(outputDirectory, renameTo);
            } else if (program.downloadInformation.id === "DOWNLOAD_PROGRAM_IN_ZIP") {
                const zipProgramPath = program.downloadInformation.zipLocation[
                    program.downloadInformation.zipLocation.length - 1
                ];
                programOutputFilePath = path.join(outputDirectory, zipProgramPath);
            }
            const programConfigFilePath = path.join(
                path.dirname(programOutputFilePath),
                `.program_info_${path.basename(programOutputFilePath)}.json`
            );

            // Check if the program download can be skipped
            let skipProgram = false;
            if (await fileExists(programConfigFilePath)) {
                const existingConfigFileContent = await fs.readFile(programConfigFilePath);
                const existingConfigData = JSON.parse(existingConfigFileContent.toString()) as ProgramConfig;
                if (!detectDifferenceBetweenProgramConfigs(existingConfigData, program, configData.variables)) {
                    skipProgram = true;
                }
            }
            if (!await fileExists(programOutputFilePath)) {
                skipProgram = false;
                // eslint-disable-next-line no-console
                console.info(`Program output path file was not found (${programOutputFilePath})`);
            }
            if (skipProgram) {
                // eslint-disable-next-line no-console
                console.info(`${progressString} ${infoString} was skipped: No difference detected`);
                continue;
            }

            // Download Program
            await downloadProgram(program, outputDirectory, programOutputFilePath);
            // eslint-disable-next-line no-console
            console.info(`${progressString} ${infoString} was added: '${programOutputFilePath}'`);

            // Save program config information next to executable (directory)
            const localProgramConfig: ProgramConfig = {
                ... program,
                timeOfDownload: new Date().toISOString(),
                variables: usedVariables
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
