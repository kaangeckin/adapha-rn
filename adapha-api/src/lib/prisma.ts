import { PrismaClient } from "@prisma/client";

// Ortamına göre Prisma'nın tekrar tekrar instantiate edilmesini engeller
// ve tek bir bağlantı havuzu (connection pool) kullanılmasını sağlar.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
