import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"
import { createRole } from "@/app/actions/admin"
import { createStaffMember } from "@/app/actions/auth"
import { Shield, Users } from "lucide-react"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

const prisma = new PrismaClient()

// The master list of available permissions
const PERMISSION_CATALOG = [
  'load.create',
  'load.assign_carrier',
  'load.override_compliance_flag',
  'rate.confirm',
  'load.update_status',
  'staff.manage',
  'pod.upload'
]

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions)
  const user = session?.user

  if (!user || !user.rolePermissions?.includes('staff.manage') || !user.organizationId) {
    redirect('/dashboard')
  }

  const roles = await prisma.role.findMany({
    where: { organizationId: user.organizationId }
  })

  const staff = await prisma.user.findMany({
    where: { organizationId: user.organizationId },
    include: { role: true }
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Team & Roles</h1>
        <p className="text-slate-400">Manage your organization's staff members and define custom access roles.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Custom Role Builder */}
        <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Shield size={24} className="text-indigo-400" />
            <h2 className="text-xl font-bold text-white">Custom Roles</h2>
          </div>
          
          <form action={async (formData) => {
            "use server"
            const name = formData.get('name') as string
            const permissions = formData.getAll('permissions') as string[]
            await createRole({ name, permissions })
          }} className="space-y-4 mb-8">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Role Name</label>
              <input type="text" name="name" required placeholder="e.g., Senior Dispatcher" className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500" />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Permissions Catalog</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-950/50 p-4 rounded-xl border border-white/5">
                {PERMISSION_CATALOG.map(perm => (
                  <label key={perm} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input type="checkbox" name="permissions" value={perm} className="rounded border-white/10 bg-slate-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900" />
                    {perm.replace('_', ' ')}
                  </label>
                ))}
              </div>
            </div>
            <button type="submit" className="w-full px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-medium text-sm transition-colors">
              Create Custom Role
            </button>
          </form>

          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Existing Roles</h3>
            <div className="space-y-2">
              {roles.map(role => (
                <div key={role.id} className="p-3 bg-slate-800/50 rounded-lg border border-white/5">
                  <p className="font-bold text-white text-sm">{role.name}</p>
                  <p className="text-xs text-slate-500 mt-1 truncate">{JSON.parse(role.permissions).join(', ')}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Staff Management */}
        <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Users size={24} className="text-blue-400" />
            <h2 className="text-xl font-bold text-white">Staff Members</h2>
          </div>
          
          <form action={async (formData) => {
            "use server"
            await createStaffMember({
              name: formData.get('name') as string,
              email: formData.get('email') as string,
              password: formData.get('password') as string,
              roleId: formData.get('roleId') as string
            })
            revalidatePath('/dashboard/admin')
          }} className="space-y-4 mb-8">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Name</label>
                <input type="text" name="name" required className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-white/10 text-sm text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Assign Role</label>
                <select name="roleId" required className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-white/10 text-sm text-white focus:outline-none focus:border-blue-500">
                  <option value="">Select a role...</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email</label>
                <input type="email" name="email" required className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-white/10 text-sm text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Temporary Password</label>
                <input type="password" name="password" required className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-white/10 text-sm text-white focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            <button type="submit" className="w-full px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/50 hover:bg-blue-500/30 text-blue-400 font-medium text-sm transition-colors">
              Invite Staff Member
            </button>
          </form>

          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Active Staff</h3>
            <div className="space-y-2">
              {staff.map(member => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-white/5 text-sm">
                  <div>
                    <p className="font-bold text-white">{member.name} {member.id === user.id && <span className="text-xs font-normal text-slate-500 ml-2">(You)</span>}</p>
                    <p className="text-xs text-slate-400">{member.email}</p>
                  </div>
                  <span className="px-2 py-1 rounded bg-slate-700 text-slate-300 text-xs font-medium">
                    {member.role?.name || 'No Role'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
