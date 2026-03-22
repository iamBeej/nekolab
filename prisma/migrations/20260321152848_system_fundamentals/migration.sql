-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Log" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "runId" INTEGER NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'info',
    "message" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Log_runId_fkey" FOREIGN KEY ("runId") REFERENCES "WorkflowRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Log" ("id", "level", "message", "runId", "timestamp")
SELECT
    "id",
    CASE
        WHEN "status" = 'error' THEN 'error'
        ELSE 'info'
    END,
    "message",
    "runId",
    COALESCE(NULLIF("timestamp", ''), CURRENT_TIMESTAMP)
FROM "Log";
DROP TABLE "Log";
ALTER TABLE "new_Log" RENAME TO "Log";
CREATE INDEX "Log_runId_id_idx" ON "Log"("runId", "id");
CREATE TABLE "new_WorkflowRun" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "error" TEXT
);
INSERT INTO "new_WorkflowRun" ("createdAt", "error", "finishedAt", "id", "name", "startedAt", "status", "updatedAt")
SELECT
    COALESCE(NULLIF("startedAt", ''), CURRENT_TIMESTAMP),
    "error",
    NULLIF("finishedAt", ''),
    "id",
    "name",
    NULLIF("startedAt", ''),
    "status",
    COALESCE(NULLIF("finishedAt", ''), NULLIF("startedAt", ''), CURRENT_TIMESTAMP)
FROM "WorkflowRun";
DROP TABLE "WorkflowRun";
ALTER TABLE "new_WorkflowRun" RENAME TO "WorkflowRun";
CREATE INDEX "WorkflowRun_status_createdAt_idx" ON "WorkflowRun"("status", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
