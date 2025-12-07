import { getDb } from "@/lib/mongodb"
import Link from "next/link"
import { ObjectId } from "mongodb"
import { Header } from "@/components/header"
import { ChevronLeft, FileText, Rocket } from "lucide-react"

export default async function CategoryPage({ params }: { params: { id: string } }) {
  const db = await getDb()
  const category = await db.collection("categories").findOne({ _id: new ObjectId(params.id) })
  if (!category) return <main className="p-6">Category not found</main>
  const articles = await db
    .collection("articles")
    .find({ categoryId: params.id })
    .project({ content: 1, title: 1 })
    .toArray()

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <section className="bg-[#388fe5] text-white py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm pr-2 font-medium mb-6 hover:underline opacity-100  rounded-lg bg-green-50 text-[#388fe5]  transition-opacity"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Help Center
          </Link>
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-white/10 backdrop-blur-sm">
              <Rocket className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl md:text-5xl font-bold mb-3">{category.title}</h1>
              <p className="text-lg opacity-95">{category.description}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid gap-4">
          {articles.map((a: any) => (
            <Link
              key={String(a._id)}
              href={`/article/${String(a._id)}`}
              className="group bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-green-200 transition-all duration-200"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-green-50 text-[#388fe5] group-hover:bg-green-100 transition-colors">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-[#388fe5] transition-colors">
                    {a.title}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{a.content}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
