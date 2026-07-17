import { getServerSession } from "next-auth"
import { authOptions } from "./auth"

// Centralized security logging for denied attempts.
// Brief allows console/log file; console.error is captured by Vercel logs.
export function logDenied(reason: string, details: Record<string, unknown>) {
  console.error(
    `[RBAC DENIED] ${reason} ${JSON.stringify(details)} @ ${new Date().toISOString()}`
  )
}

export async function requireAuth() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    logDenied("Unauthenticated request", {})
    throw new Error("Unauthorized")
  }
  return session.user
}

export async function requirePermission(permission: string) {
  const user = await requireAuth()
  if (!user.rolePermissions?.includes(permission)) {
    logDenied("Missing permission", { userId: user.id, permission, type: user.type })
    throw new Error("Forbidden")
  }
  return user
}

export async function requireOrgType(type: 'BROKER' | 'CARRIER' | 'SHIPPER') {
  const user = await requireAuth()
  if (user.type !== type) {
    logDenied("Wrong org type", { userId: user.id, expected: type, actual: user.type })
    throw new Error("Forbidden: Invalid organization type")
  }
  return user
}

// Helper to enforce object-level scoping (e.g. a load must belong to the
// caller's org) and log denied cross-org access attempts consistently.
export function requireOwnership(
  ok: boolean,
  ctx: { userId: string; resource: string; resourceId: string }
) {
  if (!ok) {
    logDenied("Cross-scope access", ctx)
    throw new Error("Forbidden: Not authorized for this resource")
  }
}
