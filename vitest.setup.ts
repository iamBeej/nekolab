import path from "node:path";

process.env.DATABASE_URL = `file:${path.join(process.cwd(), "prisma", "vitest.db")}`;
