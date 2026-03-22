import { executeExpenseCommand, ExpenseCommandError } from "@/lib/expense-tracker.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

class InvalidExpenseCommandRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidExpenseCommandRequestError";
  }
}

async function getRequestedCommand(request: Request) {
  const requestBody = await request.text();

  if (!requestBody) {
    throw new InvalidExpenseCommandRequestError("Request body is required");
  }

  let parsedBody: unknown;

  try {
    parsedBody = JSON.parse(requestBody);
  } catch {
    throw new InvalidExpenseCommandRequestError("Invalid JSON body");
  }

  if (
    typeof parsedBody !== "object" ||
    parsedBody === null ||
    Array.isArray(parsedBody)
  ) {
    throw new InvalidExpenseCommandRequestError("Request body must be an object");
  }

  const command = (parsedBody as { command?: unknown }).command;

  if (typeof command !== "string" || command.trim().length === 0) {
    throw new InvalidExpenseCommandRequestError("Invalid command");
  }

  return command;
}

export async function POST(request: Request) {
  try {
    const command = await getRequestedCommand(request);
    const output = await executeExpenseCommand(command);

    return Response.json(
      {
        output,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    if (
      error instanceof InvalidExpenseCommandRequestError ||
      error instanceof ExpenseCommandError
    ) {
      return Response.json(
        {
          message: error.message,
        },
        {
          status: 400,
        },
      );
    }

    const message =
      error instanceof Error ? error.message : "Unable to execute expense command";

    return Response.json(
      {
        message,
      },
      {
        status: 500,
      },
    );
  }
}
