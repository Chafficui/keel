/**
 * Create project logic — shared between create-keel binary and `keel create` command.
 */

import chalk from "chalk";
import { runPrompts, type ProjectConfig } from "./prompts.js";
import { scaffold } from "./scaffold.js";
import { installSails } from "./sail-installer.js";

export async function main(args: string[] = []): Promise<void> {
  console.log();
  console.log(chalk.blue("  ██╗  ██╗███████╗███████╗██╗     "));
  console.log(chalk.blue("  ██║ ██╔╝██╔════╝██╔════╝██║     "));
  console.log(chalk.blue("  █████╔╝ █████╗  █████╗  ██║     "));
  console.log(chalk.blue("  ██╔═██╗ ██╔══╝  ██╔══╝  ██║     "));
  console.log(chalk.blue("  ██║  ██╗███████╗███████╗███████╗"));
  console.log(chalk.blue("  ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝"));
  console.log();
  console.log(chalk.gray("  a codai project"));
  console.log();

  const projectNameArg = args[0];

  let config: ProjectConfig;
  try {
    config = await runPrompts(projectNameArg);
  } catch {
    console.log(chalk.yellow("\n  Cancelled.\n"));
    process.exit(0);
  }

  console.log();

  const success = await scaffold(config);

  if (!success) {
    console.log(chalk.red("\n  Scaffolding failed. See errors above.\n"));
    process.exit(1);
  }

  // Install selected sails
  if (config.sails.length > 0) {
    console.log();
    console.log(chalk.bold("  Installing sails..."));
    await installSails(config);
  }

  // Done
  console.log();
  console.log(chalk.green.bold("  ✔ Project created!"));
  console.log();
  console.log(chalk.bold("  Quick start:"));
  console.log(chalk.cyan(`    cd ${config.projectName}`));
  console.log(chalk.cyan("    npx @chafficui/keel dev"));
  console.log();

  if (!config.resendApiKey) {
    console.log(chalk.gray("  Tip: Set RESEND_API_KEY in .env for email sending."));
    console.log();
  }

  process.exit(0);
}
