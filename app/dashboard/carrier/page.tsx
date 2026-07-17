import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"
import { proposeRate, updateLoadStatus, acceptLoad, declineLoad } from "@/app/actions/load"
import { updateCompliance } from "@/app/actions/compliance"
import { PodUpload } from "@/components/pod-upload"
import { EQUIPMENT_TYPES, COMMODITY_TYPES, MC_DOT_STATUSES } from "@/lib/permissions"
import { AlertTriangle, Check, DollarSign, FileCheck, FileText, MapPin, Navigation, ShieldAlert, X } from "lucide-react"

const prisma = new PrismaClient()

const MS_PER_DAY = 1000 * 60 * 60 * 24

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
      pod: true,
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

  // Expiry alerting
  const daysToExpiry = compliance
    ? Math.floor((new Date(compliance.insuranceExpiry).getTime() - Date.now()) / MS_PER_DAY)
    : null
  const expired = daysToExpiry !== null && daysToExpiry < 0
  const expiringSoon = daysToExpiry !== null && daysToExpiry >= 0 && daysToExpiry <= 30

  const approvedEquipment: string[] = compliance ? JSON.parse(compliance.equipmentTypes || "[]") : []
  const approvedCommodities: string[] = compliance ? JSON.parse(compliance.commodityTypes || "[]") : []

  return (
    <div className="space-y-6">
      {/* Compliance expiry / authority alerts */}
      {(expired || expiringSoon || (compliance && compliance.mcDotStatus !== 'ACTIVE')) && (
        <div className={`flex items-start gap-3 p-4 rounded-xl border ${
          expired || (compliance && compliance.mcDotStatus !== 'ACTIVE')
            ? 'bg-red-500/10 border-red-500/30 text-red-300'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
        }`}>
          <AlertTriangle size={20} className="mt-0.5 shrink-0" />
          <div className="text-sm">
            {expired && <p><span className="font-bold">Insurance expired.</span> You cannot be dispatched to new loads until you renew it below.</p>}
            {expiringSoon && <p><span className="font-bold">Insurance expires in {daysToExpiry} day{daysToExpiry === 1 ? '' : 's'}.</span> Renew soon to stay eligible for loads.</p>}
            {compliance && compliance.mcDotStatus !== 'ACTIVE' && <p><span className="font-bold">MC/DOT authority is {compliance.mcDotStatus}.</span> Loads assigned to you will be blocked until it is ACTIVE.</p>}
          </div>
        </div>
      )}

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
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-lg font-bold text-white">{load.origin} &rarr; {load.destination}</span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-slate-500/20 text-slate-400">
                            {load.status.replace(/_/g, ' ')}
                          </span>
                          {load.equipmentType && <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 border border-white/10 text-slate-400">{load.equipmentType}</span>}
                          {load.commodityType && <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 border border-white/10 text-slate-400">{load.commodityType}</span>}
                        </div>
                        <p className="text-sm text-slate-400">Broker: <span className="text-slate-300 font-medium">{load.brokerOrg.name}</span></p>
                      </div>
                    </div>
                  </div>

                  {/* Compliance block notice */}
                  {load.complianceFlag && (
                    <div className="flex items-start gap-2 mb-6 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                      <ShieldAlert size={16} className="mt-0.5 shrink-0" />
                      <span><span className="font-semibold">Blocked:</span> {load.complianceFlagReason || 'Compliance issue'}. Contact the broker to resolve.</span>
                    </div>
                  )}

                  {/* Accept / Decline gate */}
                  {load.status === 'CARRIER_ASSIGNED' && !load.carrierAccepted && !load.complianceFlag && (
                    hasPermission('load.accept_decline') ? (
                      <div className="flex items-center gap-3 mb-6">
                        <form action={async () => { "use server"; await acceptLoad(load.id) }}>
                          <button type="submit" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-medium text-sm transition-colors">
                            <Check size={16} /> Accept Load
                          </button>
                        </form>
                        <form action={async () => { "use server"; await declineLoad(load.id) }}>
                          <button type="submit" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-300 hover:text-red-400 font-medium text-sm transition-colors border border-white/10">
                            <X size={16} /> Decline
                          </button>
                        </form>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 italic mb-6">Awaiting a dispatcher to accept this load.</p>
                    )
                  )}

                  <div className="grid grid-cols-2 gap-8 pt-4 border-t border-white/5">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Rate Agreement</h4>
                      {!latestRate && load.status === 'CARRIER_ASSIGNED' && load.carrierAccepted && !load.complianceFlag ? (
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
                      ) : latestRate ? (
                        <div className="flex items-center gap-2">
                          <DollarSign size={18} className={latestRate.status === 'CONFIRMED' ? 'text-emerald-400' : 'text-amber-400'} />
                          <span className="text-lg font-bold text-white">${latestRate.baseRate + latestRate.accessorials}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${latestRate.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                            v{latestRate.version} · {latestRate.status}
                          </span>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 italic">Accept the load to negotiate a rate.</p>
                      )}
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Status &amp; POD</h4>
                      {hasPermission('load.update_status') && ['RATE_CONFIRMED', 'DISPATCHED', 'IN_TRANSIT'].includes(load.status) && (
                        <form action={async (formData) => {
                          "use server"
                          await updateLoadStatus(load.id, formData.get('status') as string)
                        }} className="flex gap-2 mb-3">
                          <select name="status" className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500">
                            {load.status === 'RATE_CONFIRMED' && <option value="DISPATCHED">Dispatch Driver</option>}
                            {load.status === 'DISPATCHED' && <option value="IN_TRANSIT">In Transit</option>}
                            {load.status === 'IN_TRANSIT' && <option value="DELIVERED">Mark Delivered</option>}
                          </select>
                          <button type="submit" className="px-4 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-medium text-sm transition-colors flex items-center gap-2">
                            <Navigation size={14} /> Update
                          </button>
                        </form>
                      )}

                      {/* POD upload / view */}
                      {(load.status === 'DELIVERED' || load.status === 'POD_VERIFIED' || load.status === 'CLOSED') && (
                        <div className="flex items-center gap-3 flex-wrap">
                          {load.pod ? (
                            <a href={load.pod.dataUrl} target="_blank" rel="noopener noreferrer" download={load.pod.fileName}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-medium text-sm transition-colors border border-white/10">
                              <FileText size={16} /> View POD
                            </a>
                          ) : (
                            <span className="text-sm text-slate-500 italic">No POD uploaded yet.</span>
                          )}
                          {load.status === 'DELIVERED' && hasPermission('pod.upload') && <PodUpload loadId={load.id} />}
                        </div>
                      )}

                      {(load.status === 'POSTED' || load.status === 'CARRIER_ASSIGNED') && (
                        <p className="text-sm text-slate-500 italic">Status actions unlock after the rate is confirmed.</p>
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

        {/* Compliance record CRUD */}
        <div>
          <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900/80 border border-indigo-500/20 rounded-2xl p-6 sticky top-24">
            <div className="flex items-center gap-3 mb-6">
              <FileCheck size={24} className="text-indigo-400" />
              <h2 className="text-xl font-bold text-white">Compliance Record</h2>
            </div>

            {hasPermission('compliance.manage') ? (
              <form action={async (formData) => {
                "use server"
                await updateCompliance({
                  insuranceExpiry: formData.get('insuranceExpiry') as string,
                  mcDotStatus: formData.get('mcDotStatus') as string,
                  equipmentTypes: formData.getAll('equipmentTypes') as string[],
                  commodityTypes: formData.getAll('commodityTypes') as string[],
                })
              }} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Insurance Expiry</label>
                  <input
                    type="date"
                    name="insuranceExpiry"
                    required
                    defaultValue={compliance ? new Date(compliance.insuranceExpiry).toISOString().slice(0, 10) : ''}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">MC/DOT Authority</label>
                  <select name="mcDotStatus" defaultValue={compliance?.mcDotStatus || 'PENDING'} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500">
                    {MC_DOT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Approved Equipment</label>
                  <div className="grid grid-cols-2 gap-2">
                    {EQUIPMENT_TYPES.map(t => (
                      <label key={t} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input type="checkbox" name="equipmentTypes" value={t} defaultChecked={approvedEquipment.includes(t)} className="rounded border-white/10 bg-slate-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900" />
                        {t}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Approved Commodities</label>
                  <div className="grid grid-cols-2 gap-2">
                    {COMMODITY_TYPES.map(t => (
                      <label key={t} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input type="checkbox" name="commodityTypes" value={t} defaultChecked={approvedCommodities.includes(t)} className="rounded border-white/10 bg-slate-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900" />
                        {t}
                      </label>
                    ))}
                  </div>
                </div>

                <button type="submit" className="w-full py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white transition-colors text-sm font-medium">
                  Save Compliance Record
                </button>
              </form>
            ) : compliance ? (
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
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Equipment / Commodities</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {[...approvedEquipment, ...approvedCommodities].map(type => (
                      <span key={type} className="px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-slate-300 font-medium">{type}</span>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-slate-500 italic pt-2">You do not have permission to edit the compliance record.</p>
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
