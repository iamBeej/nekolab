import { PrismaClient } from "@prisma/client";

const globalForPrismaRuntime = globalThis;

export const prismaRuntime =
  globalForPrismaRuntime.prismaRuntime ??
  new PrismaClient(
    process.env.DATABASE_URL
      ? {
          datasources: {
            db: {
              url: process.env.DATABASE_URL,
            },
          },
        }
      : undefined,
  );

if (process.env.NODE_ENV !== "production") {
  globalForPrismaRuntime.prismaRuntime = prismaRuntime;
}
