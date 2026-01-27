import { getSession } from "@/lib/auth"
import DashboardClient from "./ui/dashboard-client"

export default async function DashboardPage() {
  const session = await getSession()
  if (!session || session.role !== "admin") {
    // simple SSR redirect (no middleware required)
    return (
      <main className="min-h-dvh grid place-items-center">
        <a href="/login" className="underline">
          You must sign in to view the dashboard
        </a>
      </main>
    )
  }
  return <DashboardClient />
}
