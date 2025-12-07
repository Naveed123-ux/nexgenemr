import { getDb } from "@/lib/mongodb"
import type { CategoryDoc, ArticleDoc } from "@/lib/types"
import { helpData } from "@/lib/seed-data"

// Next.js scripts: run from the Scripts panel. Uses console.log for output.
export default async function run() {
  const db = await getDb()
  const categories = db.collection<CategoryDoc>("categories")
  const articles = db.collection<ArticleDoc>("articles")

  console.log("[v0] Clearing collections...")
  await categories.deleteMany({})
  await articles.deleteMany({})

  console.log("[v0] Inserting categories and articles...")
  const catIdMap = new Map<string, string>()
  for (const c of helpData) {
    const { insertedId } = await categories.insertOne({ title: c.title, description: c.description, icon: c.icon })
    catIdMap.set(c.id, String(insertedId))
    for (const a of c.articles) {
      await articles.insertOne({ title: a.title, content: a.content, categoryId: String(insertedId) })
    }
  }

  console.log("[v0] Seed completed.")
}
