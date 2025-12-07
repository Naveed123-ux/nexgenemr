import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { requireAdmin } from "@/lib/auth"
import type { CategoryDoc } from "@/lib/types"

export async function GET() {
  const db = await getDb()
  const categories = await db.collection<CategoryDoc>("categories").find({}).toArray()
  // compute article counts
  const articles = db.collection("articles")
  const counts = await articles.aggregate([{ $group: { _id: "$categoryId", count: { $sum: 1 } } }]).toArray()
  const map = new Map(counts.map((c) => [c._id, c.count]))
  return NextResponse.json(categories.map((c) => ({ ...c, articleCount: map.get(String(c._id)) || 0 })))
}

export async function POST(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = (await req.json()) as CategoryDoc
  if (!body.title || !body.description) {
    return NextResponse.json({ error: "title and description required" }, { status: 400 })
  }
  const db = await getDb()
  const r = await db.collection<CategoryDoc>("categories").insertOne({
    title: body.title,
    description: body.description,
    icon: body.icon || "File",
  })
  return NextResponse.json({ _id: r.insertedId, ...body })
}
