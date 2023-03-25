/**
 * Pointer to the schema against which this document should be validated
 */
export type Schema = string;

export interface Config {
  $schema?: Schema;
  /**
   * Programs
   */
  programs: Program[];
  /**
   * Variables
   */
  variables?: Variable[];
}
/**
 * A program (without a native installer)
 */
export interface Program {
  /**
   * Declare program as archived and thus don't download or upgrade it
   */
  archived?: boolean;
  /**
   * Program description
   */
  description?: string;
  /**
   * Information on how to download this program
   */
  downloadInformation: DownloadProgram | DownloadProgramInZip;
  /**
   * Environment variables based on this program location ('${OUTPUT_DIRECTORY}')
   */
  environmentVariables?: EnvironmentVariable[];
  /**
   * Declaring that this program is not just an executable but a whole directory
   */
  isDirectory?: boolean;
  /**
   * Program name
   */
  name: string;
  /**
   * Custom display name
   */
  displayName?: string;
  /**
   * The directory where the program should be moved to
   */
  outputDirectory: string;
  /**
   * Name to which the extracted program/program directory should be renamed to
   */
  renameTo?: string;
  /**
   * Program version
   */
  version: string;
  /**
   * The program website
   */
  website?: string;
}
/**
 * Download program directly via URL
 */
export interface DownloadProgram {
  /**
   * Download type ID
   */
  id: "DOWNLOAD_PROGRAM_DIRECTLY";
  /**
   * Download url
   */
  url: string;
  /**
   * Previous download urls
   */
  urlHistory?: string[];
}
/**
 * Download ZIP file via URL and then extract program
 */
export interface DownloadProgramInZip {
  /**
   * Download type ID
   */
  id: "DOWNLOAD_PROGRAM_IN_ZIP";
  /**
   * Download url
   */
  url: string;
  /**
   * Previous download urls
   */
  urlHistory?: string[];
  /**
   * Custom location of EXE or directory in ZIP file
   */
  zipLocation?: string[];
}
/**
 * System environment variable
 */
export interface EnvironmentVariable {
  /**
   * Should the value appended if a variable with this name already exists
   */
  append?: boolean;
  /**
   * Name of the system environment variable
   */
  name: string;
  /**
   * Should the system environment variable be created not on the user side but the system side
   */
  system?: boolean;
  /**
   * Value of the system environment variable
   */
  value: string;
}
/**
 * Variable that will be replaced by a set value using ${VARIABLE_NAME} (supported by: 'renameTo', 'outputDirectory')
 */
export interface Variable<NAME extends string = string> {
  /**
   * Name of the variable that can be reused as ${VARIABLE_NAME}
   */
  name: NAME;
  /**
   * Value of the variable
   */
  value: string;
}

/**
 * A local programming configuration of installed programs.
 * This makes it able to remove and upgrade by storing program specific information.
 */
export interface ProgramConfig
  extends Pick<Program, "name" | "environmentVariables" | "version"> {
  $schema?: Schema;
  timeOfDownload: string;
}
