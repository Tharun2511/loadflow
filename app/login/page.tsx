"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (res?.error) {
      setError("Invalid credentials")
    } else {
      router.push("/dashboard")
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300 mb-2 tracking-tight">LoadFlow</h1>
          <p className="text-indigo-200/60 text-sm font-medium">Freight Brokerage Operations Suite</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-2">Email</label>
            <input
              type="email"
              required
              className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
              placeholder="admin@brokerage.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-2">Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-white font-semibold shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] transition-all active:scale-[0.98]"
          >
            Sign In
          </button>
        </form>
        
        <div className="mt-8 text-center">
          <p className="text-sm text-indigo-200/60">
            Don't have an organization yet?{' '}
            <a href="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">Register here</a>
          </p>
        </div>
      </div>
    </div>
  )
}
