// Type imports
import type { Variable } from "./config";

export interface VariableReplacedString {
  processedString: string;
  usedVariables: Variable[];
}

const replaceAll = (str: string, find: string, replace: string) => {
  return str.replace(new RegExp(find, "g"), replace);
};

export const replaceVariables = (
  source: string,
  variables?: Variable[]
): VariableReplacedString => {
  let processedString = source;
  const usedVariables: Variable[] = [];
  if (variables) {
    for (const variable of variables) {
      const newString = replaceAll(
        processedString,
        `\\$\\{${variable.name}\\}`,
        variable.value
      );
      if (newString !== processedString) {
        usedVariables.push(variable);
      }
      processedString = newString;
    }
  }
  return { processedString, usedVariables };
};
