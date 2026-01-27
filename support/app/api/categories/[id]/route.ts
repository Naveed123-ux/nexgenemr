import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { requireAdmin } from "@/lib/auth"
import { ObjectId } from "mongodb"
import type { CategoryDoc } from "@/lib/types"

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const db = await getDb()
  const category = await db.collection<CategoryDoc>("categories").findOne({ _id: new ObjectId(params.id) })
  if (!category) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const articles = await db.collection("articles").find({ categoryId: params.id }).toArray()
  return NextResponse.json({ ...category, articles })
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = (await req.json()) as Partial<CategoryDoc>
  const db = await getDb()
  await db.collection<CategoryDoc>("categories").updateOne({ _id: new ObjectId(params.id) }, { $set: { ...body } })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const db = await getDb()
  await db.collection("categories").deleteOne({ _id: new ObjectId(params.id) })
  await db.collection("articles").deleteMany({ categoryId: params.id })
  return NextResponse.json({ ok: true })
}
