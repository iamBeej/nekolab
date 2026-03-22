import {
  executeExpenseCommand,
  ExpenseCommandError,
} from "../lib/expense-tracker.mjs";

async function main() {
  const command = process.argv.slice(2).join(" ").trim();

  if (!command) {
    throw new ExpenseCommandError("Command is required");
  }

  const output = await executeExpenseCommand(command);
  process.stdout.write(`${output}\n`);
}

main()
  .catch((error) => {
    const message =
      error instanceof Error ? error.message : "Unknown expense command error";

    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
