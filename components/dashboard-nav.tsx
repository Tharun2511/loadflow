"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut, Truck } from "lucide-react"

type NavUser = {
  name?: string | null
  email?: string | null
  type?: string
  rolePermissions?: string[]
}

const BOARD_LABEL: Record<string, string> = {
  BROKER: "Load Board",
  CARRIER: "Assigned Loads",
  SHIPPER: "My Shipments",
}

export function DashboardNav({ user }: { user: NavUser }) {
  const pathname = usePathname()

  const isBoard =
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/broker") ||
    pathname.startsWith("/dashboard/carrier") ||
    pathname.startsWith("/dashboard/shipper")

  const links: { href: string; label: string; active: boolean; show: boolean }[] = [
    {
      href: "/dashboard",
      label: BOARD_LABEL[user.type ?? ""] ?? "Dashboard",
      active: isBoard,
      show: true,
    },
    {
      href: "/dashboard/audit",
      label: "Audit Log",
      active: pathname === "/dashboard/audit",
      show: user.type === "BROKER" || user.type === "CARRIER",
    },
    {
      href: "/dashboard/admin",
      label: "Team Settings",
      active: pathname === "/dashboard/admin",
      show: !!user.rolePermissions?.includes("staff.manage"),
    },
  ]

  return (
    <nav className="border-b border-white/10 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo -> home/dashboard */}
          <Link href="/dashboard" className="flex items-center gap-2 group" title="Go to dashboard">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
              <Truck size={18} className="text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">LoadFlow</span>
            {user.type && (
              <span className="ml-2 px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider hidden sm:inline">
                {user.type}
              </span>
            )}
          </Link>

          {/* Primary links */}
          <div className="flex items-center gap-1 sm:gap-2">
            {links.filter(l => l.show).map(l => (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  l.active
                    ? "bg-white/10 text-white"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {l.label}
              </Link>
            ))}

            <div className="flex items-center gap-3 ml-2 sm:ml-4 pl-2 sm:pl-4 border-l border-white/10">
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium text-slate-200 leading-tight">{user.name}</p>
                <p className="text-xs text-slate-500 leading-tight">{user.email}</p>
              </div>
              <a
                href="/api/auth/signout"
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                title="Sign out"
              >
                <LogOut size={18} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
