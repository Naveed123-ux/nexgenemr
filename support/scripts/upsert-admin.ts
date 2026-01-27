import { getDb } from "@/lib/mongodb"
import bcrypt from "bcryptjs"
import type { UserDoc } from "@/lib/types"

export default async function run() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) {
    console.log("[v0] Please add ADMIN_EMAIL and ADMIN_PASSWORD in Vars, then run again.")
    return
  }
  const db = await getDb()
  const users = db.collection<UserDoc>("users")
  const hash = await bcrypt.hash(password, 10)
  await users.updateOne(
    { email },
    { $set: { email, passwordHash: hash, role: "admin", createdAt: new Date().toISOString() } },
    { upsert: true },
  )
  console.log("[v0] Admin user upserted:", email)
}
