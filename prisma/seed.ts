import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Clear existing
  await prisma.rateConfirmation.deleteMany()
  await prisma.loadAuditLog.deleteMany()
  await prisma.load.deleteMany()
  await prisma.carrierCompliance.deleteMany()
  await prisma.user.deleteMany()
  await prisma.role.deleteMany()
  await prisma.organization.deleteMany()

  const passwordHash = await bcrypt.hash('password123', 10)

  // 1. Create Broker Org & Admin
  const brokerOrg = await prisma.organization.create({
    data: { name: 'FastFreight Brokerage', type: 'BROKER' }
  })
  
  const brokerAdminRole = await prisma.role.create({
    data: {
      name: 'Broker Admin',
      organizationId: brokerOrg.id,
      permissions: JSON.stringify(['load.create', 'load.assign_carrier', 'load.override_compliance_flag', 'rate.confirm', 'load.update_status', 'staff.manage'])
    }
  })

  await prisma.user.create({
    data: {
      email: 'broker@test.com',
      passwordHash,
      name: 'Broker Admin',
      type: 'BROKER',
      organizationId: brokerOrg.id,
      roleId: brokerAdminRole.id
    }
  })

  // 2. Create Carrier Org & Admin
  const carrierOrg = await prisma.organization.create({
    data: { name: 'Swift Delivery Carriers', type: 'CARRIER' }
  })
  
  const carrierAdminRole = await prisma.role.create({
    data: {
      name: 'Carrier Admin',
      organizationId: carrierOrg.id,
      permissions: JSON.stringify(['load.update_status', 'pod.upload', 'staff.manage'])
    }
  })

  await prisma.user.create({
    data: {
      email: 'carrier@test.com',
      passwordHash,
      name: 'Carrier Admin',
      type: 'CARRIER',
      organizationId: carrierOrg.id,
      roleId: carrierAdminRole.id
    }
  })

  // Create Carrier Compliance
  await prisma.carrierCompliance.create({
    data: {
      carrierOrgId: carrierOrg.id,
      insuranceExpiry: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // 1 year from now
      mcDotStatus: 'ACTIVE',
      equipmentTypes: JSON.stringify(['VAN', 'REEFER'])
    }
  })

  // 3. Create Shipper User (No Org)
  const shipper = await prisma.user.create({
    data: {
      email: 'shipper@test.com',
      passwordHash,
      name: 'Acme Corp (Shipper)',
      type: 'SHIPPER'
    }
  })

  console.log('Seeding complete!')
  console.log('Test Accounts (password: password123):')
  console.log('- broker@test.com')
  console.log('- carrier@test.com')
  console.log('- shipper@test.com')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
