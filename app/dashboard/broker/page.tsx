import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"
import { createLoad, assignCarrier, overrideCompliance, confirmRate } from "@/app/actions/load"
import { EQUIPMENT_TYPES, COMMODITY_TYPES } from "@/lib/permissions"
import { CheckCircle2, Clock, FileText, Plus, ShieldAlert, Truck, Search, Filter } from "lucide-react"

const prisma = new PrismaClient()

export default async function BrokerDashboard(props: { searchParams?: Promise<{ search?: string, status?: string }> }) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions)
  const user = session?.user

  if (!user || user.type !== 'BROKER' || !user.organizationId) {
    return null
  }

  const searchQuery = searchParams?.search || ''
  const statusFilter = searchParams?.status || ''

  const loads = await prisma.load.findMany({
    where: {
      brokerOrgId: user.organizationId,
      ...(searchQuery ? {
        OR: [
          { origin: { contains: searchQuery, mode: 'insensitive' } },
          { destination: { contains: searchQuery, mode: 'insensitive' } }
        ]
      } : {}),
      ...(statusFilter ? { status: statusFilter } : {})
    },
    include: {
      shipper: true,
      carrierOrg: true,
      pod: true,
      rateConfirmations: {
        orderBy: { version: 'desc' },
        take: 1
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  const carriers = await prisma.organization.findMany({
    where: { type: 'CARRIER' },
    include: { carrierCompliance: true }
  })

  const shippers = await prisma.user.findMany({
    where: { type: 'SHIPPER' }
  })

  const hasPermission = (perm: string) => user.rolePermissions?.includes(perm)
  const flaggedLoads = loads.filter(l => l.complianceFlag)

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Load Board</h1>
          <p className="text-slate-400 mt-1">Manage and track all shipments for your brokerage.</p>
        </div>

        {hasPermission('load.create') && (
          <form action={async (formData) => {
            "use server"
            await createLoad({
              origin: formData.get('origin') as string,
              destination: formData.get('destination') as string,
              shipperId: formData.get('shipperId') as string,
              equipmentType: (formData.get('equipmentType') as string) || undefined,
              commodityType: (formData.get('commodityType') as string) || undefined,
            })
          }} className="flex flex-wrap items-center gap-2 bg-slate-900/50 p-2 rounded-xl border border-white/10">
            <input type="text" name="origin" placeholder="Origin" required className="px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-sm text-white w-28" />
            <input type="text" name="destination" placeholder="Destination" required className="px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-sm text-white w-28" />
            <select name="shipperId" required className="px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-sm text-white w-28">
              <option value="">Shipper...</option>
              {shippers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select name="equipmentType" className="px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-sm text-white w-28">
              <option value="">Equipment...</option>
              {EQUIPMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select name="commodityType" className="px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-sm text-white w-28">
              <option value="">Commodity...</option>
              {COMMODITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-medium text-sm transition-colors flex items-center gap-2">
              <Plus size={16} /> <span className="hidden sm:inline">Post Load</span>
            </button>
          </form>
        )}
      </div>

      {/* Compliance alerts panel */}
      {flaggedLoads.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert size={20} className="text-red-400" />
            <h2 className="font-bold text-red-300">Compliance Alerts · {flaggedLoads.length} load{flaggedLoads.length === 1 ? '' : 's'} blocked</h2>
          </div>
          <div className="space-y-2">
            {flaggedLoads.map(l => (
              <div key={l.id} className="text-sm text-red-200/90 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <span className="font-semibold text-white">{l.origin} &rarr; {l.destination}</span>
                <span className="text-red-300/80">{l.carrierOrg?.name}: {l.complianceFlagReason || 'Compliance issue'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and Filter Bar */}
      <form action="/dashboard/broker" method="GET" className="flex items-center gap-4 bg-slate-900/40 p-4 rounded-xl border border-white/10">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            name="search"
            defaultValue={searchQuery}
            placeholder="Search by origin or destination..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div className="relative w-48">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <select
            name="status"
            defaultValue={statusFilter}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500 appearance-none"
          >
            <option value="">All Statuses</option>
            <option value="POSTED">Posted</option>
            <option value="CARRIER_ASSIGNED">Carrier Assigned</option>
            <option value="RATE_CONFIRMED">Rate Confirmed</option>
            <option value="DISPATCHED">Dispatched</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="DELIVERED">Delivered</option>
            <option value="POD_VERIFIED">POD Verified</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
        <button type="submit" className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium text-sm transition-colors">
          Filter
        </button>
      </form>

      <div className="grid gap-4">
        {loads.map(load => {
          const latestRate = load.rateConfirmations[0]

          return (
            <div key={load.id} className="bg-slate-900/40 border border-white/10 rounded-2xl p-6 transition-all hover:bg-slate-900/60 hover:border-white/20">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
                    <Truck size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-lg font-bold text-white">{load.origin} &rarr; {load.destination}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                        load.status === 'POSTED' ? 'bg-slate-500/20 text-slate-400' :
                        load.status === 'CARRIER_ASSIGNED' ? 'bg-amber-500/20 text-amber-400' :
                        load.status === 'DELIVERED' || load.status === 'CLOSED' || load.status === 'POD_VERIFIED' ? 'bg-emerald-500/20 text-emerald-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {load.status.replace(/_/g, ' ')}
                      </span>
                      {load.equipmentType && <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 border border-white/10 text-slate-400">{load.equipmentType}</span>}
                      {load.commodityType && <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 border border-white/10 text-slate-400">{load.commodityType}</span>}
                    </div>
                    <p className="text-sm text-slate-400">Shipper: <span className="text-slate-300">{load.shipper.name}</span></p>
                  </div>
                </div>

                {load.complianceFlag && (
                  <div className="flex flex-col items-start gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium max-w-xs">
                    <div className="flex items-center gap-2">
                      <ShieldAlert size={16} />
                      Compliance Issue
                      {hasPermission('load.override_compliance_flag') && (
                        <form action={async () => {
                          "use server"
                          await overrideCompliance(load.id)
                        }}>
                          <button type="submit" className="ml-2 px-2 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-xs transition-colors">
                            Override
                          </button>
                        </form>
                      )}
                    </div>
                    {load.complianceFlagReason && <p className="text-xs font-normal text-red-300/80">{load.complianceFlagReason}</p>}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-white/5">
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Carrier Assignment</h4>
                  {load.carrierOrg ? (
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <CheckCircle2 size={16} className="text-emerald-500" />
                      Assigned to <span className="font-semibold text-white">{load.carrierOrg.name}</span>
                      {load.status === 'CARRIER_ASSIGNED' && (
                        <span className={`text-[10px] px-2 py-0.5 rounded ${load.carrierAccepted ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                          {load.carrierAccepted ? 'Accepted' : 'Awaiting acceptance'}
                        </span>
                      )}
                    </div>
                  ) : (
                    hasPermission('load.assign_carrier') ? (
                      <form action={async (formData) => {
                        "use server"
                        await assignCarrier(load.id, formData.get('carrierId') as string)
                      }} className="flex gap-2">
                        <select name="carrierId" required className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500">
                          <option value="">Select Carrier...</option>
                          {carriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <button type="submit" className="px-3 py-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 font-medium text-sm transition-colors">
                          Assign
                        </button>
                      </form>
                    ) : (
                      <p className="text-sm text-slate-500 italic">Not assigned</p>
                    )
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Rate &amp; Documents</h4>
                  {latestRate ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-800/50 rounded-lg p-3 border border-white/5 gap-2">
                      <div>
                        <p className="text-sm text-slate-300">Total: <span className="font-bold text-white">${latestRate.baseRate + latestRate.accessorials}</span></p>
                        <p className="text-xs text-slate-500">v{latestRate.version} • {latestRate.status}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {load.pod && (
                          <a href={load.pod.dataUrl} target="_blank" rel="noopener noreferrer" download={load.pod.fileName}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition-colors border border-white/10">
                            <FileText size={14} /> POD
                          </a>
                        )}
                        {latestRate.status === 'PENDING' && hasPermission('rate.confirm') && !load.complianceFlag && (
                          <form action={async () => {
                            "use server"
                            await confirmRate(latestRate.id)
                          }}>
                            <button type="submit" className="px-3 py-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-medium text-xs transition-colors">
                              Confirm Rate
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic flex items-center gap-2"><Clock size={14} /> Pending Carrier Proposal</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {loads.length === 0 && (
          <div className="text-center py-12 bg-slate-900/20 rounded-2xl border border-white/5 border-dashed">
            <p className="text-slate-500 font-medium">No loads found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  )
}
