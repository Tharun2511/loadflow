"use server"

import { PrismaClient } from "@prisma/client"
import { requireAuth, requirePermission, requireOrgType } from "@/lib/rbac"
import { revalidatePath } from "next/cache"

const prisma = new PrismaClient()

async function addAuditLog(loadId: string, oldStatus: string, newStatus: string, userId: string) {
  await prisma.loadAuditLog.create({
    data: { loadId, oldStatus, newStatus, changedById: userId }
  })
}

export async function createLoad(data: { origin: string, destination: string, shipperId: string }) {
  const user = await requirePermission('load.create')
  
  if (user.type !== 'BROKER' || !user.organizationId) {
    throw new Error("Only brokers can create loads")
  }

  const load = await prisma.load.create({
    data: {
      origin: data.origin,
      destination: data.destination,
      status: 'POSTED',
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
  if (load.brokerOrgId !== user.organizationId) throw new Error("Not authorized for this load")
  if (load.status !== 'POSTED') throw new Error("Load must be in POSTED state to assign carrier")

  // Check Carrier Compliance
  const compliance = await prisma.carrierCompliance.findUnique({ where: { carrierOrgId } })
  const isCompliant = compliance && compliance.mcDotStatus === 'ACTIVE' && compliance.insuranceExpiry > new Date()
  
  const updatedLoad = await prisma.load.update({
    where: { id: loadId },
    data: {
      carrierOrgId,
      status: 'CARRIER_ASSIGNED',
      complianceFlag: !isCompliant // Auto-flag if non-compliant
    }
  })

  await addAuditLog(loadId, load.status, 'CARRIER_ASSIGNED', user.id)
  revalidatePath('/dashboard/broker')
  return { success: true, flagged: !isCompliant }
}

export async function overrideCompliance(loadId: string) {
  const user = await requirePermission('load.override_compliance_flag')
  
  const load = await prisma.load.findUnique({ where: { id: loadId } })
  if (!load || load.brokerOrgId !== user.organizationId) throw new Error("Not authorized")
  
  await prisma.load.update({
    where: { id: loadId },
    data: { complianceFlag: false }
  })
  
  // Implicitly unblocks the load, no state change here, just flag removal
  revalidatePath('/dashboard/broker')
  return { success: true }
}

export async function proposeRate(loadId: string, baseRate: string, accessorials: string) {
  // Can be called by Carrier to propose or Broker to send confirmation
  const user = await requireAuth()
  
  const load = await prisma.load.findUnique({ where: { id: loadId } })
  if (!load) throw new Error("Load not found")

  // Ensure authorized (Broker owning load or Carrier assigned to it)
  if (user.type === 'BROKER' && load.brokerOrgId !== user.organizationId) throw new Error("Not authorized")
  if (user.type === 'CARRIER' && load.carrierOrgId !== user.organizationId) throw new Error("Not authorized")

  if (load.complianceFlag) {
    throw new Error("Cannot propose rate on a flagged load. Resolve compliance first.")
  }

  // Get current version
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
  
  if (rate.load.brokerOrgId !== user.organizationId) throw new Error("Not authorized")
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
  
  // Basic check: carriers can only update their own assigned loads
  if (user.type === 'CARRIER' && load.carrierOrgId !== user.organizationId) throw new Error("Not authorized")
  if (user.type === 'BROKER' && load.brokerOrgId !== user.organizationId) throw new Error("Not authorized")

  if (load.complianceFlag) throw new Error("Cannot progress flagged load")

  // Enforce state machine logic (simplified for hackathon, usually strict transitions)
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
