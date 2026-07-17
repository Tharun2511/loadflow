import Link from "next/link"
import { ArrowRight, Truck, ShieldCheck, BarChart3 } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 overflow-hidden relative">
      {/* Background Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/20 blur-[100px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Truck className="text-white" size={24} />
          </div>
          LoadFlow
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            Log In
          </Link>
          <Link href="/register" className="px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-md text-sm font-medium transition-all">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32 text-center">
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8">
          The Operating System for <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">Modern Freight</span>
        </h1>
        
        <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-400 mb-10 leading-relaxed">
          Connect shippers, brokers, and carriers on a single, secure platform. 
          Manage loads, negotiate rates, and enforce compliance automatically.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/register" className="px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-white font-semibold text-lg shadow-[0_0_30px_rgba(79,70,229,0.3)] hover:shadow-[0_0_40px_rgba(79,70,229,0.5)] transition-all flex items-center gap-2">
            Start the Demo <ArrowRight size={20} />
          </Link>
        </div>

        {/* Feature Highlights */}
        <div className="grid md:grid-cols-3 gap-6 mt-32 text-left">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4 text-blue-400">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">Automated Compliance</h3>
            <p className="text-slate-400 text-sm">Strict RBAC and automated carrier checks block unauthorized dispatching and out-of-date insurance.</p>
          </div>
          
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-lg bg-indigo-500/20 flex items-center justify-center mb-4 text-indigo-400">
              <BarChart3 size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">Smart Workflows</h3>
            <p className="text-slate-400 text-sm">State machine-driven load lifecycles from posting to delivery with immutable audit trails.</p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4 text-purple-400">
              <Truck size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">Unified Network</h3>
            <p className="text-slate-400 text-sm">Dedicated portals for Brokers, Carriers, and Shippers with object-level data scoping.</p>
          </div>
        </div>
      </main>
    </div>
  )
}
