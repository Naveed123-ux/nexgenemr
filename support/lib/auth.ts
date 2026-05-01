import { cookies } from "next/headers"
import { SignJWT, jwtVerify } from "jose"
import { getDb } from "./mongodb"
import type { UserDoc } from "./types"
import bcrypt from "bcryptjs"

const AUTH_COOKIE = "session"
const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "change-me")

export async function signIn(email: string, password: string) {
  const db = await getDb()
  const users = db.collection<UserDoc>("users")
  const user = await users.findOne({ email })
  if (!user) return null
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return null

  const token = await new SignJWT({ sub: user._id, role: user.role, email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret)

  cookies().set({
    name: AUTH_COOKIE,
    value: token,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: true,
    maxAge: 60 * 60 * 24 * 7,
  })

  return { email: user.email, role: user.role }
}

export function signOut() {
  cookies().set({
    name: AUTH_COOKIE,
    value: "",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: true,
    maxAge: 0,
  })
}

export async function getSession() {
  const token = (await cookies()).get(AUTH_COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as { sub?: string; role?: string; email?: string }
  } catch {
    return null
  }
}

export async function requireAdmin() {
  const session = await getSession()
  if (!session || session.role !== "admin") {
    return null
  }
  return session
}
