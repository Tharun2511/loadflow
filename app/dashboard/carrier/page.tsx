import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"
import { proposeRate, updateLoadStatus } from "@/app/actions/load"
import { DollarSign, FileCheck, MapPin, Navigation, Truck } from "lucide-react"
import { revalidatePath } from "next/cache"

const prisma = new PrismaClient()

export default async function CarrierDashboard() {
  const session = await getServerSession(authOptions)
  const user = session?.user

  if (!user || user.type !== 'CARRIER' || !user.organizationId) {
    return null
  }

  const loads = await prisma.load.findMany({
    where: { carrierOrgId: user.organizationId },
    include: {
      shipper: true,
      brokerOrg: true,
      rateConfirmations: {
        orderBy: { version: 'desc' },
        take: 1
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  const compliance = await prisma.carrierCompliance.findUnique({
    where: { carrierOrgId: user.organizationId }
  })

  const hasPermission = (perm: string) => user.rolePermissions?.includes(perm)

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Assigned Loads</h1>
          <p className="text-slate-400 mb-6">Manage shipments assigned to your carrier.</p>

          <div className="space-y-4">
            {loads.map(load => {
              const latestRate = load.rateConfirmations[0]
              
              return (
                <div key={load.id} className="bg-slate-900/40 border border-white/10 rounded-2xl p-6 transition-all hover:bg-slate-900/60 hover:border-white/20">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
                        <MapPin size={24} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg font-bold text-white">{load.origin} &rarr; {load.destination}</span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-slate-500/20 text-slate-400">
                            {load.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400">Broker: <span className="text-slate-300 font-medium">{load.brokerOrg.name}</span></p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8 pt-4 border-t border-white/5">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Rate Agreement</h4>
                      {!latestRate && load.status === 'CARRIER_ASSIGNED' ? (
                        <form action={async (formData) => {
                          "use server"
                          await proposeRate(load.id, formData.get('baseRate') as string, formData.get('accessorials') as string)
                        }} className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-2 text-slate-500">$</span>
                            <input type="number" name="baseRate" placeholder="Base Rate" required className="w-full pl-7 pr-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500" />
                          </div>
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-2 text-slate-500">$</span>
                            <input type="number" name="accessorials" placeholder="Accessorials" defaultValue="0" required className="w-full pl-7 pr-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500" />
                          </div>
                          <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-medium text-sm transition-colors">
                            Propose
                          </button>
                        </form>
                      ) : (
                        <div className="flex items-center gap-2">
                          <DollarSign size={18} className={latestRate?.status === 'CONFIRMED' ? 'text-emerald-400' : 'text-amber-400'} />
                          <span className="text-lg font-bold text-white">${latestRate ? latestRate.baseRate + latestRate.accessorials : '0'}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${latestRate?.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                            {latestRate?.status || 'No Rate'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Update Status</h4>
                      {hasPermission('load.update_status') && load.status !== 'CLOSED' && load.status !== 'POSTED' && load.status !== 'CARRIER_ASSIGNED' && (
                        <form action={async (formData) => {
                          "use server"
                          await updateLoadStatus(load.id, formData.get('status') as string)
                        }} className="flex gap-2">
                          <select name="status" className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500">
                            {load.status === 'RATE_CONFIRMED' && <option value="DISPATCHED">Dispatch Driver</option>}
                            {load.status === 'DISPATCHED' && <option value="IN_TRANSIT">In Transit</option>}
                            {load.status === 'IN_TRANSIT' && <option value="DELIVERED">Mark Delivered</option>}
                            {load.status === 'DELIVERED' && <option value="POD_VERIFIED">Upload/Verify POD</option>}
                          </select>
                          <button type="submit" className="px-4 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-medium text-sm transition-colors flex items-center gap-2">
                            <Navigation size={14} /> Update
                          </button>
                        </form>
                      )}
                      {(load.status === 'POSTED' || load.status === 'CARRIER_ASSIGNED') && (
                        <p className="text-sm text-slate-500 italic">Wait for rate confirmation before updating status.</p>
                      )}
                      {load.status === 'CLOSED' && (
                        <p className="text-sm text-emerald-500 italic font-medium">Load is closed and paid.</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            
            {loads.length === 0 && (
              <div className="text-center py-12 bg-slate-900/20 rounded-2xl border border-white/5 border-dashed">
                <p className="text-slate-500 font-medium">No assigned loads yet.</p>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900/80 border border-indigo-500/20 rounded-2xl p-6 sticky top-24">
            <div className="flex items-center gap-3 mb-6">
              <FileCheck size={24} className="text-indigo-400" />
              <h2 className="text-xl font-bold text-white">Compliance Record</h2>
            </div>

            {compliance ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">MC/DOT Status</p>
                  <p className="text-sm text-white font-medium flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${compliance.mcDotStatus === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                    {compliance.mcDotStatus}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Insurance Expiry</p>
                  <p className="text-sm text-white font-medium">{new Date(compliance.insuranceExpiry).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Equipment Types</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {JSON.parse(compliance.equipmentTypes).map((type: string) => (
                      <span key={type} className="px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-slate-300 font-medium">
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
                
                <form action={async () => {
                  "use server"
                  await prisma.carrierCompliance.update({
                    where: { carrierOrgId: user.organizationId! },
                    data: { mcDotStatus: 'ACTIVE', insuranceExpiry: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365) }
                  })
                  revalidatePath('/dashboard/carrier')
                }}>
                  <button type="submit" className="w-full mt-4 py-2 rounded-lg border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 transition-colors text-sm font-medium">
                    Simulate Compliance Renewal
                  </button>
                </form>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No compliance record found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
