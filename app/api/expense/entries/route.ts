import {
  createExpenseRecord,
  InvalidExpenseInputError,
} from "@/lib/expenses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

class InvalidExpenseEntryRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidExpenseEntryRequestError";
  }
}

async function getRequestedEntry(request: Request) {
  const requestBody = await request.text();

  if (!requestBody) {
    throw new InvalidExpenseEntryRequestError("Request body is required");
  }

  let parsedBody: unknown;

  try {
    parsedBody = JSON.parse(requestBody);
  } catch {
    throw new InvalidExpenseEntryRequestError("Invalid JSON body");
  }

  if (
    typeof parsedBody !== "object" ||
    parsedBody === null ||
    Array.isArray(parsedBody)
  ) {
    throw new InvalidExpenseEntryRequestError("Request body must be an object");
  }

  const body = parsedBody as Record<string, unknown>;

  return {
    personName:
      typeof body.personName === "string" ? body.personName : String(body.personName ?? ""),
    category:
      typeof body.category === "string" ? body.category : String(body.category ?? ""),
    amount:
      typeof body.amount === "string" || typeof body.amount === "number"
        ? String(body.amount)
        : String(body.amount ?? ""),
    item: typeof body.item === "string" ? body.item : String(body.item ?? ""),
    notes:
      typeof body.notes === "string" ? body.notes : String(body.notes ?? ""),
  };
}

export async function POST(request: Request) {
  try {
    const entry = await getRequestedEntry(request);
    const result = await createExpenseRecord(entry);

    return Response.json(result, {
      status: 201,
    });
  } catch (error) {
    if (
      error instanceof InvalidExpenseEntryRequestError ||
      error instanceof InvalidExpenseInputError
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
      error instanceof Error ? error.message : "Unable to create expense entry";

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
