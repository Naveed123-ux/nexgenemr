import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import ReactMarkdown from "react-markdown"
import Link from "next/link"
import { Header } from "@/components/header"
import { ChevronLeft, FileText } from "lucide-react"

export default async function ArticlePage({ params }: { params: { id: string } }) {
  const db = await getDb()
  const article = await db.collection("articles").findOne({ _id: new ObjectId(params.id) })
  if (!article) return <main className="p-6">Article not found</main>

  const categoryId = article.categoryId
  const category = await db.collection("categories").findOne({ _id: new ObjectId(categoryId) })
  const allArticles = await db.collection("articles").find({ categoryId }).project({ title: 1 }).toArray()

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <section className="bg-[#388fe5] text-white py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href={`/category/${categoryId}`}
            className="inline-flex items-center gap-2 text-sm pr-2 font-medium mb-6 hover:underline opacity-100  rounded-lg bg-green-50 text-[#388fe5]  transition-opacity"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to {category?.title}
          </Link>
          <h1 className="text-3xl md:text-5xl font-bold">{article.title}</h1>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid lg:grid-cols-[280px_1fr] gap-8">
          <aside className="lg:sticky lg:top-8 h-fit">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                <FileText className="w-5 h-5 text-[#388fe5]" />
                <h2 className="font-semibold text-gray-900">{category?.title}</h2>
              </div>
              <nav className="space-y-1">
                {allArticles.map((a: any) => (
                  <Link
                    key={String(a._id)}
                    href={`/article/${String(a._id)}`}
                    className={`block px-3 py-2.5 rounded-lg text-sm transition-colors ${String(a._id) === params.id
                        ? "bg-green-50 text-[#388fe5] font-semibold"
                        : "text-gray-700 hover:bg-gray-50"
                      }`}
                  >
                    {a.title}
                  </Link>
                ))}
              </nav>
            </div>
          </aside>

          <article className="bg-white rounded-xl border border-gray-200 p-6 md:p-10 shadow-sm prose prose-lg max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:text-gray-700 prose-p:leading-relaxed prose-a:text-blue-600 prose-strong:text-gray-900 prose-code:text-blue-600 prose-code:bg-blue-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded">
            <ReactMarkdown>{article.content}</ReactMarkdown>
          </article>
        </div>
      </section>
    </div>
  )
}
