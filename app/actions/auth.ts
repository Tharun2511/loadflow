"use server"

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { requirePermission } from "@/lib/rbac"
import { BROKER_ADMIN_PERMISSIONS, CARRIER_ADMIN_PERMISSIONS } from "@/lib/permissions"

const prisma = new PrismaClient()

// Bootstrap: Create the first Admin for a new Organization
export async function registerOrganization(data: {
  orgName: string
  orgType: "BROKER" | "CARRIER"
  adminName: string
  adminEmail: string
  adminPassword: string
}) {
  const existingUser = await prisma.user.findUnique({ where: { email: data.adminEmail } })
  if (existingUser) throw new Error("Email already in use")

  const passwordHash = await bcrypt.hash(data.adminPassword, 10)

  // Default permissions for the bootstrap Admin, based on org type.
  const permissions = data.orgType === 'BROKER' ? BROKER_ADMIN_PERMISSIONS : CARRIER_ADMIN_PERMISSIONS

  const org = await prisma.organization.create({
    data: {
      name: data.orgName,
      type: data.orgType,
      roles: {
        create: {
          name: "Admin",
          permissions: JSON.stringify(permissions)
        }
      }
    },
    include: { roles: true }
  })

  const adminRole = org.roles[0]

  await prisma.user.create({
    data: {
      email: data.adminEmail,
      passwordHash,
      name: data.adminName,
      type: data.orgType,
      organizationId: org.id,
      roleId: adminRole.id
    }
  })

  // If carrier, create empty compliance record
  if (data.orgType === 'CARRIER') {
    await prisma.carrierCompliance.create({
      data: {
        carrierOrgId: org.id,
        insuranceExpiry: new Date(), // Expired by default
        mcDotStatus: 'PENDING',
        equipmentTypes: '[]'
      }
    })
  }

  return { success: true }
}

// Shipper registration (no org)
export async function registerShipper(data: {
  name: string
  email: string
  password: string
}) {
  const existingUser = await prisma.user.findUnique({ where: { email: data.email } })
  if (existingUser) throw new Error("Email already in use")

  const passwordHash = await bcrypt.hash(data.password, 10)

  await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      name: data.name,
      type: 'SHIPPER'
    }
  })

  return { success: true }
}

// Admin adding a staff member
export async function createStaffMember(data: {
  name: string
  email: string
  password: string
  roleId: string
}) {
  const user = await requirePermission('staff.manage')
  
  if (!user.organizationId) throw new Error("Must belong to an organization")

  const role = await prisma.role.findFirst({
    where: { id: data.roleId, organizationId: user.organizationId }
  })
  
  if (!role) throw new Error("Invalid role")

  const passwordHash = await bcrypt.hash(data.password, 10)

  await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      name: data.name,
      type: user.type,
      organizationId: user.organizationId,
      roleId: role.id
    }
  })

  return { success: true }
}
