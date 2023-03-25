import * as TJS from "typescript-json-schema";
import { promises as fs } from "fs";
import path from "path";

interface OutputJsonSchema {
  typeName: string;
  outputFilePath: string;
}

const settings: TJS.PartialArgs = {
  // Create required array for non-optional properties.
  required: true,
};
const compilerOptions: TJS.CompilerOptions = {
  strictNullChecks: true,
};

const rootDir = path.join(__dirname, "..");
const inputTypeDefinitions = [path.join(rootDir, "src", "config.ts")];
const outputJsonSchemaDir = path.join(rootDir, "schemas");
const outputJsonSchemas: OutputJsonSchema[] = [
  {
    typeName: "Config",
    outputFilePath: path.join(outputJsonSchemaDir, "config.schema.json"),
  },
  {
    typeName: "ProgramConfig",
    outputFilePath: path.join(outputJsonSchemaDir, "programConfig.schema.json"),
  },
];

(async (): Promise<void> => {
  const program = TJS.getProgramFromFiles(
    inputTypeDefinitions,
    compilerOptions
  );
  for (const outputJsonSchema of outputJsonSchemas) {
    const configSchema = TJS.generateSchema(
      program,
      outputJsonSchema.typeName,
      settings
    );
    if (configSchema == null) {
      throw Error(
        `${outputJsonSchema.typeName} schema could not be generated!`
      );
    }
    await fs.writeFile(
      outputJsonSchema.outputFilePath,
      JSON.stringify(configSchema, undefined, 4)
    );
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
