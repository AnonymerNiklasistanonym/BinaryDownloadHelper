# BinaryDownloadHelper

Helps to download binary files (programs) that do not have app store versions or installers.

## Description

You can tell this program to download programs without an installer or store version:

```json
{
    "downloadInformation": {
        "id": "DOWNLOAD_PROGRAM_IN_ZIP",
        "url": "https://download.java.net/java/GA/jdk14.0.1/664493ef4a6946b186ff29eb326336a2/7/GPL/openjdk-14.0.1_windows-x64_bin.zip",
        "zipLocation": [ "jdk-14.0.1", "." ]
    },
    "environmentVariables": [{
        "name": "JAVA_HOME",
        "system": true,
        "value": "${OUTPUT_DIRECTORY}\\bin"
    }, {
        "append": true,
        "name": "PATH",
        "value": "%JAVA_HOME%\\bin"
    }],
    "isDirectory": true,
    "name": "JAVA JDK 14",
    "outputDirectory": "${PROGRAM_DIR}\\java_jdk_14",
    "version": "14.0.1"
}
```

```json
"variables": [{
    "name": "PROGRAM_DIR",
    "value": "C:\\Users\\nikla\\programs"
}]
````

This would for example download the JAVA OpenJDK into the directory `C:\Users\nikla\programs\java_jdk_14` and then tell you to set the environment variables `JAVA_HOME=C:\Users\nikla\programs\java_jdk_14` and extend `PATH` with `%JAVA_HOME%\bin`.

- `"outputDirectory": "${PROGRAM_DIR}\\java_jdk_14"` references the user set variable `PROGRAM_DIR` with the value `C:\Users\nikla\programs` which then is resolved to `C:\Users\nikla\programs\java_jdk_14`
  - For environment variables the variable `OUTPUT_DIRECTORY` (`${OUTPUT_DIRECTORY}`) resolves to the one of the resolved `"outputDirectory"`
- `DOWNLOAD_PROGRAM_IN_ZIP` means that it downloads a `.zip` file from the internet - it is also possible to download files directly (check the provided [example file](./config.example.windows.json))
  - `"zipLocation": [ "jdk-14.0.1", "." ]` means that after extracting the `.zip` file all files in the directory `jdk-14.0.1` are moved one directory up into the `outputDirectory`

As soon as you would change for example the version attribute or the URL and run the script again the directory `C:\Users\nikla\programs\java_jdk_14` would be wiped and downloaded again.

This also works for single executable files like `wget` for Windows:

```json
{
    "description": "A command-line utility for retrieving files using HTTP, HTTPS and FTP protocols.",
    "downloadInformation": {
        "id": "DOWNLOAD_PROGRAM_IN_ZIP",
        "url": "https://eternallybored.org/misc/wget/releases/wget-1.20.3-win64.zip",
        "zipLocation": [ "wget.exe" ]
    },
    "environmentVariables": [{
        "append": true,
        "name": "PATH",
        "value": "${OUTPUT_DIRECTORY}"
    }],
    "name": "GNU Wget (mingw32)",
    "outputDirectory": "${BIN_DIR}",
    "version": "1.20.3"
}
```

```json
"variables": [{
    "name": "BIN_DIR",
    "value": "C:\\Users\\nikla\\programs\\bin"
}]
````

Single executable files like `clinfo` for Windows can also be downloaded directly:

```json
{
    "description": "OpenCL info",
    "downloadInformation": {
        "id": "DOWNLOAD_PROGRAM_DIRECTLY",
        "url": "https://ci.appveyor.com/api/projects/oblomov/clinfo/artifacts/clinfo.exe?job=platform%3a+x64"
    },
    "environmentVariables": [{
        "append": true,
        "name": "PATH",
        "value": "${OUTPUT_DIRECTORY}"
    }],
    "name": "clinfo",
    "outputDirectory": "${BIN_DIR}",
    "version": "2.2.18"
}
```

## Setup

1. **Prerequisites**:
   - Have [`nodejs`](https://nodejs.org/en/download/current/) installed
2. **Install build and runtime dependencies**:

    ```sh
    npm install
    ```

3. **Build**:

    ```sh
    npm run build
    ```

4. **Run**:

    ```sh
    # Optionally remove build dependencies
    npm prune --production
    # Run via npm
    npm run start
    # Run via node
    node .
    ```

## Config file

The program reads the provided `config.json` file and then downloads/updates programs according to only this information.

Examples for this file can be found in:

- [`config.example.windows.json` (Windows example)](./config.example.windows.json)

**Tip**:

*You should try to edit the JSON file with a modern text editor like [VSCode](https://code.visualstudio.com/), because then the editor can tell you if the configuration file is valid, what keys are missing what information and if they have the correct type based on an existing [JSON schema](schemas/config.schema.json)*.

## Debug

If you open the repository as workspace in [VSCode](https://code.visualstudio.com/) you can use the native debugging tool (if you have the basic JS/TS language tools installed - you should be prompted by the editor to install it if you don't have them).
This allows to set breakpoints in the TypeScript files and do the other usual debugging stuff.
