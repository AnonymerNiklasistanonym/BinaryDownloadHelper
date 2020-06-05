import { promises as fs } from "fs";

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
