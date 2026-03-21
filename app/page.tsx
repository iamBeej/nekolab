"use client";

import {
  startTransition,
  useEffect,
  useEffectEvent,
  useState,
} from "react";

const ACTIVE_WORKFLOW_RUN_STATUSES = new Set(["pending", "running"]);

const sections = [
  {
    id: "workflows",
    title: "Workflows",
    description: "Execute and monitor automation jobs",
  },
  {
    id: "logs",
    title: "Logs",
    description: "Inspect execution results and system activity",
  },
  {
    id: "neko",
    title: "Neko",
    description: "AI assistant for workflow generation",
  },
];

type WorkflowRunStatus = "pending" | "running" | "success" | "failed";
type WorkflowLogLevel = "info" | "error";

type WorkflowLog = {
  id: number;
  runId: number;
  level: WorkflowLogLevel;
  message: string;
  timestamp: string;
};

type WorkflowRunSummary = {
  id: number;
  name: string;
  status: WorkflowRunStatus;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
};

type WorkflowRun = WorkflowRunSummary & {
  logs: WorkflowLog[];
};

function formatTimestamp(value: string | null) {
  if (!value) {
    return "N/A";
  }

  return new Date(value).toLocaleString();
}

function runSummaryFromRun(run: WorkflowRun): WorkflowRunSummary {
  return {
    id: run.id,
    name: run.name,
    status: run.status,
    createdAt: run.createdAt,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    error: run.error,
  };
}

export default function Home() {
  const [runHistory, setRunHistory] = useState<WorkflowRunSummary[]>([]);
  const [latestRun, setLatestRun] = useState<WorkflowRun | null>(null);
  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function commitDashboardState(
    nextLatestRun: WorkflowRun | null,
    nextRunHistory: WorkflowRunSummary[],
    nextSelectedRun: WorkflowRun | null,
    preferredRunId: number | null,
  ) {
    setLatestRun(nextLatestRun);
    setRunHistory(nextRunHistory);
    setSelectedRun(nextSelectedRun);
    setSelectedRunId(
      nextSelectedRun?.id ??
        preferredRunId ??
        nextLatestRun?.id ??
        nextRunHistory[0]?.id ??
        null,
    );
  }

  async function fetchJson<T>(input: string, init?: RequestInit) {
    const response = await fetch(input, {
      cache: "no-store",
      ...init,
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    return (await response.json()) as T;
  }

  async function loadDashboardData(preferredRunId: number | null) {
    const [latestRunResult, runHistoryResult] = await Promise.all([
      fetchJson<WorkflowRun | null>("/api/workflow/run"),
      fetchJson<WorkflowRunSummary[]>("/api/workflow/runs"),
    ]);

    const nextSelectedRunId =
      preferredRunId ?? selectedRunId ?? latestRunResult?.id ?? runHistoryResult[0]?.id ?? null;

    let selectedRunResult: WorkflowRun | null = null;

    if (nextSelectedRunId !== null) {
      if (latestRunResult?.id === nextSelectedRunId) {
        selectedRunResult = latestRunResult;
      } else {
        selectedRunResult = await fetchJson<WorkflowRun>(
          `/api/workflow/runs/${nextSelectedRunId}`,
        );
      }
    }

    return {
      latestRun: latestRunResult,
      runHistory: runHistoryResult,
      selectedRun: selectedRunResult,
      selectedRunId: nextSelectedRunId,
    };
  }

  async function refreshDashboard(preferredRunId: number | null = null) {
    try {
      const dashboard = await loadDashboardData(preferredRunId);
      commitDashboardState(
        dashboard.latestRun,
        dashboard.runHistory,
        dashboard.selectedRun,
        dashboard.selectedRunId,
      );
    } catch (error) {
      console.error("Failed to load dashboard", error);
    }
  }

  const loadInitialDashboard = useEffectEvent(async () => {
    try {
      const dashboard = await loadDashboardData(null);
      startTransition(() => {
        commitDashboardState(
          dashboard.latestRun,
          dashboard.runHistory,
          dashboard.selectedRun,
          dashboard.selectedRunId,
        );
      });
    } catch (error) {
      console.error("Failed to load dashboard", error);
    }
  });

  useEffect(() => {
    void loadInitialDashboard();
  }, []);

  const pollDashboard = useEffectEvent(async () => {
    await refreshDashboard(selectedRunId);
  });

  const latestRunId = latestRun?.id ?? null;
  const latestRunStatus = latestRun?.status ?? null;

  useEffect(() => {
    if (!latestRunStatus || !ACTIVE_WORKFLOW_RUN_STATUSES.has(latestRunStatus)) {
      return;
    }

    const interval = setInterval(() => {
      void pollDashboard();
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [latestRunId, latestRunStatus]);

  async function handleRunWorkflow() {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/workflow/run", {
        method: "POST",
      });
      const result = (await response.json()) as WorkflowRun;

      if (!response.ok) {
        throw new Error("Failed to queue workflow");
      }

      console.log(result);
      commitDashboardState(
        result,
        [runSummaryFromRun(result), ...runHistory.filter((run) => run.id !== result.id)].slice(
          0,
          8,
        ),
        result,
        result.id,
      );
    } catch (error) {
      console.error("Failed to run workflow", error);
      await refreshDashboard(selectedRunId);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSelectRun(runId: number) {
    if (runId === selectedRunId) {
      return;
    }

    setSelectedRunId(runId);
    await refreshDashboard(runId);
  }

  const displayedRun = selectedRun ?? latestRun;
  const displayedLogs = displayedRun?.logs ?? [];

  function renderWorkflowSection() {
    return (
      <>
        <div className="mt-4 rounded-lg border border-white/10 px-4 py-3 text-sm text-white/75">
          {latestRun ? (
            <div className="space-y-1">
              <p>Latest run: {latestRun.name}</p>
              <p>Status: {latestRun.status}</p>
              <p className="text-xs text-white/50">
                Created: {formatTimestamp(latestRun.createdAt)}
              </p>
              <p className="text-xs text-white/50">
                Started: {formatTimestamp(latestRun.startedAt)}
              </p>
              {latestRun.finishedAt ? (
                <p className="text-xs text-white/50">
                  Finished: {formatTimestamp(latestRun.finishedAt)}
                </p>
              ) : null}
              {latestRun.error ? (
                <p className="text-xs text-red-300">
                  Error: {latestRun.error}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-white/50">No workflow runs yet.</p>
          )}
        </div>

        <button
          type="button"
          onClick={handleRunWorkflow}
          disabled={isSubmitting}
          className="mt-4 rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Queueing..." : "Run Workflow"}
        </button>

        <div className="mt-4 space-y-3">
          <h3 className="text-sm uppercase tracking-[0.18em] text-white/45">
            Recent Runs
          </h3>
          <ul className="space-y-2 text-sm">
            {runHistory.length > 0 ? (
              runHistory.map((run) => (
                <li key={run.id}>
                  <button
                    type="button"
                    onClick={() => {
                      void handleSelectRun(run.id);
                    }}
                    className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                      run.id === displayedRun?.id
                        ? "border-white/30 bg-white/10"
                        : "border-white/10 hover:bg-white/5"
                    }`}
                  >
                    <p>{run.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/45">
                      {run.status}
                    </p>
                    <p className="mt-1 text-xs text-white/45">
                      {formatTimestamp(run.createdAt)}
                    </p>
                  </button>
                </li>
              ))
            ) : (
              <li className="rounded-lg border border-white/10 px-4 py-3 text-white/50">
                No run history yet.
              </li>
            )}
          </ul>
        </div>
      </>
    );
  }

  function renderLogsSection() {
    return (
      <>
        {displayedRun ? (
          <div className="mt-4 rounded-lg border border-white/10 px-4 py-3 text-sm text-white/70">
            <p>Showing logs for run #{displayedRun.id}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/45">
              {displayedRun.status}
            </p>
          </div>
        ) : null}

        <ul className="mt-4 space-y-3 text-sm text-white/80">
          {displayedLogs.length > 0 ? (
            displayedLogs.map((log) => (
              <li
                key={log.id}
                className="rounded-lg border border-white/10 px-4 py-3"
              >
                <p>{log.message}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/40">
                  {log.level}
                </p>
                <p className="mt-1 text-xs text-white/50">
                  {formatTimestamp(log.timestamp)}
                </p>
              </li>
            ))
          ) : (
            <li className="rounded-lg border border-white/10 px-4 py-3 text-white/50">
              {displayedRun ? "No logs for this run." : "No logs yet."}
            </li>
          )}
        </ul>
      </>
    );
  }

  function renderNekoSection() {
    return (
      <div className="mt-4 rounded-lg border border-dashed border-white/10 px-4 py-3 text-sm text-white/50">
        Neko is not wired in yet. The workflow and logging system is now the stable base to build it on.
      </div>
    );
  }

  function renderSection(sectionId: string) {
    if (sectionId === "workflows") {
      return renderWorkflowSection();
    }

    if (sectionId === "logs") {
      return renderLogsSection();
    }

    return renderNekoSection();
  }

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white sm:px-8 sm:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-4xl flex-col gap-10">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.24em] text-white/50">
            Dashboard
          </p>
          <div className="space-y-2">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              NekoLab
            </h1>
            <p className="max-w-xl text-base text-white/70 sm:text-lg">
              Build. Test. Run systems.
            </p>
          </div>
        </header>

        <section className="flex flex-col gap-4">
          {sections.map((section) => (
            <article
              key={section.title}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
            >
              <h2 className="text-xl font-medium tracking-tight">
                {section.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/65 sm:text-base">
                {section.description}
              </p>
              {renderSection(section.id)}
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
