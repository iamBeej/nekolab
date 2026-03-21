import { listWorkflowRuns } from "@/lib/workflows";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : 8;

  if (Number.isNaN(limit) || limit < 1) {
    return Response.json(
      {
        message: "Invalid limit",
      },
      {
        status: 400,
      },
    );
  }

  const runs = await listWorkflowRuns(limit);

  return Response.json(runs);
}
