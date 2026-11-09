import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

function getDatasourceUrl(): string | undefined {
  const isTest =
    process.env.NODE_ENV === "test" ||
    process.env.IS_TEST_SUITE === "true";

  if (isTest) {
    if (process.env.TEST_DATABASE_URL) {
      return process.env.TEST_DATABASE_URL;
    }
    // If running tests without TEST_DATABASE_URL, refuse to fall back to DATABASE_URL
    if (process.env.NODE_ENV === "test") {
      throw new Error(
        "FATAL: NODE_ENV=test requires TEST_DATABASE_URL. Refusing to touch DATABASE_URL in test mode."
      );
    }
  }

  return process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
}

const datasourceUrl = getDatasourceUrl();

export const prisma =
  globalThis.prismaGlobal ??
  new PrismaClient({
    datasources: datasourceUrl ? { db: { url: datasourceUrl } } : undefined,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}

export default prisma;
