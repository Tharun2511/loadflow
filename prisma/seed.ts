import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import {
  BROKER_ADMIN_PERMISSIONS,
  CARRIER_ADMIN_PERMISSIONS,
} from '../lib/permissions'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Clear existing (respect FK order)
  await prisma.pod.deleteMany()
  await prisma.rateConfirmation.deleteMany()
  await prisma.loadAuditLog.deleteMany()
  await prisma.load.deleteMany()
  await prisma.carrierCompliance.deleteMany()
  await prisma.user.deleteMany()
  await prisma.role.deleteMany()
  await prisma.organization.deleteMany()

  const passwordHash = await bcrypt.hash('password123', 10)

  // ---- 1. Broker org + Admin + a custom Dispatcher role ----
  const brokerOrg = await prisma.organization.create({
    data: { name: 'FastFreight Brokerage', type: 'BROKER' },
  })

  const brokerAdminRole = await prisma.role.create({
    data: {
      name: 'Admin',
      organizationId: brokerOrg.id,
      permissions: JSON.stringify(BROKER_ADMIN_PERMISSIONS),
    },
  })

  // Custom role built from the catalog: can assign + confirm, but cannot override compliance or manage staff.
  const dispatcherRole = await prisma.role.create({
    data: {
      name: 'Dispatcher',
      organizationId: brokerOrg.id,
      permissions: JSON.stringify(['load.create', 'load.assign_carrier', 'rate.confirm', 'load.update_status']),
    },
  })

  const brokerAdmin = await prisma.user.create({
    data: { email: 'broker@test.com', passwordHash, name: 'Bella Broker', type: 'BROKER', organizationId: brokerOrg.id, roleId: brokerAdminRole.id },
  })

  await prisma.user.create({
    data: { email: 'dispatcher@test.com', passwordHash, name: 'Dan Dispatcher', type: 'BROKER', organizationId: brokerOrg.id, roleId: dispatcherRole.id },
  })

  // ---- 2. Compliant Carrier org (Swift) + Admin + Driver/Dispatch roles ----
  const swiftOrg = await prisma.organization.create({
    data: { name: 'Swift Delivery Carriers', type: 'CARRIER' },
  })

  const carrierAdminRole = await prisma.role.create({
    data: { name: 'Admin', organizationId: swiftOrg.id, permissions: JSON.stringify(CARRIER_ADMIN_PERMISSIONS) },
  })
  // "Carrier Dispatch" accepts/declines; "Driver" updates status + uploads POD (per the brief's examples).
  const dispatchRole = await prisma.role.create({
    data: { name: 'Carrier Dispatch', organizationId: swiftOrg.id, permissions: JSON.stringify(['load.accept_decline', 'load.update_status']) },
  })
  const driverRole = await prisma.role.create({
    data: { name: 'Driver', organizationId: swiftOrg.id, permissions: JSON.stringify(['load.update_status', 'pod.upload']) },
  })

  const swiftAdmin = await prisma.user.create({
    data: { email: 'carrier@test.com', passwordHash, name: 'Cara Carrier', type: 'CARRIER', organizationId: swiftOrg.id, roleId: carrierAdminRole.id },
  })
  await prisma.user.create({
    data: { email: 'dispatch@test.com', passwordHash, name: 'Dana Dispatch', type: 'CARRIER', organizationId: swiftOrg.id, roleId: dispatchRole.id },
  })
  await prisma.user.create({
    data: { email: 'driver@test.com', passwordHash, name: 'Dave Driver', type: 'CARRIER', organizationId: swiftOrg.id, roleId: driverRole.id },
  })

  await prisma.carrierCompliance.create({
    data: {
      carrierOrgId: swiftOrg.id,
      insuranceExpiry: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      mcDotStatus: 'ACTIVE',
      equipmentTypes: JSON.stringify(['VAN', 'REEFER']),
      commodityTypes: JSON.stringify(['GENERAL', 'FOOD']),
    },
  })

  // ---- 3. Non-compliant Carrier org (Budget) to demonstrate auto-flagging ----
  const budgetOrg = await prisma.organization.create({
    data: { name: 'Budget Movers', type: 'CARRIER' },
  })
  await prisma.role.create({
    data: { name: 'Admin', organizationId: budgetOrg.id, permissions: JSON.stringify(CARRIER_ADMIN_PERMISSIONS) },
  })
  const budgetAdminRole = await prisma.role.findFirstOrThrow({ where: { organizationId: budgetOrg.id, name: 'Admin' } })
  await prisma.user.create({
    data: { email: 'budget@test.com', passwordHash, name: 'Barry Budget', type: 'CARRIER', organizationId: budgetOrg.id, roleId: budgetAdminRole.id },
  })
  await prisma.carrierCompliance.create({
    data: {
      carrierOrgId: budgetOrg.id,
      insuranceExpiry: new Date(new Date().setMonth(new Date().getMonth() - 2)), // expired 2 months ago
      mcDotStatus: 'INACTIVE',
      equipmentTypes: JSON.stringify(['FLATBED']),
      commodityTypes: JSON.stringify(['GENERAL']),
    },
  })

  // ---- 4. Shipper (no org) ----
  const shipper = await prisma.user.create({
    data: { email: 'shipper@test.com', passwordHash, name: 'Acme Corp (Shipper)', type: 'SHIPPER' },
  })

  // ---- 5. Demo loads ----
  // A: fresh posted load, awaiting carrier assignment.
  const loadA = await prisma.load.create({
    data: { origin: 'Los Angeles, CA', destination: 'Dallas, TX', status: 'POSTED', equipmentType: 'REEFER', commodityType: 'FOOD', shipperId: shipper.id, brokerOrgId: brokerOrg.id },
  })
  await prisma.loadAuditLog.create({ data: { loadId: loadA.id, oldStatus: '', newStatus: 'POSTED', changedById: brokerAdmin.id } })

  // B: assigned to non-compliant Budget Movers -> auto-flagged (shows in broker Alerts panel).
  const loadB = await prisma.load.create({
    data: {
      origin: 'Newark, NJ', destination: 'Chicago, IL', status: 'CARRIER_ASSIGNED', equipmentType: 'VAN', commodityType: 'GENERAL',
      shipperId: shipper.id, brokerOrgId: brokerOrg.id, carrierOrgId: budgetOrg.id,
      complianceFlag: true, complianceFlagReason: 'MC/DOT authority is INACTIVE, not ACTIVE; Insurance expired; Not approved for VAN equipment',
    },
  })
  await prisma.loadAuditLog.create({ data: { loadId: loadB.id, oldStatus: '', newStatus: 'POSTED', changedById: brokerAdmin.id } })
  await prisma.loadAuditLog.create({ data: { loadId: loadB.id, oldStatus: 'POSTED', newStatus: 'CARRIER_ASSIGNED', changedById: brokerAdmin.id } })

  // C: healthy in-progress load with Swift (accepted + confirmed rate + in transit).
  const loadC = await prisma.load.create({
    data: {
      origin: 'Miami, FL', destination: 'Atlanta, GA', status: 'IN_TRANSIT', equipmentType: 'VAN', commodityType: 'GENERAL',
      shipperId: shipper.id, brokerOrgId: brokerOrg.id, carrierOrgId: swiftOrg.id, carrierAccepted: true,
    },
  })
  await prisma.rateConfirmation.create({ data: { loadId: loadC.id, version: 1, baseRate: 1800, accessorials: 150, status: 'CONFIRMED' } })
  for (const [oldS, newS, by] of [['', 'POSTED', brokerAdmin.id], ['POSTED', 'CARRIER_ASSIGNED', brokerAdmin.id], ['CARRIER_ASSIGNED', 'RATE_CONFIRMED', brokerAdmin.id], ['RATE_CONFIRMED', 'DISPATCHED', swiftAdmin.id], ['DISPATCHED', 'IN_TRANSIT', swiftAdmin.id]] as const) {
    await prisma.loadAuditLog.create({ data: { loadId: loadC.id, oldStatus: oldS, newStatus: newS, changedById: by } })
  }

  console.log('Seeding complete!')
  console.log('Test accounts (password: password123):')
  console.log('  BROKER   broker@test.com (Admin) · dispatcher@test.com (Dispatcher)')
  console.log('  CARRIER  carrier@test.com (Admin) · dispatch@test.com (Dispatch) · driver@test.com (Driver)')
  console.log('  CARRIER  budget@test.com (non-compliant Budget Movers)')
  console.log('  SHIPPER  shipper@test.com')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
