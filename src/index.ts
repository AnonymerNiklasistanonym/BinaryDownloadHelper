#!/usr/bin/env node

// Local imports
import { CommandId, genericCommandRunner } from "./commands/generic";
import { runCli } from "./cli";

(async (): Promise<void> => {
  runCli(
    async (programs, options) => {
      await genericCommandRunner(CommandId.INSTALL, programs, options);
    },
    async (programs, options) => {
      await genericCommandRunner(CommandId.UPDATE, programs, options);
    },
    async (programs, options) => {
      await genericCommandRunner(CommandId.REMOVE, programs, options);
    },
    async (programs, options) => {
      await genericCommandRunner(CommandId.LIST, programs, options);
    },
    async (programs, options) => {
      await genericCommandRunner(CommandId.SEARCH, programs, options);
    }
  );
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
