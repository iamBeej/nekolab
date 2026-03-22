import { prisma } from "@/lib/prisma";

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
