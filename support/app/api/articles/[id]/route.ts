import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { requireAdmin } from "@/lib/auth"
import { ObjectId } from "mongodb"
import type { ArticleDoc } from "@/lib/types"

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const db = await getDb()
  const a = await db.collection<ArticleDoc>("articles").findOne({ _id: new ObjectId(params.id) })
  if (!a) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(a)
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = (await req.json()) as Partial<ArticleDoc>
  const db = await getDb()
  await db
    .collection<ArticleDoc>("articles")
    .updateOne({ _id: new ObjectId(params.id) }, { $set: { ...body, updatedAt: new Date().toISOString() } })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const db = await getDb()
  await db.collection("articles").deleteOne({ _id: new ObjectId(params.id) })
  return NextResponse.json({ ok: true })
}
