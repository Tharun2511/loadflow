-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "type" TEXT NOT NULL,
    "organizationId" TEXT,
    "roleId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "permissions" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    CONSTRAINT "Role_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CarrierCompliance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "carrierOrgId" TEXT NOT NULL,
    "insuranceExpiry" DATETIME NOT NULL,
    "mcDotStatus" TEXT NOT NULL,
    "equipmentTypes" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CarrierCompliance_carrierOrgId_fkey" FOREIGN KEY ("carrierOrgId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Load" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "complianceFlag" BOOLEAN NOT NULL DEFAULT false,
    "shipperId" TEXT NOT NULL,
    "brokerOrgId" TEXT NOT NULL,
    "carrierOrgId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Load_shipperId_fkey" FOREIGN KEY ("shipperId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Load_brokerOrgId_fkey" FOREIGN KEY ("brokerOrgId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Load_carrierOrgId_fkey" FOREIGN KEY ("carrierOrgId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LoadAuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loadId" TEXT NOT NULL,
    "oldStatus" TEXT NOT NULL,
    "newStatus" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoadAuditLog_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LoadAuditLog_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RateConfirmation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loadId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "baseRate" REAL NOT NULL,
    "accessorials" REAL NOT NULL DEFAULT 0.0,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RateConfirmation_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_organizationId_key" ON "Role"("name", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "CarrierCompliance_carrierOrgId_key" ON "CarrierCompliance"("carrierOrgId");

-- CreateIndex
CREATE UNIQUE INDEX "RateConfirmation_loadId_version_key" ON "RateConfirmation"("loadId", "version");
