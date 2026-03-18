#!/usr/bin/env node

/**
 * create-keel CLI entry point (a codai project)
 *
 * Usage:
 *   npx create-keel my-app
 *   npx create-keel          # prompts for project name
 */

import chalk from "chalk";
import { main } from "./create-runner.js";

main(process.argv.slice(2)).catch((err) => {
  console.error(chalk.red("Unexpected error:"), err);
  process.exit(1);
});
