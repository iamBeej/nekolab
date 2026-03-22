import { prismaRuntime } from "./prisma-runtime.mjs";

const ADD_EXPENSE_COMMAND = "expense add";
const TOTAL_EXPENSE_COMMAND = "expense total";
const PHILIPPINE_PESO_SYMBOL = "\u20b1";
const PHILIPPINE_PESO_FORMATTER = new Intl.NumberFormat("en-PH", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export class ExpenseCommandError extends Error {
  constructor(message) {
    super(message);
    this.name = "ExpenseCommandError";
  }
}

function formatPesoFromCents(amountInCents) {
  return `${PHILIPPINE_PESO_SYMBOL}${PHILIPPINE_PESO_FORMATTER.format(
    amountInCents / 100,
  )}`;
}

function parseCommandSegments(command) {
  return command
    .split("|")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function parseFields(segments) {
  const fields = {};

  for (const segment of segments) {
    const separatorIndex = segment.indexOf(":");

    if (separatorIndex <= 0) {
      throw new ExpenseCommandError(`Invalid field '${segment}'`);
    }

    const key = segment.slice(0, separatorIndex).trim();
    const value = segment.slice(separatorIndex + 1).trim();

    if (!value) {
      throw new ExpenseCommandError(`Missing value for '${key}'`);
    }

    fields[key] = value;
  }

  return fields;
}

function parseAmountToCents(rawAmount) {
  if (!/^\d+(\.\d{1,2})?$/.test(rawAmount)) {
    throw new ExpenseCommandError("Amount must be numeric");
  }

  const [wholePart, decimalPart = ""] = rawAmount.split(".");
  const parsedAmount = Number(rawAmount);

  if (!Number.isFinite(parsedAmount)) {
    throw new ExpenseCommandError("Amount must be numeric");
  }

  const amountInCents =
    Number(wholePart) * 100 + Number(decimalPart.padEnd(2, "0"));

  if (amountInCents <= 0) {
    throw new ExpenseCommandError("Amount must be greater than 0");
  }

  return amountInCents;
}

function normalizePersonName(personName) {
  const normalizedPersonName = personName.trim();

  if (!normalizedPersonName) {
    throw new ExpenseCommandError("Missing required field 'person'");
  }

  return normalizedPersonName;
}

function normalizeItem(item) {
  const normalizedItem = item.trim();

  if (!normalizedItem) {
    throw new ExpenseCommandError("Missing required field 'item'");
  }

  return normalizedItem;
}

function ensureNoUnexpectedFields(fields, allowedFieldNames) {
  const unexpectedFieldNames = Object.keys(fields).filter(
    (fieldName) => !allowedFieldNames.has(fieldName),
  );

  if (unexpectedFieldNames.length > 0) {
    throw new ExpenseCommandError(
      `Unexpected field '${unexpectedFieldNames[0]}'`,
    );
  }
}

async function addExpense(fields) {
  ensureNoUnexpectedFields(fields, new Set(["person", "amount", "item"]));

  const personName = normalizePersonName(fields.person ?? "");
  const item = normalizeItem(fields.item ?? "");

  if (!fields.amount) {
    throw new ExpenseCommandError("Missing required field 'amount'");
  }

  const amountInCents = parseAmountToCents(fields.amount);

  const expense = await prismaRuntime.$transaction(async (tx) => {
    const person = await tx.person.upsert({
      where: {
        name: personName,
      },
      update: {},
      create: {
        name: personName,
      },
    });

    await tx.expense.create({
      data: {
        personId: person.id,
        amountInCents,
        item,
      },
    });

    const expenses = await tx.expense.findMany({
      where: {
        personId: person.id,
      },
      select: {
        amountInCents: true,
      },
    });

    return {
      personName: person.name,
      totalInCents: expenses.reduce(
        (runningTotal, expenseRecord) =>
          runningTotal + expenseRecord.amountInCents,
        0,
      ),
    };
  });

  return `[OK] Expense added\n${expense.personName} total: ${formatPesoFromCents(
    expense.totalInCents,
  )}`;
}

async function getPersonTotal(fields) {
  ensureNoUnexpectedFields(fields, new Set(["person"]));

  const personName = normalizePersonName(fields.person ?? "");
  const person = await prismaRuntime.person.findUnique({
    where: {
      name: personName,
    },
    select: {
      expenses: {
        select: {
          amountInCents: true,
        },
      },
    },
  });

  const totalInCents = (person?.expenses ?? []).reduce(
    (runningTotal, expenseRecord) =>
      runningTotal + expenseRecord.amountInCents,
    0,
  );

  return `${personName} total expenses: ${formatPesoFromCents(totalInCents)}`;
}

async function getOverallTotal(fields) {
  ensureNoUnexpectedFields(fields, new Set());

  const expenses = await prismaRuntime.expense.findMany({
    select: {
      amountInCents: true,
    },
  });

  const totalInCents = expenses.reduce(
    (runningTotal, expenseRecord) => runningTotal + expenseRecord.amountInCents,
    0,
  );

  return `Total expenses: ${formatPesoFromCents(totalInCents)}`;
}

export async function executeExpenseCommand(command) {
  const normalizedCommand = command.trim();

  if (!normalizedCommand) {
    throw new ExpenseCommandError("Command is required");
  }

  const segments = parseCommandSegments(normalizedCommand);
  const [commandName, ...fieldSegments] = segments;

  if (!commandName) {
    throw new ExpenseCommandError("Command is required");
  }

  const fields = parseFields(fieldSegments);

  if (commandName === ADD_EXPENSE_COMMAND) {
    if (!fields.person) {
      throw new ExpenseCommandError("Missing required field 'person'");
    }

    if (!fields.item) {
      throw new ExpenseCommandError("Missing required field 'item'");
    }

    return addExpense(fields);
  }

  if (commandName === TOTAL_EXPENSE_COMMAND) {
    if (fields.person) {
      return getPersonTotal(fields);
    }

    return getOverallTotal(fields);
  }

  throw new ExpenseCommandError("Unsupported command");
}

export async function disconnectExpenseTracker() {
  await prismaRuntime.$disconnect();
}
