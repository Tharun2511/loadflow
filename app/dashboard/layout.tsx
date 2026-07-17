import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import Link from "next/link"
import { LogOut, LayoutDashboard, Truck, ShieldAlert } from "lucide-react"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  const user = session?.user

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      {/* Top Navigation */}
      <nav className="border-b border-white/10 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Truck size={18} className="text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight">LoadFlow</span>
              {user && (
                <span className="ml-4 px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                  {user.type}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-6">
              {user && (
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-slate-200">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                  <a 
                    href="/api/auth/signout" 
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    title="Sign Out"
                  >
                    <LogOut size={18} />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
