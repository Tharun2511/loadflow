import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"
import { createRole, deleteRole, removeStaff } from "@/app/actions/admin"
import { createStaffMember } from "@/app/actions/auth"
import { PERMISSION_CATALOG } from "@/lib/permissions"
import { SubmitButton } from "@/components/submit-button"
import { Shield, Users, Trash2, ArrowLeft } from "lucide-react"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import Link from "next/link"

const prisma = new PrismaClient()

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions)
  const user = session?.user

  if (!user || !user.rolePermissions?.includes('staff.manage') || !user.organizationId) {
    redirect('/dashboard')
  }

  // Only surface permissions relevant to this org type.
  const catalog = PERMISSION_CATALOG.filter(
    (p) => p.scope === "BOTH" || p.scope === user.type
  )

  const roles = await prisma.role.findMany({
    where: { organizationId: user.organizationId },
    include: { _count: { select: { users: true } } },
  })

  const staff = await prisma.user.findMany({
    where: { organizationId: user.organizationId },
    include: { role: true }
  })

  return (
    <div className="space-y-8">
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-3">
          <ArrowLeft size={16} /> Back to dashboard
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Team &amp; Roles</h1>
        <p className="text-slate-400">Manage your organization&apos;s staff members and define custom access roles.</p>
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
              <div className="grid grid-cols-1 gap-2 bg-slate-950/50 p-4 rounded-xl border border-white/5">
                {catalog.map(perm => (
                  <label key={perm.key} className="flex items-start gap-2 text-sm text-slate-300 cursor-pointer hover:bg-white/5 rounded-lg p-1.5 -m-0.5">
                    <input type="checkbox" name="permissions" value={perm.key} className="mt-0.5 rounded border-white/10 bg-slate-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900" />
                    <span>
                      <span className="font-medium text-white">{perm.label}</span>
                      <span className="block text-xs text-slate-500">{perm.description}</span>
                      <code className="text-[10px] text-slate-600">{perm.key}</code>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <SubmitButton pendingLabel="Creating..." className="w-full flex items-center justify-center px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-medium text-sm transition-colors">
              Create Custom Role
            </SubmitButton>
          </form>

          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Existing Roles</h3>
            <div className="space-y-2">
              {roles.map(role => (
                <div key={role.id} className="flex items-start justify-between gap-3 p-3 bg-slate-800/50 rounded-lg border border-white/5">
                  <div className="min-w-0">
                    <p className="font-bold text-white text-sm">{role.name} <span className="text-xs font-normal text-slate-500">· {role._count.users} staff</span></p>
                    <p className="text-xs text-slate-500 mt-1 truncate">{(JSON.parse(role.permissions) as string[]).join(', ') || 'No permissions'}</p>
                  </div>
                  {role.name !== 'Admin' && role._count.users === 0 && (
                    <form action={async () => {
                      "use server"
                      await deleteRole(role.id)
                    }}>
                      <button type="submit" title="Delete role" className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </form>
                  )}
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
            <SubmitButton pendingLabel="Inviting..." className="w-full flex items-center justify-center px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/50 hover:bg-blue-500/30 text-blue-400 font-medium text-sm transition-colors">
              Invite Staff Member
            </SubmitButton>
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
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded bg-slate-700 text-slate-300 text-xs font-medium">
                      {member.role?.name || 'No Role'}
                    </span>
                    {member.id !== user.id && (
                      <form action={async () => {
                        "use server"
                        await removeStaff(member.id)
                      }}>
                        <button type="submit" title="Remove staff" className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
