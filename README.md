# BinaryDownloadHelper

Helps to download binary files (programs) that do not have app store versions or installers.

## Description

You can tell this program to download programs without an installer or store version:

```json
{
    "downloadInformation": {
        "id": "DOWNLOAD_PROGRAM_IN_ZIP",
        "url": "https://netcologne.dl.sourceforge.net/project/astyle/astyle/astyle%20${VERSION}/AStyle_${VERSION}_windows.zip",
        "zipLocation": [
            "AStyle",
            "bin",
            "AStyle.exe"
        ]
    },
    "environmentVariables": [
        {
            "append": true,
            "name": "PATH",
            "value": "${OUTPUT_DIRECTORY}"
        }
    ],
    "name": "astyle",
    "outputDirectory": "${BIN_DIR}",
    "renameTo": "astyle.exe",
    "version": "3.1"
}
```

```json
"variables": [{
    "name": "BIN_DIR",
    "value": "${HOME}\\programs\bin"
}]
```

This would for example create the file `astyle.exe` by downloading a `.zip` file from the web which is then extracted and from which then the file `AStyle\bin\AStyle.exe` is moved and renamed to `$HOME\programs\bin\astyle.exe`.

This also works for executable files.

## Examples

An example to install:

```sh
npm run start -- -c config.example.windows.json install alphaclicker opentabletdriver astyle cloc rsvg-convert
```

An example to delete those files:

```sh
npm run start -- -c config.example.windows.json remove alphaclicker opentabletdriver astyle cloc rsvg-convert
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
    npm run start -- # insert commands here
    # Run via node
    node . # insert commands here
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
