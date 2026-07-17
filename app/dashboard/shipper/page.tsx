import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"
import { Package, History, FileText } from "lucide-react"

const prisma = new PrismaClient()

export default async function ShipperDashboard() {
  const session = await getServerSession(authOptions)
  const user = session?.user

  if (!user || user.type !== 'SHIPPER') {
    return null
  }

  const loads = await prisma.load.findMany({
    where: { shipperId: user.id },
    include: {
      brokerOrg: true,
      carrierOrg: true,
      pod: true,
      auditLogs: {
        orderBy: { timestamp: 'desc' },
        take: 3
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">My Shipments</h1>
        <p className="text-slate-400">Track the real-time status of your freight.</p>
      </div>

      <div className="grid gap-4">
        {loads.map(load => {
          return (
            <div key={load.id} className="bg-slate-900/40 border border-white/10 rounded-2xl p-6 transition-all hover:bg-slate-900/60 hover:border-white/20">
              <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
                    <Package size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-bold text-white">{load.origin} &rarr; {load.destination}</span>
                    </div>
                    <p className="text-sm text-slate-400">Broker: <span className="text-slate-300 font-medium">{load.brokerOrg.name}</span></p>
                  </div>
                </div>
                
                <div className="flex flex-col items-end">
                  <span className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase border ${
                    load.status === 'DELIVERED' || load.status === 'POD_VERIFIED' || load.status === 'CLOSED'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : load.status === 'IN_TRANSIT'
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      : 'bg-slate-800 text-slate-300 border-white/10'
                  }`}>
                    {load.status.replace('_', ' ')}
                  </span>
                  {load.carrierOrg && (
                    <p className="text-xs text-slate-500 mt-2">Carrier: {load.carrierOrg.name}</p>
                  )}
                  {load.pod && (
                    <a href={load.pod.dataUrl} target="_blank" rel="noopener noreferrer" download={load.pod.fileName}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium transition-colors border border-emerald-500/20">
                      <FileText size={14} /> Proof of Delivery
                    </a>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-white/5">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <History size={14} /> Recent Updates
                </h4>
                <div className="space-y-3">
                  {load.auditLogs.map(log => (
                    <div key={log.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div>
                        <span className="text-slate-300">Status changed to <span className="font-semibold text-white">{log.newStatus.replace('_', ' ')}</span></span>
                      </div>
                      <span className="text-slate-500 text-xs">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  ))}
                  {load.auditLogs.length === 0 && (
                    <p className="text-sm text-slate-500 italic">No tracking updates yet.</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {loads.length === 0 && (
          <div className="text-center py-12 bg-slate-900/20 rounded-2xl border border-white/5 border-dashed">
            <p className="text-slate-500 font-medium">You have no active shipments.</p>
          </div>
        )}
      </div>
    </div>
  )
}
