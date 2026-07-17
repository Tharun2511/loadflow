import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function DashboardRedirect() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect("/login")
  }

  // Redirect based on role
  switch (session.user.type) {
    case 'BROKER':
      redirect("/dashboard/broker")
    case 'CARRIER':
      redirect("/dashboard/carrier")
    case 'SHIPPER':
      redirect("/dashboard/shipper")
    default:
      redirect("/login")
  }
}
