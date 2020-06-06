import type { Config, Program, Variable, EnvironmentVariable } from "../schemas/config.schema";
import { extractAllFiles, extractAllFiles7z, extractFiles } from "./unzipper";
import { fileExists, makeArrayUnique } from "./extras";
import { downloadFile } from "./downloader";
import { fail } from "assert";
import { promises as fs } from "fs";
import path from "path";
import { replaceVariables } from "./macros";

interface ProgramConfig extends Program {
    timeOfDownload: string
    variables: Variable[]
}

const undefStr = (input?: string|boolean) => input === undefined ? "undefined" : String(input);

interface DifferenceInfo {
    programDifference: boolean
    configDifference: boolean
    environmentVarDifference: boolean
}

// eslint-disable-next-line complexity
const detectDifferenceBetweenProgramConfigs = (
    foundConfig: ProgramConfig, latestConfig: Program, variables?: Variable[]
): DifferenceInfo => {
    const differenceInfo: DifferenceInfo = {
        configDifference: false,
        environmentVarDifference: false,
        programDifference: false
    };

    if (JSON.stringify(foundConfig.environmentVariables) !== JSON.stringify(latestConfig.environmentVariables)) {
        differenceInfo.configDifference = true;
        differenceInfo.environmentVarDifference = true;
        // TODO: Variables
        // eslint-disable-next-line no-console
        console.info(`> Program environment variables differ (${JSON.stringify(foundConfig.environmentVariables)} - `
            + `${JSON.stringify(latestConfig.environmentVariables)})`);
    }
    if (foundConfig.description !== latestConfig.description) {
        differenceInfo.configDifference = true;
        // eslint-disable-next-line no-console
        console.info(`> Program description differs (${undefStr(foundConfig.description)} - `
            + `${undefStr(latestConfig.description)})`);
    }
    if (foundConfig.name !== latestConfig.name) {
        differenceInfo.configDifference = true;
        // eslint-disable-next-line no-console
        console.info(`> Program name differs (${foundConfig.name} - ${latestConfig.name})`);
    }
    if (foundConfig.website !== latestConfig.website) {
        differenceInfo.configDifference = true;
        // eslint-disable-next-line no-console
        console.info(`> Program website differs (${undefStr(foundConfig.website)} - `
            + `${undefStr(latestConfig.website)})`);
    }

    if (foundConfig.version !== latestConfig.version) {
        differenceInfo.configDifference = true;
        differenceInfo.programDifference = true;
        // eslint-disable-next-line no-console
        console.info(`> Program name differs (${undefStr(foundConfig.version)} - ${undefStr(latestConfig.version)})`);
    }
    if (foundConfig.archived !== latestConfig.archived) {
        differenceInfo.configDifference = true;
        differenceInfo.programDifference = true;
        // eslint-disable-next-line no-console
        console.info(`> Program archived state differs (${undefStr(foundConfig.archived)} - `
            + `${undefStr(latestConfig.archived)})`);
    }
    if (foundConfig.renameTo !== foundConfig.renameTo) {
        differenceInfo.configDifference = true;
        differenceInfo.programDifference = true;
        // TODO: Variables
        // eslint-disable-next-line no-console
        console.info(`> Program rename to differs (${undefStr(foundConfig.renameTo)} - `
            + `${undefStr(latestConfig.renameTo)})`);
    }
    if (foundConfig.isDirectory !== foundConfig.isDirectory) {
        differenceInfo.configDifference = true;
        differenceInfo.programDifference = true;
        // eslint-disable-next-line no-console
        console.info(`> Program directory state differs (${undefStr(foundConfig.isDirectory)} - `
            + `${undefStr(latestConfig.isDirectory)})`);
    }
    if (foundConfig.outputDirectory !== latestConfig.outputDirectory) {
        differenceInfo.configDifference = true;
        differenceInfo.programDifference = true;
        // TODO: Variables
        // eslint-disable-next-line no-console
        console.info(`> Program name differs (${foundConfig.outputDirectory} - ${latestConfig.outputDirectory})`);
    }

    if (foundConfig.downloadInformation.url !== foundConfig.downloadInformation.url) {
        differenceInfo.configDifference = true;
        differenceInfo.programDifference = true;
        // eslint-disable-next-line no-console
        console.info(`> Program download information url differs (${foundConfig.downloadInformation.url} - `
        + `${latestConfig.downloadInformation.url})`);
    }
    if (foundConfig.downloadInformation.id !== latestConfig.downloadInformation.id) {
        differenceInfo.configDifference = true;
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
            differenceInfo.configDifference = true;
            differenceInfo.programDifference = true;
            // eslint-disable-next-line no-console
            console.info("Program download information zip location differs ("
            + `[${foundConfig.downloadInformation.zipLocation.join(", ")}] - `
            + `[${latestConfig.downloadInformation.zipLocation.join(", ")}])`);
        }
        if (
            foundConfig.downloadInformation.id === "DOWNLOAD_PROGRAM_IN_ZIP" &&
            latestConfig.downloadInformation.id === "DOWNLOAD_PROGRAM_IN_ZIP" &&
            foundConfig.downloadInformation["7zip"] !== latestConfig.downloadInformation["7zip"]
        ) {
            differenceInfo.configDifference = true;
            differenceInfo.programDifference = true;
            // eslint-disable-next-line no-console
            console.info("Program download information 7zip option differs ("
            + `${undefStr(foundConfig.downloadInformation["7zip"])} - `
            + `${undefStr(latestConfig.downloadInformation["7zip"])})`);
        }
        if (
            foundConfig.downloadInformation.id === "DOWNLOAD_PROGRAM_IN_ZIP" &&
            latestConfig.downloadInformation.id === "DOWNLOAD_PROGRAM_IN_ZIP" &&
            JSON.stringify(foundConfig.downloadInformation.urlHistory) !==
            JSON.stringify(latestConfig.downloadInformation.urlHistory)
        ) {
            differenceInfo.configDifference = true;
            // eslint-disable-next-line no-console
            console.info("Program download information url history differs ("
            + `${JSON.stringify(foundConfig.downloadInformation.urlHistory)} - `
            + `${JSON.stringify(latestConfig.downloadInformation.urlHistory)})`);
        }
    }

    for (const variable of foundConfig.variables) {
        if (variables?.find(a => a.name === variable.name)?.value !== variable.value) {
            differenceInfo.configDifference = true;
            // For now also re download in case the variable is connected to rename to or output directory / etc.
            differenceInfo.programDifference = true;
            // eslint-disable-next-line no-console
            console.info("Variables differ ("
            + `${JSON.stringify(variable)} - `
            + `${JSON.stringify(variables?.find(a => a.name === variable.name))})`);
        }
    }
    return differenceInfo;
};

const downloadProgram = async (program: Program, outputDirectory: string, programOutputFilePath: string) => {
    try {
        const buffer = await downloadFile(program.downloadInformation.url);
        if (program.isDirectory) {
            await fs.rmdir(outputDirectory, { recursive: true });
        }
        await fs.mkdir(outputDirectory, { recursive: true });
        if (program.downloadInformation.id === "DOWNLOAD_PROGRAM_IN_ZIP") {
            if (program.isDirectory) {
                // let extractedFiles: ExtractedFile[] = [];
                if (program.downloadInformation.zipLocation.includes(".")) {
                    let dirMovePath;
                    if (program.downloadInformation.zipLocation.length > 1) {
                        dirMovePath = path.join(outputDirectory,
                            ... program.downloadInformation.zipLocation.slice(0, -1));
                    }
                    if (program.downloadInformation["7zip"]) {
                        await extractAllFiles7z(buffer, outputDirectory, dirMovePath);
                    } else {
                        await extractAllFiles(buffer, outputDirectory, dirMovePath);
                    }
                } else {
                    fail();
                    // if (extractedFiles.length === 0) {
                    //     throw Error(`No (${extractedFiles.length}) file was extracted from zip file`);
                    // }
                    // for (const extractedFile of extractedFiles) {
                    //     await fs.writeFile(path.join(programOutputFilePath, ... extractedFile.filePath),
                    //         extractedFile.buffer);
                    // }
                }
            } else {
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
            }
        } else if (program.downloadInformation.id === "DOWNLOAD_PROGRAM_DIRECTLY") {
            await fs.writeFile(programOutputFilePath, buffer);
        } else {
            throw Error(`Download method is not supported: ${JSON.stringify(program.downloadInformation)}`);
        }
    } catch (error) {
        throw error;
    }
};

interface EnvVariablesToAdd {
    name: string
    system?: boolean
    append?: boolean
    value: string|string[]
}

const mergeEnvironmentVariables = (envVariables: EnvironmentVariable[]): EnvVariablesToAdd[] => {
    const finalVariables: EnvVariablesToAdd[] = [];
    for (const envVariable of envVariables) {
        let found = false;
        // eslint-disable-next-line @typescript-eslint/prefer-for-of
        for (let index = 0; index < finalVariables.length; index++) {
            if (finalVariables[index].name === envVariable.name) {
                const appendSituationSame = (finalVariables[index].append === envVariable.append);
                const systemSituationSame = (finalVariables[index].system === envVariable.system);
                // Can be merged
                if (envVariable.append && appendSituationSame && systemSituationSame) {
                    finalVariables[index].value = makeArrayUnique(
                        [envVariable.value].concat(finalVariables[index].value),
                        a => a
                    );
                    found = true;
                    break;
                }
            }
        }
        if (!found) {
            finalVariables.push(envVariable);
        }
    }
    return finalVariables;
};

// eslint-disable-next-line complexity
(async (): Promise<void> => {
    try {
        // Read config data
        const configFileContent = await fs.readFile(path.join(__dirname, "..", "..", "config.json"));
        const configData = JSON.parse(configFileContent.toString()) as Config;

        const environmentVariablesToAdd: EnvironmentVariable[] = [];

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
                program.isDirectory ? programOutputFilePath : path.dirname(programOutputFilePath),
                `.program_info_${path.basename(programOutputFilePath)}.json`
            );

            // Check if the program download can be skipped
            if (program.archived) {
                // eslint-disable-next-line no-console
                console.info(`${progressString} ${infoString} was skipped because it's archived`);
                continue;
            }
            let skipProgram = false;
            if (await fileExists(programConfigFilePath)) {
                const existingConfigFileContent = await fs.readFile(programConfigFilePath);
                const existingConfigData = JSON.parse(existingConfigFileContent.toString()) as ProgramConfig;
                const difference = detectDifferenceBetweenProgramConfigs(existingConfigData, program,
                    configData.variables);
                if (!difference.programDifference) {
                    skipProgram = true;
                    if (!difference.configDifference) {
                        console.info(`${progressString} ${infoString} was skipped: No difference detected`);
                        continue;
                    }
                }
            }
            if (!await fileExists(programOutputFilePath)) {
                skipProgram = false;
                // eslint-disable-next-line no-console
                console.info(`Program output path file was not found (${programOutputFilePath})`);
            }

            try {
                if (skipProgram) {
                    // eslint-disable-next-line no-console
                    console.info(`${progressString} ${infoString} update was skipped: Only config difference detected`);
                } else {
                    // Download Program
                    await downloadProgram(program, outputDirectory, programOutputFilePath);
                    // eslint-disable-next-line no-console
                    console.info(`${progressString} ${infoString} was added: '${programOutputFilePath}'`);
                }

                // Check for environment variables that need to be set
                if (program.environmentVariables) {
                    const variables: Variable[] = [{
                        name: "OUTPUT_DIRECTORY",
                        value: program.isDirectory ? programOutputFilePath : path.dirname(programOutputFilePath)
                    }];
                    if (configData.variables) {
                        variables.push(... configData.variables);
                    }
                    environmentVariablesToAdd.push(... program.environmentVariables.map(variable => {
                        // If no copy is done the original array value is manipulated
                        const variableObjectCopy = Object.assign({}, variable);
                        const processed = replaceVariables(variableObjectCopy.value, variables);
                        variableObjectCopy.value = processed.processedString;
                        usedVariables.push(... processed.usedVariables
                            .filter(usedVariable => usedVariable.name !== "OUTPUT_DIRECTORY"));
                        return variableObjectCopy;
                    }));
                }

                // Save program config information next to executable (directory)
                const localProgramConfig: ProgramConfig = {
                    ... program,
                    timeOfDownload: new Date().toISOString(),
                    variables: makeArrayUnique(usedVariables, a => a.name + a.value)
                };
                await fs.writeFile(programConfigFilePath, JSON.stringify(localProgramConfig, null, 4));
            } catch (programDownloadError) {
                // eslint-disable-next-line no-console
                console.info(`There was an error downloading the program ${infoString}:`);
                console.error(programDownloadError);
            }
        }
        const newEnvironmentVariables = mergeEnvironmentVariables(environmentVariablesToAdd);
        if (newEnvironmentVariables.length > 0) {
            // eslint-disable-next-line no-console
            console.info("Environment variables to add:");
            // eslint-disable-next-line no-console
            newEnvironmentVariables.forEach(a => console.info(a));
        }
    } catch (error) {
        throw error;
    }
})().catch(error => {
    console.error(error);
    process.exit(1);
});
