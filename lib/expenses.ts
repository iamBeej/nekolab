import { prisma } from "@/lib/prisma";

export class InvalidExpenseInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidExpenseInputError";
  }
}

type CreateExpenseRecordInput = {
  personName: string;
  category: string;
  amount: string;
  item: string;
  notes: string;
};

function normalizeRequiredField(fieldName: string, value: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new InvalidExpenseInputError(`Missing required field '${fieldName}'`);
  }

  return normalizedValue;
}

function parseAmountToCents(rawAmount: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(rawAmount)) {
    throw new InvalidExpenseInputError("Amount must be numeric");
  }

  const [wholePart, decimalPart = ""] = rawAmount.split(".");
  const parsedAmount = Number(rawAmount);

  if (!Number.isFinite(parsedAmount)) {
    throw new InvalidExpenseInputError("Amount must be numeric");
  }

  const amountInCents =
    Number(wholePart) * 100 + Number(decimalPart.padEnd(2, "0"));

  if (amountInCents <= 0) {
    throw new InvalidExpenseInputError("Amount must be greater than 0");
  }

  return amountInCents;
}

export async function createExpenseRecord(input: CreateExpenseRecordInput) {
  const personName = normalizeRequiredField("person", input.personName);
  const category = normalizeRequiredField("category", input.category);
  const item = normalizeRequiredField("item", input.item);
  const notes = normalizeRequiredField("notes", input.notes);
  const amount = normalizeRequiredField("amount", input.amount);
  const amountInCents = parseAmountToCents(amount);

  return prisma.$transaction(async (tx) => {
    const person = await tx.person.upsert({
      where: {
        name: personName,
      },
      update: {},
      create: {
        name: personName,
      },
    });

    const record = await tx.expense.create({
      data: {
        personId: person.id,
        category,
        amountInCents,
        item,
        notes,
      },
    });

    const totals = await tx.expense.aggregate({
      where: {
        personId: person.id,
      },
      _sum: {
        amountInCents: true,
      },
    });

    return {
      message: "[OK] Expense added",
      personName: person.name,
      personTotalInCents: totals._sum.amountInCents ?? 0,
      record: {
        id: record.id,
        personName: person.name,
        category: record.category,
        amountInCents: record.amountInCents,
        item: record.item,
        notes: record.notes,
        timestamp: record.timestamp.toISOString(),
      },
    };
  });
}

export async function listExpenseRecords() {
  const expenses = await prisma.expense.findMany({
    include: {
      person: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [
      {
        timestamp: "desc",
      },
      {
        id: "desc",
      },
    ],
  });

  return expenses.map((expense) => ({
    id: expense.id,
    personName: expense.person.name,
    category: expense.category,
    amountInCents: expense.amountInCents,
    item: expense.item,
    notes: expense.notes,
    timestamp: expense.timestamp.toISOString(),
  }));
}
