// Package imports
import { Argument, Command, Option } from "commander";
// JSON imports
import { description, name, version } from "../package.json";

const configFileOption = new Option(
  "-c, --config <string>",
  "config file"
).default(`${name}_config.json`);

const sortedOption = new Option(
  "--sorted",
  "sorted output instead of in parallel"
).default(false);

const verboseOption = new Option("-v, --verbose", "verbose output").default(
  false
);

const jsonOption = new Option(
  "--json",
  "print the output in JSON format"
).default(false);

const programArgumentOptional = new Argument(
  "program",
  "a list of programs"
).argOptional();
programArgumentOptional.variadic = true;
const programArgumentRequired = new Argument(
  "program",
  "a list of programs"
).argRequired();
programArgumentRequired.variadic = true;

// TODO Add parallel option using worker threads

export interface CommandOptionsGlobal {
  /** The config file */
  config: string;
  /** Print the output sorted instead of as it comes (in parallel) */
  sorted: boolean;
  /** Print additional messages */
  verbose: boolean;
}

export type CommandOptionsInstall = CommandOptionsGlobal;
export type CommandOptionsUpdate = CommandOptionsGlobal;
export type CommandOptionsRemove = CommandOptionsGlobal;
export interface CommandOptionsList extends CommandOptionsGlobal {
  json: boolean;
}
export type CommandOptionsSearch = CommandOptionsGlobal;

const installCommand = new Command("install")
  .description("Install/Download program(s)")
  .addArgument(programArgumentOptional);

const updateCommand = new Command("update")
  .description("Update program(s)")
  .addArgument(programArgumentOptional);

const removeCommand = new Command("remove")
  .description("Remove program(s)")
  .addArgument(programArgumentOptional);

const listCommand = new Command("list")
  .description("List installed program(s)")
  .addOption(jsonOption.conflicts(verboseOption.name()))
  .addArgument(programArgumentOptional);

const searchCommand = new Command("search")
  .description("Search config for program(s)")
  .addArgument(programArgumentOptional);

export const runCli = (
  installAction: (
    programs: string[],
    options: CommandOptionsInstall
  ) => void | Promise<void>,
  updateAction: (
    programs: string[],
    options: CommandOptionsUpdate
  ) => void | Promise<void>,
  removeAction: (
    programs: string[],
    options: CommandOptionsRemove
  ) => void | Promise<void>,
  listAction: (
    programs: string[],
    options: CommandOptionsRemove
  ) => void | Promise<void>,
  searchAction: (
    programs: string[],
    options: CommandOptionsRemove
  ) => void | Promise<void>
): void => {
  const program = new Command(name)
    .description(description)
    .version(version)
    .addOption(configFileOption)
    .addOption(sortedOption)
    .addOption(verboseOption)
    .addCommand(
      installCommand.action(async (args: string[], _, command: Command) => {
        await installAction(
          args,
          command.optsWithGlobals<CommandOptionsInstall>()
        );
      })
    )
    .addCommand(
      updateCommand.action(async (args: string[], _, command: Command) => {
        await updateAction(
          args,
          command.optsWithGlobals<CommandOptionsUpdate>()
        );
      })
    )
    .addCommand(
      removeCommand.action(async (args: string[], _, command: Command) => {
        await removeAction(
          args,
          command.optsWithGlobals<CommandOptionsRemove>()
        );
      })
    )
    .addCommand(
      listCommand.action(async (args: string[], _, command: Command) => {
        await listAction(args, command.optsWithGlobals<CommandOptionsList>());
      })
    )
    .addCommand(
      searchCommand.action(async (args: string[], _, command: Command) => {
        await searchAction(
          args,
          command.optsWithGlobals<CommandOptionsSearch>()
        );
      })
    );

  program.parse();
};
