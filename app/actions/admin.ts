"use server"

import { PrismaClient } from "@prisma/client"
import { requirePermission } from "@/lib/rbac"
import { revalidatePath } from "next/cache"

const prisma = new PrismaClient()

export async function createRole(data: { name: string, permissions: string[] }) {
  const user = await requirePermission('staff.manage')
  
  if (!user.organizationId) throw new Error("Must belong to an organization")

  await prisma.role.create({
    data: {
      name: data.name,
      permissions: JSON.stringify(data.permissions),
      organizationId: user.organizationId
    }
  })

  revalidatePath('/dashboard/admin')
  return { success: true }
}
