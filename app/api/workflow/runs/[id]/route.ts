import { getWorkflowRunById } from "@/lib/workflows";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const runId = Number(id);

  if (Number.isNaN(runId)) {
    return Response.json(
      {
        message: "Invalid workflow run id",
      },
      {
        status: 400,
      },
    );
  }

  const run = await getWorkflowRunById(runId);

  if (!run) {
    return Response.json(
      {
        message: "Workflow run not found",
      },
      {
        status: 404,
      },
    );
  }

  return Response.json(run);
}
