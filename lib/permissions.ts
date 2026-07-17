// Single source of truth for the RBAC permission catalog.
// Roles are bundles of these permission keys; application code checks
// permission keys, never role names.

export type PermissionKey =
  | "load.create"
  | "load.assign_carrier"
  | "load.override_compliance_flag"
  | "rate.confirm"
  | "load.update_status"
  | "staff.manage"
  | "pod.upload"
  | "load.accept_decline"
  | "compliance.manage"

export interface PermissionDef {
  key: PermissionKey
  label: string
  description: string
  // Which org type this permission is relevant for (for grouping in the UI)
  scope: "BROKER" | "CARRIER" | "BOTH"
}

export const PERMISSION_CATALOG: PermissionDef[] = [
  { key: "load.create", label: "Create loads", description: "Post new loads to the board", scope: "BROKER" },
  { key: "load.assign_carrier", label: "Assign carrier", description: "Assign a carrier to a posted load", scope: "BROKER" },
  { key: "rate.confirm", label: "Confirm rates", description: "Confirm a carrier's proposed rate", scope: "BROKER" },
  { key: "load.override_compliance_flag", label: "Override compliance flag", description: "Clear a compliance block (broker liability)", scope: "BROKER" },
  { key: "load.accept_decline", label: "Accept / decline loads", description: "Accept or decline an assigned load", scope: "CARRIER" },
  { key: "load.update_status", label: "Update load status", description: "Advance a load through its lifecycle", scope: "BOTH" },
  { key: "pod.upload", label: "Upload POD", description: "Upload proof-of-delivery documents", scope: "CARRIER" },
  { key: "compliance.manage", label: "Manage compliance", description: "Edit the carrier's insurance, authority & equipment record", scope: "CARRIER" },
  { key: "staff.manage", label: "Manage staff & roles", description: "Create staff, define custom roles (admin)", scope: "BOTH" },
]

// Default permission bundles used when bootstrapping the first admin of an org.
export const BROKER_ADMIN_PERMISSIONS: PermissionKey[] = [
  "load.create",
  "load.assign_carrier",
  "load.override_compliance_flag",
  "rate.confirm",
  "load.update_status",
  "staff.manage",
]

export const CARRIER_ADMIN_PERMISSIONS: PermissionKey[] = [
  "load.accept_decline",
  "load.update_status",
  "pod.upload",
  "compliance.manage",
  "staff.manage",
]

// Shared enums used across compliance records and loads.
export const EQUIPMENT_TYPES = ["VAN", "REEFER", "FLATBED", "TANKER", "STEP_DECK"] as const
export const COMMODITY_TYPES = ["GENERAL", "FOOD", "HAZMAT", "REFRIGERATED", "OVERSIZED"] as const
export const MC_DOT_STATUSES = ["ACTIVE", "PENDING", "INACTIVE"] as const

export const LOAD_STATUSES = [
  "POSTED",
  "CARRIER_ASSIGNED",
  "RATE_CONFIRMED",
  "DISPATCHED",
  "IN_TRANSIT",
  "DELIVERED",
  "POD_VERIFIED",
  "CLOSED",
] as const
