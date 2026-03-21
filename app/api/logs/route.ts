import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const runIdParam = searchParams.get("runId");
  const runId = runIdParam ? Number(runIdParam) : null;

  if (runIdParam && Number.isNaN(runId)) {
    return Response.json(
      {
        message: "Invalid runId",
      },
      {
        status: 400,
      },
    );
  }

  const logs = await prisma.log.findMany({
    where: runId === null ? undefined : { runId },
    orderBy: {
      id: "asc",
    },
  });

  return Response.json(logs);
}
