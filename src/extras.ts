import { promises as fs } from "fs";
import path from "path";

export const fileExists = async (filePath: string): Promise<boolean> => !!(await fs.stat(filePath).catch(() => false));

export const makeArrayUnique = <TYPE>(array: TYPE[], checkFunction: (element: TYPE) => string): TYPE[] => {
    const uniqueIds: string[] = [];
    return array.filter(element => {
        const id = checkFunction(element);
        if (!uniqueIds.includes(id)) {
            uniqueIds.push(id);
            return true;
        }
        return false;
    });
};

const isDirectory = async (filePath: string): Promise<boolean> => {
    try {
        const stat = await fs.lstat(filePath);
        return stat.isDirectory();
    } catch (error) {
        throw error;
    }
};

const isFile = async (filePath: string): Promise<boolean> => {
    try {
        const stat = await fs.lstat(filePath);
        return stat.isFile();
    } catch (error) {
        throw error;
    }
};

export const getFiles = async (filePath: string): Promise<string[]> => {
    try {
        if (await isDirectory(filePath)) {
            let filesInDir = await fs.readdir(filePath);
            filesInDir = filesInDir.map(name => path.join(filePath, name));
            const files: string[] = [];
            for (const file of filesInDir) {
                if (await isDirectory(file)) {
                    files.push(... await getFiles(file));
                } else {
                    files.push(file);
                }
            }
            return files;
        } else {
            return [filePath];
        }
    } catch (error) {
        throw error;
    }
};

export const moveDirectory = async (moveDir: string, newDir: string): Promise<void> => {
    const moveDirFiles = await getFiles(moveDir);
    moveDirFiles.forEach(async (file) => {
        const newFileName = file.replace(moveDir, newDir);
        await fs.mkdir(path.dirname(newFileName), { recursive: true });
        await fs.rename(file, newFileName);
    });
    await fs.rmdir(moveDir, { recursive: true });
};
