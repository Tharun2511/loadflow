"use client"

import { useFormStatus } from "react-dom"

// Drop-in submit button that disables itself and shows a pending label while
// its enclosing <form>'s server action is running. Server actions here hit a
// remote (Neon) DB, so click feedback matters.
export function SubmitButton({
  children,
  className,
  pendingLabel,
}: {
  children: React.ReactNode
  className?: string
  pendingLabel?: string
}) {
  const { pending } = useFormStatus()

  return (
    <button type="submit" disabled={pending} className={`${className ?? ""} disabled:opacity-60 disabled:cursor-not-allowed`}>
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          {pendingLabel ?? "Working..."}
        </span>
      ) : (
        children
      )}
    </button>
  )
}
