-- CreateTable
CREATE TABLE "WorkflowRun" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TEXT NOT NULL,
    "finishedAt" TEXT,
    "error" TEXT
);

INSERT INTO "WorkflowRun" ("name", "status", "startedAt", "finishedAt", "error")
SELECT
    'Legacy log import',
    CASE
        WHEN SUM(CASE WHEN "status" = 'error' THEN 1 ELSE 0 END) > 0 THEN 'failed'
        ELSE 'success'
    END,
    COALESCE(MIN(NULLIF("timestamp", '')), CURRENT_TIMESTAMP),
    COALESCE(MAX(NULLIF("timestamp", '')), CURRENT_TIMESTAMP),
    CASE
        WHEN SUM(CASE WHEN "status" = 'error' THEN 1 ELSE 0 END) > 0 THEN 'Migrated legacy logs include error entries'
        ELSE NULL
    END
FROM "Log"
HAVING COUNT(*) > 0;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Log" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "runId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,
    CONSTRAINT "Log_runId_fkey" FOREIGN KEY ("runId") REFERENCES "WorkflowRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Log" ("id", "runId", "message", "status", "timestamp")
SELECT
    "id",
    COALESCE(
        (SELECT "id" FROM "WorkflowRun" ORDER BY "id" ASC LIMIT 1),
        1
    ),
    "message",
    "status",
    COALESCE(NULLIF("timestamp", ''), CURRENT_TIMESTAMP)
FROM "Log";
DROP TABLE "Log";
ALTER TABLE "new_Log" RENAME TO "Log";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
