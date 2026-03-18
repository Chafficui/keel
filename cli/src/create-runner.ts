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
  console.log(
    chalk.bold.blue("  create-keel ") + chalk.gray("v1.0.0")
  );
  console.log(
    chalk.gray("  a codai project — Ship with confidence.")
  );
  console.log();
  console.log(
    chalk.gray("  This wizard will guide you through setting up your new project.")
  );
  console.log(
    chalk.gray("  Press Ctrl+C at any time to cancel.")
  );
  console.log();

  // First positional argument is the project name
  const projectNameArg = args[0];

  // Run interactive prompts
  let config: ProjectConfig;
  try {
    config = await runPrompts(projectNameArg);
  } catch {
    // User cancelled (Ctrl+C)
    console.log(chalk.yellow("\n  Cancelled.\n"));
    process.exit(0);
  }

  console.log();

  // Scaffold the project
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

  // Print completion message
  console.log();
  console.log("  ============================================================");
  console.log(chalk.green.bold("  Project created successfully!"));
  console.log("  ============================================================");
  console.log();
  console.log(chalk.bold("  Project location:"));
  console.log(chalk.cyan(`    ${process.cwd()}/${config.projectName}`));
  console.log();

  // Next steps summary
  console.log(chalk.bold("  Quick start:"));
  console.log();

  const commands: string[] = [`cd ${config.projectName}`];

  if (config.databaseSetup === "docker") {
    commands.push("docker compose up -d        # start PostgreSQL");
  }

  commands.push("npm run db:migrate           # run database migrations");
  commands.push("npm run dev                  # start development server");

  for (const cmd of commands) {
    console.log(chalk.cyan(`    ${cmd}`));
  }

  console.log();

  // Documentation links
  console.log(chalk.bold("  Documentation:"));
  console.log(chalk.gray("    docs/architecture.md      -- system overview"));
  console.log(chalk.gray("    docs/auth-flow.md         -- authentication details"));
  console.log(chalk.gray("    docs/capacitor-guide.md   -- mobile development"));
  console.log();

  // Sail specific reminders
  if (config.sails.includes("google-oauth")) {
    console.log(chalk.bold("  Google OAuth:"));
    console.log(chalk.gray("    Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env"));
    console.log(chalk.gray("    See: https://console.cloud.google.com/apis/credentials"));
    console.log();
  }

  if (config.sails.includes("stripe")) {
    console.log(chalk.bold("  Stripe:"));
    console.log(chalk.gray("    Set STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, and"));
    console.log(chalk.gray("    STRIPE_WEBHOOK_SECRET in .env"));
    console.log(chalk.gray("    See: https://dashboard.stripe.com/test/apikeys"));
    console.log();
  }

  if (config.databaseSetup === "skip") {
    console.log(chalk.yellow("  Reminder: Configure your DATABASE_URL in .env before running migrations."));
    console.log();
  }

  if (!config.resendApiKey) {
    console.log(chalk.yellow("  Reminder: Configure RESEND_API_KEY in .env for email functionality."));
    console.log();
  }
}
