"use client";

import {
  startTransition,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";

const ACTIVE_WORKFLOW_RUN_STATUSES = new Set(["pending", "running"]);

const sections = [
  {
    id: "expenses",
    title: "Expenses",
    description: "Enter expenses manually and review stored records",
  },
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
    id: "winter",
    title: "Winter",
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

type WorkflowDefinition = {
  id: string;
  name: string;
  description: string;
};

type ExpenseFormState = {
  personName: string;
  category: string;
  amount: string;
  item: string;
  notes: string;
};

type ExpenseSubmissionState = {
  kind: "idle" | "success" | "error";
  message: string;
  personName?: string;
  personTotalInCents?: number;
};

type ExpenseRecord = {
  id: number;
  personName: string;
  category: string;
  amountInCents: number;
  item: string;
  notes: string;
  timestamp: string;
};

type ExpenseTableSortField =
  | "id"
  | "personName"
  | "category"
  | "amountInCents"
  | "timestamp";

type ExpenseTableSortDirection = "asc" | "desc";
type ExpenseFilterMenu = "personName" | "category" | null;
type ExpenseFilterMenuPosition = {
  top: number;
  left: number;
};

const EMPTY_EXPENSE_FORM: ExpenseFormState = {
  personName: "",
  category: "",
  amount: "",
  item: "",
  notes: "",
};
const PHILIPPINE_PESO_SYMBOL = "\u20b1";
const PHILIPPINE_PESO_TABLE_FORMATTER = new Intl.NumberFormat("en-PH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatTimestamp(value: string | null) {
  if (!value) {
    return "N/A";
  }

  return new Date(value).toLocaleString();
}

function formatPesoForTable(amountInCents: number) {
  return `${PHILIPPINE_PESO_SYMBOL}${PHILIPPINE_PESO_TABLE_FORMATTER.format(
    amountInCents / 100,
  )}`;
}

function formatPeso(amountInCents: number) {
  return formatPesoForTable(amountInCents);
}

function formatTitleCase(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => {
      const [firstCharacter = "", ...remainingCharacters] = part.toLowerCase();

      return `${firstCharacter.toUpperCase()}${remainingCharacters.join("")}`;
    })
    .join(" ");
}

function formatSentenceCase(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "N/A";
  }

  return `${trimmedValue.charAt(0).toUpperCase()}${trimmedValue.slice(1)}`;
}

function formatExpenseTimestamp(value: string) {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}

function SortDirectionIndicator({
  isActive,
  direction,
}: {
  isActive: boolean;
  direction: ExpenseTableSortDirection;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      className={`h-2.5 w-2.5 ${
        isActive ? "text-white/75" : "text-white/30"
      }`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {direction === "asc" ? (
        <>
          <path d="M6 10V3" />
          <path d="m3.5 5.5 2.5-2.5 2.5 2.5" />
        </>
      ) : (
        <>
          <path d="M6 2v7" />
          <path d="m3.5 6.5 2.5 2.5 2.5-2.5" />
        </>
      )}
    </svg>
  );
}

function FilterIndicator() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      className="h-2.5 w-2.5 text-white/30"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 3h8" />
      <path d="M3.5 3h5L6.75 5.1v2.2L5.25 8V5.1z" />
    </svg>
  );
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
  const [workflowDefinitions, setWorkflowDefinitions] = useState<
    WorkflowDefinition[]
  >([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(
    null,
  );
  const [runHistory, setRunHistory] = useState<WorkflowRunSummary[]>([]);
  const [latestRun, setLatestRun] = useState<WorkflowRun | null>(null);
  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expenseForm, setExpenseForm] =
    useState<ExpenseFormState>(EMPTY_EXPENSE_FORM);
  const [expenseSubmissionState, setExpenseSubmissionState] =
    useState<ExpenseSubmissionState>({
      kind: "idle",
      message: "",
    });
  const [expenseRecords, setExpenseRecords] = useState<ExpenseRecord[]>([]);
  const [expensePersonFilter, setExpensePersonFilter] = useState<string[]>([]);
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<string[]>(
    [],
  );
  const [activeExpenseFilterMenu, setActiveExpenseFilterMenu] =
    useState<ExpenseFilterMenu>(null);
  const [activeExpenseFilterMenuPosition, setActiveExpenseFilterMenuPosition] =
    useState<ExpenseFilterMenuPosition | null>(null);
  const [expensePersonFilterQuery, setExpensePersonFilterQuery] = useState("");
  const [expenseCategoryFilterQuery, setExpenseCategoryFilterQuery] =
    useState("");
  const [expenseSortField, setExpenseSortField] =
    useState<ExpenseTableSortField>("timestamp");
  const [expenseSortDirection, setExpenseSortDirection] =
    useState<ExpenseTableSortDirection>("desc");
  const [isExpenseSubmitting, setIsExpenseSubmitting] = useState(false);
  const activeExpenseFilterMenuRef = useRef<HTMLDivElement | null>(null);
  const expensePersonFilterButtonRef = useRef<HTMLButtonElement | null>(null);
  const expenseCategoryFilterButtonRef = useRef<HTMLButtonElement | null>(null);

  function commitWorkflowDefinitions(nextWorkflowDefinitions: WorkflowDefinition[]) {
    setWorkflowDefinitions(nextWorkflowDefinitions);
    setSelectedWorkflowId((currentWorkflowId) => {
      if (
        currentWorkflowId &&
        nextWorkflowDefinitions.some(
          (workflowDefinition) => workflowDefinition.id === currentWorkflowId,
        )
      ) {
        return currentWorkflowId;
      }

      return nextWorkflowDefinitions[0]?.id ?? null;
    });
  }

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

  async function refreshExpenseRecords() {
    try {
      const records = await fetchJson<ExpenseRecord[]>("/api/expense/records");
      setExpenseRecords(records);
    } catch (error) {
      console.error("Failed to load expense records", error);
    }
  }

  const loadInitialDashboard = useEffectEvent(async () => {
    try {
      const [workflowDefinitionsResult, dashboard, expenseRecordsResult] =
        await Promise.all([
        fetchJson<WorkflowDefinition[]>("/api/workflow/definitions"),
        loadDashboardData(null),
        fetchJson<ExpenseRecord[]>("/api/expense/records"),
      ]);

      startTransition(() => {
        commitWorkflowDefinitions(workflowDefinitionsResult);
        commitDashboardState(
          dashboard.latestRun,
          dashboard.runHistory,
          dashboard.selectedRun,
          dashboard.selectedRunId,
        );
        setExpenseRecords(expenseRecordsResult);
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

  const dismissExpenseFilterMenuOnOutsideInteraction = useEffectEvent(
    (event: PointerEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) {
        if (event.key === "Escape") {
          setActiveExpenseFilterMenu(null);
          setActiveExpenseFilterMenuPosition(null);
        }

        return;
      }

      const eventTarget = event.target;
      const eventPath =
        typeof event.composedPath === "function" ? event.composedPath() : [];

      if (
        activeExpenseFilterMenuRef.current &&
        !eventPath.includes(activeExpenseFilterMenuRef.current) &&
        eventTarget instanceof Node &&
        !activeExpenseFilterMenuRef.current.contains(eventTarget)
      ) {
        setActiveExpenseFilterMenu(null);
        setActiveExpenseFilterMenuPosition(null);
      }
    },
  );

  useEffect(() => {
    if (!activeExpenseFilterMenu) {
      return;
    }

    document.addEventListener(
      "pointerdown",
      dismissExpenseFilterMenuOnOutsideInteraction,
    );
    document.addEventListener(
      "keydown",
      dismissExpenseFilterMenuOnOutsideInteraction,
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        dismissExpenseFilterMenuOnOutsideInteraction,
      );
      document.removeEventListener(
        "keydown",
        dismissExpenseFilterMenuOnOutsideInteraction,
      );
      };
  }, [activeExpenseFilterMenu]);

  useEffect(() => {
    if (!activeExpenseFilterMenu) {
      return;
    }

    const dismissOnViewportChange = () => {
      setActiveExpenseFilterMenu(null);
      setActiveExpenseFilterMenuPosition(null);
    };

    window.addEventListener("resize", dismissOnViewportChange);

    return () => {
      window.removeEventListener("resize", dismissOnViewportChange);
    };
  }, [activeExpenseFilterMenu]);

  async function handleRunWorkflow() {
    setIsSubmitting(true);

    try {
      const workflowId = selectedWorkflowId ?? workflowDefinitions[0]?.id ?? null;

      if (!workflowId) {
        throw new Error("No workflow definitions available");
      }

      const response = await fetch("/api/workflow/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workflowId,
        }),
      });
      const responseBody = (await response.json()) as
        | WorkflowRun
        | { message: string };

      if (!response.ok || "message" in responseBody) {
        throw new Error(
          "message" in responseBody
            ? responseBody.message
            : "Failed to queue workflow",
        );
      }

      const result = responseBody;
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

  async function handleExpenseSubmit() {
    setIsExpenseSubmitting(true);

    try {
      const response = await fetch("/api/expense/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(expenseForm),
      });
      const responseBody = (await response.json()) as
        | {
            message: string;
            personName: string;
            personTotalInCents: number;
          }
        | { message: string };

      if (!response.ok || !("personName" in responseBody)) {
        throw new Error(
          responseBody.message || "Failed to save expense entry",
        );
      }

      setExpenseSubmissionState({
        kind: "success",
        message: responseBody.message,
        personName: responseBody.personName,
        personTotalInCents: responseBody.personTotalInCents,
      });
      setExpenseForm(EMPTY_EXPENSE_FORM);
      await refreshExpenseRecords();
    } catch (error) {
      setExpenseSubmissionState({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unknown expense entry error",
      });
    } finally {
      setIsExpenseSubmitting(false);
    }
  }

  const displayedRun = selectedRun ?? latestRun;
  const displayedLogs = displayedRun?.logs ?? [];
  const selectedWorkflowDefinition =
    workflowDefinitions.find(
      (workflowDefinition) => workflowDefinition.id === selectedWorkflowId,
    ) ?? workflowDefinitions[0] ?? null;
  const expensePersonOptions = Array.from(
    new Set(expenseRecords.map((expenseRecord) => expenseRecord.personName)),
  ).sort((leftValue, rightValue) => leftValue.localeCompare(rightValue));
  const expenseCategoryOptions = Array.from(
    new Set(expenseRecords.map((expenseRecord) => expenseRecord.category)),
  ).sort((leftValue, rightValue) => leftValue.localeCompare(rightValue));
  const visibleExpensePersonOptions = expensePersonOptions.filter((personName) =>
    personName.toLowerCase().includes(expensePersonFilterQuery.toLowerCase()),
  );
  const visibleExpenseCategoryOptions = expenseCategoryOptions.filter(
    (categoryName) =>
      categoryName
        .toLowerCase()
        .includes(expenseCategoryFilterQuery.toLowerCase()),
  );
  const filteredExpenseRecords = expenseRecords
    .filter((expenseRecord) => {
      if (
        expensePersonFilter.length > 0 &&
        !expensePersonFilter.includes(expenseRecord.personName)
      ) {
        return false;
      }

      if (
        expenseCategoryFilter.length > 0 &&
        !expenseCategoryFilter.includes(expenseRecord.category)
      ) {
        return false;
      }

      return true;
    })
    .sort((leftRecord, rightRecord) => {
      let comparison = 0;

      if (expenseSortField === "id") {
        comparison = leftRecord.id - rightRecord.id;
      } else if (expenseSortField === "amountInCents") {
        comparison = leftRecord.amountInCents - rightRecord.amountInCents;
      } else if (expenseSortField === "timestamp") {
        comparison =
          new Date(leftRecord.timestamp).getTime() -
          new Date(rightRecord.timestamp).getTime();
      } else if (expenseSortField === "personName") {
        comparison = leftRecord.personName.localeCompare(rightRecord.personName);
      } else if (expenseSortField === "category") {
        comparison = leftRecord.category.localeCompare(rightRecord.category);
      }

      return expenseSortDirection === "asc" ? comparison : comparison * -1;
    });
  const filteredExpenseTotalInCents = filteredExpenseRecords.reduce(
    (runningTotal, expenseRecord) =>
      runningTotal + expenseRecord.amountInCents,
    0,
  );
  const filteredExpensePersonCount = new Set(
    filteredExpenseRecords.map((expenseRecord) => expenseRecord.personName),
  ).size;
  const filteredExpenseCategoryCount = new Set(
    filteredExpenseRecords.map((expenseRecord) => expenseRecord.category),
  ).size;

  function handleExpenseSort(nextSortField: ExpenseTableSortField) {
    if (expenseSortField === nextSortField) {
      setExpenseSortDirection((currentDirection) =>
        currentDirection === "asc" ? "desc" : "asc",
      );
      return;
    }

    setExpenseSortField(nextSortField);
    setExpenseSortDirection(
      nextSortField === "personName" || nextSortField === "category"
        ? "asc"
        : "desc",
    );
  }

  function toggleExpenseFilterValue(
    selectedValues: string[],
    nextValue: string,
  ) {
    if (selectedValues.includes(nextValue)) {
      return selectedValues.filter((selectedValue) => selectedValue !== nextValue);
    }

    return [...selectedValues, nextValue];
  }

  function openExpenseFilterMenu(filterMenu: Exclude<ExpenseFilterMenu, null>) {
    const triggerElement =
      filterMenu === "personName"
        ? expensePersonFilterButtonRef.current
        : expenseCategoryFilterButtonRef.current;

    if (!triggerElement) {
      setActiveExpenseFilterMenu(filterMenu);
      setActiveExpenseFilterMenuPosition(null);
      return;
    }

    const triggerRect = triggerElement.getBoundingClientRect();

    setActiveExpenseFilterMenu(filterMenu);
    setActiveExpenseFilterMenuPosition({
      top: triggerRect.bottom + 8,
      left: triggerRect.left - 12,
    });
  }

  function renderExpenseFilterMenu(filterMenu: Exclude<ExpenseFilterMenu, null>) {
    const isPersonFilter = filterMenu === "personName";
    const title = isPersonFilter ? "Filter Person" : "Filter Category";
    const query = isPersonFilter
      ? expensePersonFilterQuery
      : expenseCategoryFilterQuery;
    const options = isPersonFilter
      ? visibleExpensePersonOptions
      : visibleExpenseCategoryOptions;
    const selectedValues = isPersonFilter
      ? expensePersonFilter
      : expenseCategoryFilter;
    const selectedLabel =
      selectedValues.length > 0
        ? `${selectedValues.length} selected`
        : "All selected";

    return (
      <div
        ref={activeExpenseFilterMenuRef}
        className="fixed z-30 w-56 rounded-lg border border-white/10 bg-zinc-950 p-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
        style={{
          top: activeExpenseFilterMenuPosition?.top ?? 0,
          left: activeExpenseFilterMenuPosition?.left ?? 0,
        }}
      >
        <p className="text-[9px] uppercase tracking-[0.18em] text-white/35">
          {title}
        </p>
          <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-white/25">
            {selectedLabel}
          </p>
          <input
            value={query}
            onChange={(event) => {
              if (isPersonFilter) {
                setExpensePersonFilterQuery(event.target.value);
              return;
            }

            setExpenseCategoryFilterQuery(event.target.value);
          }}
          placeholder={isPersonFilter ? "Search person..." : "Search category..."}
          className="mt-2.5 w-full rounded-lg border border-white/10 bg-black px-2.5 py-2 text-[11px] text-white outline-none transition focus:border-white/30"
        />
        <div
          onWheel={(event) => {
            event.stopPropagation();
          }}
          className="mt-2.5 max-h-48 overflow-y-auto overscroll-contain rounded-lg border border-white/10"
        >
          <button
            type="button"
            onClick={() => {
              if (isPersonFilter) {
                setExpensePersonFilter([]);
                setExpensePersonFilterQuery("");
              } else {
                setExpenseCategoryFilter([]);
                setExpenseCategoryFilterQuery("");
              }
            }}
            className={`flex w-full items-center justify-between px-2.5 py-2 text-left text-[11px] transition hover:bg-white/5 ${
              selectedValues.length === 0
                ? "bg-white/[0.06] text-white"
                : "text-white/75"
            }`}
          >
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`flex h-3 w-3 items-center justify-center rounded-sm border ${
                  selectedValues.length === 0
                    ? "border-white/50 bg-white/[0.08]"
                    : "border-white/20"
                }`}
              >
                {selectedValues.length === 0 ? (
                  <span className="h-1.5 w-1.5 rounded-[1px] bg-white/70" />
                ) : null}
              </span>
              <span>All</span>
            </span>
          </button>
          {options.length > 0 ? (
            options.map((optionValue) => (
              <button
                key={optionValue}
                type="button"
                onClick={() => {
                  if (isPersonFilter) {
                    setExpensePersonFilter((currentValues) =>
                      toggleExpenseFilterValue(currentValues, optionValue),
                    );
                  } else {
                    setExpenseCategoryFilter((currentValues) =>
                      toggleExpenseFilterValue(currentValues, optionValue),
                    );
                  }
                }}
                className={`flex w-full items-center justify-between border-t border-white/10 px-2.5 py-2 text-left text-[11px] transition hover:bg-white/5 ${
                  selectedValues.includes(optionValue)
                    ? "bg-white/[0.06] text-white"
                    : "text-white/75"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={`flex h-3 w-3 items-center justify-center rounded-sm border ${
                      selectedValues.includes(optionValue)
                        ? "border-white/50 bg-white/[0.08]"
                        : "border-white/20"
                    }`}
                  >
                    {selectedValues.includes(optionValue) ? (
                      <span className="h-1.5 w-1.5 rounded-[1px] bg-white/70" />
                    ) : null}
                  </span>
                  <span>{formatTitleCase(optionValue)}</span>
                </span>
              </button>
            ))
          ) : (
            <div className="border-t border-white/10 px-2.5 py-2 text-[11px] text-white/40">
              No matching options.
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderExpenseSection() {
    return (
      <>
        <div className="mt-4 rounded-lg border border-white/10 bg-black/60 p-4">
          <div className="grid gap-4 xl:grid-cols-4">
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.18em] text-white/45">
                Person
              </span>
              <input
                value={expenseForm.personName}
                onChange={(event) => {
                  setExpenseForm((currentForm) => ({
                    ...currentForm,
                    personName: event.target.value,
                  }));
                }}
                className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none transition focus:border-white/30"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.18em] text-white/45">
                Category
              </span>
              <input
                value={expenseForm.category}
                onChange={(event) => {
                  setExpenseForm((currentForm) => ({
                    ...currentForm,
                    category: event.target.value,
                  }));
                }}
                className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none transition focus:border-white/30"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.18em] text-white/45">
                Amount
              </span>
              <input
                value={expenseForm.amount}
                onChange={(event) => {
                  setExpenseForm((currentForm) => ({
                    ...currentForm,
                    amount: event.target.value,
                  }));
                }}
                inputMode="decimal"
                className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none transition focus:border-white/30"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.18em] text-white/45">
                Item
              </span>
              <input
                value={expenseForm.item}
                onChange={(event) => {
                  setExpenseForm((currentForm) => ({
                    ...currentForm,
                    item: event.target.value,
                  }));
                }}
                className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none transition focus:border-white/30"
              />
            </label>
          </div>

          <label className="mt-4 block space-y-2">
            <span className="text-xs uppercase tracking-[0.18em] text-white/45">
              Notes
            </span>
            <textarea
              value={expenseForm.notes}
              onChange={(event) => {
                setExpenseForm((currentForm) => ({
                  ...currentForm,
                  notes: event.target.value,
                }));
              }}
              rows={4}
              className="w-full rounded-lg border border-white/10 bg-black px-3 py-3 text-sm text-white outline-none transition focus:border-white/30"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={() => {
            void handleExpenseSubmit();
          }}
          disabled={isExpenseSubmitting}
          className="mt-4 rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isExpenseSubmitting ? "Saving..." : "Add Expense"}
        </button>

        <div className="mt-4 space-y-3">
          <h3 className="text-sm uppercase tracking-[0.18em] text-white/45">
            Submission Status
          </h3>
          {expenseSubmissionState.kind === "success" ? (
            <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-100">
              <p>{expenseSubmissionState.message}</p>
              {expenseSubmissionState.personName &&
              typeof expenseSubmissionState.personTotalInCents === "number" ? (
                <p className="mt-2 text-white/75">
                  {expenseSubmissionState.personName} total:{" "}
                  {formatPeso(expenseSubmissionState.personTotalInCents)}
                </p>
              ) : null}
            </div>
          ) : expenseSubmissionState.kind === "error" ? (
            <div className="rounded-lg border border-red-400/30 bg-red-400/5 px-4 py-3 text-sm text-red-200">
              {expenseSubmissionState.message}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-white/10 px-4 py-3 text-sm text-white/50">
              No expense submitted yet.
            </div>
          )}
        </div>

        <div className="mt-6 space-y-3">
          <h3 className="text-sm uppercase tracking-[0.18em] text-white/45">
            Stored Expense Records
          </h3>
          {expenseRecords.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-white/10">
              <table className="min-w-full border-collapse text-left text-xs text-white/80">
                <thead className="bg-zinc-950 text-[10px] uppercase tracking-[0.18em] text-white/45">
                  <tr>
                    <th className="px-4 py-3 font-medium">Visible Records</th>
                    <th className="px-4 py-3 font-medium">Filtered Total</th>
                    <th className="px-4 py-3 font-medium">Persons</th>
                    <th className="px-4 py-3 font-medium">Categories</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-white/10 align-top">
                    <td className="px-4 py-3 font-mono text-xs text-white/85">
                      {filteredExpenseRecords.length}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-white/85">
                      {formatPesoForTable(filteredExpenseTotalInCents)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-white/85">
                      {filteredExpensePersonCount}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-white/85">
                      {filteredExpenseCategoryCount}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : null}
          {expenseRecords.length > 0 && filteredExpenseRecords.length > 0 ? (
            <div className="relative overflow-visible rounded-lg border border-white/10">
              <div className="max-h-[31rem] overflow-auto overscroll-contain rounded-lg">
                <table className="min-w-full border-collapse text-left text-xs text-white/80">
                  <thead className="sticky top-0 z-10 bg-zinc-950 text-[10px] uppercase tracking-[0.18em] text-white/45">
                    <tr>
                      <th className="px-4 py-3 font-medium">
                        <button
                          type="button"
                          onClick={() => {
                            handleExpenseSort("id");
                          }}
                          className="flex items-center gap-1.5 transition hover:text-white"
                        >
                          <span>ID</span>
                          <SortDirectionIndicator
                            isActive={expenseSortField === "id"}
                            direction={
                              expenseSortField === "id"
                                ? expenseSortDirection
                                : "desc"
                            }
                          />
                        </button>
                      </th>
                      <th className="relative px-4 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              handleExpenseSort("personName");
                            }}
                            className="flex items-center gap-1.5 transition hover:text-white"
                          >
                            <span>Person</span>
                            <SortDirectionIndicator
                              isActive={expenseSortField === "personName"}
                              direction={
                                expenseSortField === "personName"
                                  ? expenseSortDirection
                                  : "asc"
                              }
                            />
                          </button>
                          <button
                            ref={expensePersonFilterButtonRef}
                            type="button"
                            onClick={() => {
                              if (activeExpenseFilterMenu === "personName") {
                                setActiveExpenseFilterMenu(null);
                                setActiveExpenseFilterMenuPosition(null);
                                return;
                              }

                              openExpenseFilterMenu("personName");
                            }}
                            className={`transition hover:text-white ${
                              expensePersonFilter.length > 0
                                ? "text-white/75"
                                : "text-white/35"
                            }`}
                          >
                            <FilterIndicator />
                          </button>
                        </div>
                      </th>
                      <th className="relative px-4 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              handleExpenseSort("category");
                            }}
                            className="flex items-center gap-1.5 transition hover:text-white"
                          >
                            <span>Category</span>
                            <SortDirectionIndicator
                              isActive={expenseSortField === "category"}
                              direction={
                                expenseSortField === "category"
                                  ? expenseSortDirection
                                  : "asc"
                              }
                            />
                          </button>
                          <button
                            ref={expenseCategoryFilterButtonRef}
                            type="button"
                            onClick={() => {
                              if (activeExpenseFilterMenu === "category") {
                                setActiveExpenseFilterMenu(null);
                                setActiveExpenseFilterMenuPosition(null);
                                return;
                              }

                              openExpenseFilterMenu("category");
                            }}
                            className={`transition hover:text-white ${
                              expenseCategoryFilter.length > 0
                                ? "text-white/75"
                                : "text-white/35"
                            }`}
                          >
                            <FilterIndicator />
                          </button>
                        </div>
                      </th>
                      <th className="px-4 py-3 font-medium">
                        <button
                          type="button"
                          onClick={() => {
                            handleExpenseSort("amountInCents");
                          }}
                          className="flex items-center gap-1.5 transition hover:text-white"
                        >
                          <span>Amount</span>
                          <SortDirectionIndicator
                            isActive={expenseSortField === "amountInCents"}
                            direction={
                              expenseSortField === "amountInCents"
                                ? expenseSortDirection
                                : "desc"
                            }
                          />
                        </button>
                      </th>
                      <th className="px-4 py-3 font-medium">Item</th>
                      <th className="px-4 py-3 font-medium">Notes</th>
                      <th className="px-4 py-3 font-medium">
                        <button
                          type="button"
                          onClick={() => {
                            handleExpenseSort("timestamp");
                          }}
                          className="flex items-center gap-1.5 transition hover:text-white"
                        >
                          <span>Timestamp</span>
                          <SortDirectionIndicator
                            isActive={expenseSortField === "timestamp"}
                            direction={
                              expenseSortField === "timestamp"
                                ? expenseSortDirection
                                : "desc"
                            }
                          />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenseRecords.map((expenseRecord) => (
                      <tr
                        key={expenseRecord.id}
                        className="border-t border-white/10 align-top"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-white/55">
                          {expenseRecord.id}
                        </td>
                        <td className="px-4 py-3">
                          {formatTitleCase(expenseRecord.personName)}
                        </td>
                        <td className="px-4 py-3">
                          {formatTitleCase(expenseRecord.category)}
                        </td>
                        <td className="px-4 py-3">
                          {formatPesoForTable(expenseRecord.amountInCents)}
                        </td>
                        <td className="px-4 py-3">
                          {formatTitleCase(expenseRecord.item)}
                        </td>
                        <td className="px-4 py-3">
                          {formatSentenceCase(expenseRecord.notes)}
                        </td>
                        <td className="px-4 py-3 text-xs text-white/55">
                          {formatExpenseTimestamp(expenseRecord.timestamp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            ) : expenseRecords.length > 0 ? (
              <div className="rounded-lg border border-dashed border-white/10 px-4 py-3 text-sm text-white/50">
                No records match the selected person and category filters.
              </div>
          ) : (
            <div className="rounded-lg border border-dashed border-white/10 px-4 py-3 text-sm text-white/50">
              No stored expense records yet.
            </div>
          )}
          {activeExpenseFilterMenu ? renderExpenseFilterMenu(activeExpenseFilterMenu) : null}
        </div>
      </>
    );
  }

  function renderWorkflowSection() {
    return (
      <>
        <div className="mt-4 rounded-lg border border-white/10 px-4 py-3 text-sm text-white/75">
          <label
            htmlFor="workflow-definition"
            className="text-xs uppercase tracking-[0.18em] text-white/45"
          >
            Workflow Definition
          </label>
          <select
            id="workflow-definition"
            value={selectedWorkflowId ?? ""}
            onChange={(event) => {
              setSelectedWorkflowId(event.target.value);
            }}
            disabled={isSubmitting || workflowDefinitions.length === 0}
            className="mt-3 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none transition focus:border-white/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {workflowDefinitions.length > 0 ? (
              workflowDefinitions.map((workflowDefinition) => (
                <option key={workflowDefinition.id} value={workflowDefinition.id}>
                  {workflowDefinition.name}
                </option>
              ))
            ) : (
              <option value="">Loading workflow definitions...</option>
            )}
          </select>
          <p className="mt-3 text-sm text-white/55">
            {selectedWorkflowDefinition?.description ??
              "Loading workflow definitions..."}
          </p>
        </div>

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
          disabled={isSubmitting || workflowDefinitions.length === 0}
          className="mt-4 rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting
            ? "Queueing..."
            : selectedWorkflowDefinition
              ? `Run ${selectedWorkflowDefinition.name}`
              : "Run Workflow"}
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

  function renderWinterSection() {
    return (
      <div className="mt-4 rounded-lg border border-dashed border-white/10 px-4 py-3 text-sm text-white/50">
        Winter is not wired in yet. The workflow and logging system is now the stable base to build it on.
      </div>
    );
  }

  function renderSection(sectionId: string) {
    if (sectionId === "expenses") {
      return renderExpenseSection();
    }

    if (sectionId === "workflows") {
      return renderWorkflowSection();
    }

    if (sectionId === "logs") {
      return renderLogsSection();
    }

    return renderWinterSection();
  }

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white sm:px-8 sm:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-7xl flex-col gap-10">
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
