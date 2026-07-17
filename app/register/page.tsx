"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { registerOrganization, registerShipper } from "@/app/actions/auth"
import { ArrowLeft, ArrowRight, Building2, Truck, UserCircle } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const [accountType, setAccountType] = useState<"BROKER" | "CARRIER" | "SHIPPER">("BROKER")
  
  const [formData, setFormData] = useState({
    orgName: "",
    adminName: "",
    email: "",
    password: ""
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      if (accountType === 'SHIPPER') {
        await registerShipper({
          name: formData.adminName,
          email: formData.email,
          password: formData.password
        })
      } else {
        await registerOrganization({
          orgType: accountType,
          orgName: formData.orgName,
          adminName: formData.adminName,
          adminEmail: formData.email,
          adminPassword: formData.password
        })
      }
      router.push("/login")
    } catch (err: any) {
      setError(err.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[20%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute bottom-[20%] right-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-xl p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-indigo-200/60 hover:text-white transition-colors mb-6">
          <ArrowLeft size={16} /> Back to home
        </Link>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300 mb-2">Create an Account</h1>
          <p className="text-indigo-200/60 text-sm font-medium">Join the LoadFlow network</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium text-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mb-8">
          {(['BROKER', 'CARRIER', 'SHIPPER'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setAccountType(type)}
              className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                accountType === type 
                  ? 'bg-indigo-500/20 border-indigo-400/50 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]' 
                  : 'bg-white/5 border-white/10 text-indigo-200/60 hover:bg-white/10 hover:border-white/20'
              }`}
            >
              {type === 'BROKER' && <Building2 size={24} />}
              {type === 'CARRIER' && <Truck size={24} />}
              {type === 'SHIPPER' && <UserCircle size={24} />}
              <span className="text-xs font-bold uppercase tracking-wider">{type}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {accountType !== 'SHIPPER' && (
            <div>
              <label className="block text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-2">Organization Name</label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                placeholder={accountType === 'BROKER' ? "Acme Brokerage LLC" : "Fast Freight Carriers"}
                value={formData.orgName}
                onChange={(e) => setFormData({...formData, orgName: e.target.value})}
              />
            </div>
          )}
          
          <div>
            <label className="block text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-2">
              {accountType === 'SHIPPER' ? 'Your Name' : 'Admin Name'}
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
              placeholder="John Doe"
              value={formData.adminName}
              onChange={(e) => setFormData({...formData, adminName: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-2">Email</label>
            <input
              type="email"
              required
              className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
              placeholder="you@company.com"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-2">Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-4 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-white font-semibold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Account"}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-indigo-200/60">
            Already have an account?{' '}
            <a href="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  )
}
