import { getServerSession } from "next-auth"
import { authOptions } from "./auth"

export async function requireAuth() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    throw new Error("Unauthorized")
  }
  return session.user
}

export async function requirePermission(permission: string) {
  const user = await requireAuth()
  if (!user.rolePermissions?.includes(permission)) {
    console.error(`Permission denied: User ${user.id} attempted to access required permission: ${permission}`)
    throw new Error("Forbidden")
  }
  return user
}

export async function requireOrgType(type: 'BROKER' | 'CARRIER' | 'SHIPPER') {
  const user = await requireAuth()
  if (user.type !== type) {
    throw new Error("Forbidden: Invalid organization type")
  }
  return user
}
