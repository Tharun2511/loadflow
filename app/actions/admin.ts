"use server"

import { PrismaClient } from "@prisma/client"
import { requirePermission } from "@/lib/rbac"
import { PERMISSION_CATALOG } from "@/lib/permissions"
import { revalidatePath } from "next/cache"

const prisma = new PrismaClient()

const VALID_PERMISSIONS = new Set(PERMISSION_CATALOG.map((p) => p.key))

export async function createRole(data: { name: string, permissions: string[] }) {
  const user = await requirePermission('staff.manage')

  if (!user.organizationId) throw new Error("Must belong to an organization")

  // Only allow permissions that exist in the catalog.
  const permissions = data.permissions.filter((p) => VALID_PERMISSIONS.has(p as never))

  await prisma.role.create({
    data: {
      name: data.name,
      permissions: JSON.stringify(permissions),
      organizationId: user.organizationId
    }
  })

  revalidatePath('/dashboard/admin')
  return { success: true }
}

export async function deleteRole(roleId: string) {
  const user = await requirePermission('staff.manage')
  if (!user.organizationId) throw new Error("Must belong to an organization")

  const role = await prisma.role.findFirst({
    where: { id: roleId, organizationId: user.organizationId },
    include: { _count: { select: { users: true } } },
  })
  if (!role) throw new Error("Role not found")
  if (role.name === "Admin") throw new Error("The Admin role cannot be deleted")
  if (role._count.users > 0) throw new Error("Cannot delete a role that is still assigned to staff")

  await prisma.role.delete({ where: { id: roleId } })
  revalidatePath('/dashboard/admin')
  return { success: true }
}

export async function removeStaff(userId: string) {
  const user = await requirePermission('staff.manage')
  if (!user.organizationId) throw new Error("Must belong to an organization")
  if (userId === user.id) throw new Error("You cannot remove yourself")

  const target = await prisma.user.findFirst({
    where: { id: userId, organizationId: user.organizationId },
  })
  if (!target) throw new Error("Staff member not found")

  await prisma.user.delete({ where: { id: userId } })
  revalidatePath('/dashboard/admin')
  return { success: true }
}
