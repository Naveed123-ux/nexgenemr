import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { requireAdmin } from "@/lib/auth"
import type { ArticleDoc } from "@/lib/types"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const categoryId = searchParams.get("categoryId") || undefined
  const db = await getDb()
  const query = categoryId ? { categoryId } : {}
  const articles = await db.collection<ArticleDoc>("articles").find(query).project({}).toArray()
  return NextResponse.json(articles)
}

export async function POST(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = (await req.json()) as ArticleDoc
  if (!body.title || !body.content || !body.categoryId) {
    return NextResponse.json({ error: "title, content, categoryId required" }, { status: 400 })
  }
  const now = new Date().toISOString()
  const db = await getDb()
  const r = await db.collection<ArticleDoc>("articles").insertOne({
    title: body.title,
    content: body.content,
    categoryId: body.categoryId,
    createdAt: now,
    updatedAt: now,
  })
  return NextResponse.json({ _id: r.insertedId, ...body })
}
