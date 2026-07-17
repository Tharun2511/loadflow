import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"
import { redirect } from "next/navigation"
import { History, ArrowRight, ArrowLeft } from "lucide-react"
import Link from "next/link"

const prisma = new PrismaClient()

// Org-scoped audit log viewer: every attributed, timestamped load state
// change for the caller's organization.
export default async function AuditLogPage() {
  const session = await getServerSession(authOptions)
  const user = session?.user

  if (!user || !user.organizationId || (user.type !== 'BROKER' && user.type !== 'CARRIER')) {
    redirect('/dashboard')
  }

  // Scope the audit trail to loads owned by (broker) or assigned to (carrier) this org.
  const loadScope =
    user.type === 'BROKER'
      ? { brokerOrgId: user.organizationId }
      : { carrierOrgId: user.organizationId }

  const logs = await prisma.loadAuditLog.findMany({
    where: { load: loadScope },
    include: {
      load: { select: { origin: true, destination: true } },
      changedBy: { select: { name: true, email: true, type: true } },
    },
    orderBy: { timestamp: 'desc' },
    take: 200,
  })

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-3">
          <ArrowLeft size={16} /> Back to dashboard
        </Link>
        <div className="flex items-center gap-3">
          <History size={26} className="text-indigo-400" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Audit Trail</h1>
            <p className="text-slate-400">Every attributed load state change across your organization.</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/40 border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-3">Load</th>
                <th className="px-6 py-3">Transition</th>
                <th className="px-6 py-3">Changed By</th>
                <th className="px-6 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-6 py-3 text-slate-200 font-medium whitespace-nowrap">{log.load.origin} &rarr; {log.load.destination}</td>
                  <td className="px-6 py-3">
                    <span className="inline-flex items-center gap-2 text-slate-300">
                      <span className="text-slate-500">{log.oldStatus.replace(/_/g, ' ') || 'created'}</span>
                      <ArrowRight size={12} className="text-slate-600" />
                      <span className="font-semibold text-white">{log.newStatus.replace(/_/g, ' ')}</span>
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-300 whitespace-nowrap">{log.changedBy.name || log.changedBy.email} <span className="text-xs text-slate-500">({log.changedBy.type})</span></td>
                  <td className="px-6 py-3 text-slate-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-medium">No audit records yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
