-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "type" TEXT NOT NULL,
    "organizationId" TEXT,
    "roleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarrierCompliance" (
    "id" TEXT NOT NULL,
    "carrierOrgId" TEXT NOT NULL,
    "insuranceExpiry" TIMESTAMP(3) NOT NULL,
    "mcDotStatus" TEXT NOT NULL,
    "equipmentTypes" TEXT NOT NULL,
    "commodityTypes" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarrierCompliance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Load" (
    "id" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "equipmentType" TEXT,
    "commodityType" TEXT,
    "complianceFlag" BOOLEAN NOT NULL DEFAULT false,
    "complianceFlagReason" TEXT,
    "carrierAccepted" BOOLEAN NOT NULL DEFAULT false,
    "shipperId" TEXT NOT NULL,
    "brokerOrgId" TEXT NOT NULL,
    "carrierOrgId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Load_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pod" (
    "id" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "dataUrl" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoadAuditLog" (
    "id" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "oldStatus" TEXT NOT NULL,
    "newStatus" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoadAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateConfirmation" (
    "id" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "baseRate" DOUBLE PRECISION NOT NULL,
    "accessorials" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_organizationId_key" ON "Role"("name", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "CarrierCompliance_carrierOrgId_key" ON "CarrierCompliance"("carrierOrgId");

-- CreateIndex
CREATE UNIQUE INDEX "Pod_loadId_key" ON "Pod"("loadId");

-- CreateIndex
CREATE UNIQUE INDEX "RateConfirmation_loadId_version_key" ON "RateConfirmation"("loadId", "version");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarrierCompliance" ADD CONSTRAINT "CarrierCompliance_carrierOrgId_fkey" FOREIGN KEY ("carrierOrgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_shipperId_fkey" FOREIGN KEY ("shipperId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_brokerOrgId_fkey" FOREIGN KEY ("brokerOrgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_carrierOrgId_fkey" FOREIGN KEY ("carrierOrgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pod" ADD CONSTRAINT "Pod_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pod" ADD CONSTRAINT "Pod_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadAuditLog" ADD CONSTRAINT "LoadAuditLog_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadAuditLog" ADD CONSTRAINT "LoadAuditLog_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateConfirmation" ADD CONSTRAINT "RateConfirmation_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

