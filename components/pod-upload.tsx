"use client"

import { useState, useRef } from "react"
import { uploadPod } from "@/app/actions/load"
import { UploadCloud } from "lucide-react"

// Reads a chosen file into a base64 data-URL on the client and hands it to
// the `uploadPod` server action. Base64-in-DB keeps the app serverless-safe
// (no external object storage required).
export function PodUpload({ loadId }: { loadId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 3 * 1024 * 1024) {
      setError("File must be under 3 MB")
      return
    }

    setError("")
    setLoading(true)
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error("Could not read file"))
        reader.readAsDataURL(file)
      })

      await uploadPod({ loadId, fileName: file.name, fileType: file.type, dataUrl })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div>
      <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-medium text-sm transition-colors cursor-pointer">
        <UploadCloud size={16} />
        {loading ? "Uploading..." : "Upload POD"}
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={handleFile}
          disabled={loading}
          className="hidden"
        />
      </label>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )
}
