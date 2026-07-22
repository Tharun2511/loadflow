"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission, requireOwnership } from "@/lib/rbac"
import { revalidatePath } from "next/cache"

async function addAuditLog(loadId: string, oldStatus: string, newStatus: string, userId: string) {
  await prisma.loadAuditLog.create({
    data: { loadId, oldStatus, newStatus, changedById: userId }
  })
}

type ComplianceRecord = {
  mcDotStatus: string
  insuranceExpiry: Date
  equipmentTypes: string
  commodityTypes: string
} | null

// Evaluate a carrier's compliance for a specific load.
// Returns a human-readable reason when the carrier is NOT compliant.
function evaluateCompliance(
  compliance: ComplianceRecord,
  load: { equipmentType: string | null; commodityType: string | null }
): { compliant: boolean; reason: string | null } {
  if (!compliance) return { compliant: false, reason: "Carrier has no compliance record on file" }

  const reasons: string[] = []
  if (compliance.mcDotStatus !== "ACTIVE") {
    reasons.push(`MC/DOT authority is ${compliance.mcDotStatus}, not ACTIVE`)
  }
  if (compliance.insuranceExpiry <= new Date()) {
    reasons.push(`Insurance expired on ${compliance.insuranceExpiry.toLocaleDateString()}`)
  }
  if (load.equipmentType) {
    const equipment: string[] = JSON.parse(compliance.equipmentTypes || "[]")
    if (!equipment.includes(load.equipmentType)) {
      reasons.push(`Not approved for ${load.equipmentType} equipment`)
    }
  }
  if (load.commodityType) {
    const commodities: string[] = JSON.parse(compliance.commodityTypes || "[]")
    if (!commodities.includes(load.commodityType)) {
      reasons.push(`Not approved for ${load.commodityType} commodity`)
    }
  }

  return reasons.length > 0
    ? { compliant: false, reason: reasons.join("; ") }
    : { compliant: true, reason: null }
}

export async function createLoad(data: {
  origin: string
  destination: string
  shipperId: string
  equipmentType?: string
  commodityType?: string
}) {
  const user = await requirePermission('load.create')

  if (user.type !== 'BROKER' || !user.organizationId) {
    throw new Error("Only brokers can create loads")
  }

  const load = await prisma.load.create({
    data: {
      origin: data.origin,
      destination: data.destination,
      status: 'POSTED',
      equipmentType: data.equipmentType || null,
      commodityType: data.commodityType || null,
      shipperId: data.shipperId,
      brokerOrgId: user.organizationId
    }
  })

  await addAuditLog(load.id, '', 'POSTED', user.id)
  revalidatePath('/dashboard/broker')
  return { success: true, loadId: load.id }
}

export async function assignCarrier(loadId: string, carrierOrgId: string) {
  const user = await requirePermission('load.assign_carrier')

  const load = await prisma.load.findUnique({ where: { id: loadId } })
  if (!load) throw new Error("Load not found")
  requireOwnership(load.brokerOrgId === user.organizationId, {
    userId: user.id, resource: "load", resourceId: loadId,
  })
  if (load.status !== 'POSTED') throw new Error("Load must be in POSTED state to assign carrier")

  // Compliance check: insurance, authority, approved equipment & commodity.
  const compliance = await prisma.carrierCompliance.findUnique({ where: { carrierOrgId } })
  const { compliant, reason } = evaluateCompliance(compliance, load)

  await prisma.load.update({
    where: { id: loadId },
    data: {
      carrierOrgId,
      status: 'CARRIER_ASSIGNED',
      carrierAccepted: false,
      complianceFlag: !compliant,
      complianceFlagReason: compliant ? null : reason,
    }
  })

  await addAuditLog(loadId, load.status, 'CARRIER_ASSIGNED', user.id)
  revalidatePath('/dashboard/broker')
  return { success: true, flagged: !compliant, reason }
}

export async function overrideCompliance(loadId: string) {
  const user = await requirePermission('load.override_compliance_flag')

  const load = await prisma.load.findUnique({ where: { id: loadId } })
  if (!load) throw new Error("Load not found")
  requireOwnership(load.brokerOrgId === user.organizationId, {
    userId: user.id, resource: "load", resourceId: loadId,
  })

  await prisma.load.update({
    where: { id: loadId },
    data: { complianceFlag: false, complianceFlagReason: null }
  })

  // Implicitly unblocks the load; broker accepts the liability of the override.
  revalidatePath('/dashboard/broker')
  return { success: true }
}

// Carrier accepts an assigned load, unblocking rate negotiation.
export async function acceptLoad(loadId: string) {
  const user = await requirePermission('load.accept_decline')

  const load = await prisma.load.findUnique({ where: { id: loadId } })
  if (!load) throw new Error("Load not found")
  requireOwnership(user.type === "CARRIER" && load.carrierOrgId === user.organizationId, {
    userId: user.id, resource: "load", resourceId: loadId,
  })
  if (load.status !== 'CARRIER_ASSIGNED') throw new Error("Only assigned loads can be accepted")
  if (load.complianceFlag) throw new Error("Cannot accept a flagged load until compliance is resolved")

  await prisma.load.update({ where: { id: loadId }, data: { carrierAccepted: true } })
  revalidatePath('/dashboard/carrier')
  return { success: true }
}

// Carrier declines an assigned load; it returns to the board as POSTED.
export async function declineLoad(loadId: string) {
  const user = await requirePermission('load.accept_decline')

  const load = await prisma.load.findUnique({ where: { id: loadId } })
  if (!load) throw new Error("Load not found")
  requireOwnership(user.type === "CARRIER" && load.carrierOrgId === user.organizationId, {
    userId: user.id, resource: "load", resourceId: loadId,
  })
  if (load.status !== 'CARRIER_ASSIGNED') throw new Error("Only assigned loads can be declined")

  await prisma.load.update({
    where: { id: loadId },
    data: {
      carrierOrgId: null,
      carrierAccepted: false,
      status: 'POSTED',
      complianceFlag: false,
      complianceFlagReason: null,
    }
  })

  await addAuditLog(loadId, 'CARRIER_ASSIGNED', 'POSTED', user.id)
  revalidatePath('/dashboard/carrier')
  return { success: true }
}

export async function proposeRate(loadId: string, baseRate: string, accessorials: string) {
  // Called by a Carrier to propose (or re-propose) a rate.
  const user = await requireAuth()

  const load = await prisma.load.findUnique({ where: { id: loadId } })
  if (!load) throw new Error("Load not found")

  // Ensure authorized (Broker owning load or Carrier assigned to it).
  if (user.type === 'BROKER') {
    requireOwnership(load.brokerOrgId === user.organizationId, {
      userId: user.id, resource: "load", resourceId: loadId,
    })
  } else if (user.type === 'CARRIER') {
    requireOwnership(load.carrierOrgId === user.organizationId, {
      userId: user.id, resource: "load", resourceId: loadId,
    })
    if (!load.carrierAccepted) throw new Error("Accept the load before proposing a rate")
  } else {
    throw new Error("Not authorized")
  }

  if (load.complianceFlag) {
    throw new Error("Cannot propose rate on a flagged load. Resolve compliance first.")
  }

  const lastRate = await prisma.rateConfirmation.findFirst({
    where: { loadId },
    orderBy: { version: 'desc' }
  })

  const nextVersion = lastRate ? lastRate.version + 1 : 1

  await prisma.rateConfirmation.create({
    data: {
      loadId,
      version: nextVersion,
      baseRate: parseFloat(baseRate),
      accessorials: parseFloat(accessorials),
      status: 'PENDING'
    }
  })

  revalidatePath('/dashboard')
  return { success: true }
}

export async function confirmRate(rateId: string) {
  const user = await requirePermission('rate.confirm')

  const rate = await prisma.rateConfirmation.findUnique({ where: { id: rateId }, include: { load: true } })
  if (!rate) throw new Error("Rate not found")

  requireOwnership(rate.load.brokerOrgId === user.organizationId, {
    userId: user.id, resource: "rate", resourceId: rateId,
  })
  if (rate.load.complianceFlag) throw new Error("Load is flagged for non-compliance")

  await prisma.$transaction([
    prisma.rateConfirmation.update({ where: { id: rateId }, data: { status: 'CONFIRMED' } }),
    prisma.load.update({ where: { id: rate.loadId }, data: { status: 'RATE_CONFIRMED' } })
  ])

  await addAuditLog(rate.loadId, rate.load.status, 'RATE_CONFIRMED', user.id)
  revalidatePath('/dashboard/broker')
  return { success: true }
}

export async function updateLoadStatus(loadId: string, newStatus: string) {
  const user = await requirePermission('load.update_status')

  const load = await prisma.load.findUnique({ where: { id: loadId } })
  if (!load) throw new Error("Load not found")

  if (user.type === 'CARRIER') {
    requireOwnership(load.carrierOrgId === user.organizationId, {
      userId: user.id, resource: "load", resourceId: loadId,
    })
  } else if (user.type === 'BROKER') {
    requireOwnership(load.brokerOrgId === user.organizationId, {
      userId: user.id, resource: "load", resourceId: loadId,
    })
  }

  if (load.complianceFlag) throw new Error("Cannot progress flagged load")

  // Enforce the load state machine.
  const allowedTransitions: Record<string, string[]> = {
    'RATE_CONFIRMED': ['DISPATCHED'],
    'DISPATCHED': ['IN_TRANSIT'],
    'IN_TRANSIT': ['DELIVERED'],
    'DELIVERED': ['POD_VERIFIED'],
    'POD_VERIFIED': ['CLOSED']
  }

  if (!allowedTransitions[load.status]?.includes(newStatus)) {
    throw new Error(`Invalid state transition from ${load.status} to ${newStatus}`)
  }

  await prisma.load.update({ where: { id: loadId }, data: { status: newStatus } })
  await addAuditLog(loadId, load.status, newStatus, user.id)

  revalidatePath('/dashboard')
  return { success: true }
}

// Upload a proof-of-delivery file (stored as a base64 data-URL) for a
// delivered load. Advances DELIVERED -> POD_VERIFIED on success.
export async function uploadPod(data: {
  loadId: string
  fileName: string
  fileType: string
  dataUrl: string
}) {
  const user = await requirePermission('pod.upload')

  const load = await prisma.load.findUnique({ where: { id: data.loadId } })
  if (!load) throw new Error("Load not found")
  requireOwnership(user.type === "CARRIER" && load.carrierOrgId === user.organizationId, {
    userId: user.id, resource: "load", resourceId: data.loadId,
  })
  if (load.status !== 'DELIVERED' && load.status !== 'POD_VERIFIED') {
    throw new Error("POD can only be uploaded once a load is DELIVERED")
  }

  await prisma.pod.upsert({
    where: { loadId: data.loadId },
    update: { fileName: data.fileName, fileType: data.fileType, dataUrl: data.dataUrl, uploadedById: user.id },
    create: {
      loadId: data.loadId,
      fileName: data.fileName,
      fileType: data.fileType,
      dataUrl: data.dataUrl,
      uploadedById: user.id,
    },
  })

  if (load.status === 'DELIVERED') {
    await prisma.load.update({ where: { id: data.loadId }, data: { status: 'POD_VERIFIED' } })
    await addAuditLog(data.loadId, 'DELIVERED', 'POD_VERIFIED', user.id)
  }

  revalidatePath('/dashboard/carrier')
  return { success: true }
}
