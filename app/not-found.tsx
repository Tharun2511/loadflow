import Link from "next/link"
import { Compass } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50 p-4">
      <div className="max-w-md w-full text-center bg-slate-900/40 border border-white/10 rounded-2xl p-10">
        <div className="w-14 h-14 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-5">
          <Compass size={26} className="text-indigo-400" />
        </div>
        <p className="text-5xl font-extrabold text-white mb-2">404</p>
        <h1 className="text-lg font-bold text-white mb-2">Page not found</h1>
        <p className="text-sm text-slate-400 mb-6">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/dashboard" className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-medium text-sm transition-colors">
            Go to dashboard
          </Link>
          <Link href="/" className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-medium text-sm transition-colors border border-white/10">
            Home
          </Link>
        </div>
      </div>
    </div>
  )
}
