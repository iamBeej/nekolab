import { listExpenseRecords } from "@/lib/expenses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const records = await listExpenseRecords();

  return Response.json(records);
}
