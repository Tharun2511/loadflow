"use client"

import Link from "next/link"
import { AlertTriangle, RotateCw, LayoutDashboard } from "lucide-react"

// Catches errors thrown by server actions / rendering within the dashboard
// (e.g. "Email already in use", "Invalid state transition", a blocked
// permission) so the user sees a recoverable message instead of a crash.
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // NextAuth "Forbidden"/"Unauthorized" surface as generic server errors in prod;
  // show the message we do have, with a clear way back.
  const message = error?.message && error.message !== "An error occurred in the Server Components render."
    ? error.message
    : "Something went wrong while completing that action."

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-md w-full text-center bg-slate-900/40 border border-white/10 rounded-2xl p-8">
        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle size={26} className="text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">That didn&apos;t work</h1>
        <p className="text-sm text-slate-400 mb-6">{message}</p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-medium text-sm transition-colors"
          >
            <RotateCw size={16} /> Try again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-medium text-sm transition-colors border border-white/10"
          >
            <LayoutDashboard size={16} /> Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
