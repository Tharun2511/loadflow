import { PrismaClient } from "@prisma/client"

// A single shared PrismaClient for the whole app. Creating a new client per
// module (or per hot-reload in dev) exhausts the database connection pool on
// serverless (Neon), which surfaces as intermittent "Can't reach database
// server" errors and pages that fail to load. Reusing one instance fixes that.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
