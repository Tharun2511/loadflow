"use server"

import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/rbac"
import { revalidatePath } from "next/cache"

// Carrier compliance record CRUD (upsert). Gated by `compliance.manage`
// and scoped to the caller's own carrier organization.
export async function updateCompliance(data: {
  insuranceExpiry: string // ISO date string from a <input type="date">
  mcDotStatus: string
  equipmentTypes: string[]
  commodityTypes: string[]
}) {
  const user = await requirePermission("compliance.manage")

  if (user.type !== "CARRIER" || !user.organizationId) {
    throw new Error("Only carriers can manage a compliance record")
  }

  const expiry = new Date(data.insuranceExpiry)
  if (isNaN(expiry.getTime())) throw new Error("Invalid insurance expiry date")

  await prisma.carrierCompliance.upsert({
    where: { carrierOrgId: user.organizationId },
    update: {
      insuranceExpiry: expiry,
      mcDotStatus: data.mcDotStatus,
      equipmentTypes: JSON.stringify(data.equipmentTypes),
      commodityTypes: JSON.stringify(data.commodityTypes),
    },
    create: {
      carrierOrgId: user.organizationId,
      insuranceExpiry: expiry,
      mcDotStatus: data.mcDotStatus,
      equipmentTypes: JSON.stringify(data.equipmentTypes),
      commodityTypes: JSON.stringify(data.commodityTypes),
    },
  })

  revalidatePath("/dashboard/carrier")
  return { success: true }
}
