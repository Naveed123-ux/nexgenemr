import { getDb } from "@/lib/mongodb"
import Link from "next/link"
import { Header } from "@/components/header"
import { Search, Rocket, User, Zap, AlertCircle, CreditCard, ArrowRight } from "lucide-react"

export default async function HomePage() {
  const db = await getDb()
  const categories = await db.collection("categories").find({}).toArray()
  const counts = await db
    .collection("articles")
    .aggregate([{ $group: { _id: "$categoryId", count: { $sum: 1 } } }])
    .toArray()
  const map = new Map(counts.map((c: any) => [String(c._id), c.count]))

  const categoryIcons: Record<string, any> = {
    "Getting Started": Rocket,
    "Account Management": User,
    "Features & Tools": Zap,
    "Troubleshooting": AlertCircle,
    "Billing & Subscriptions": CreditCard,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <section className="bg-[#388fe5] text-white py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-6xl font-bold text-center mb-6">
            How can we help you?
          </h1>
          <p className="text-center text-lg md:text-xl opacity-95 mb-8 max-w-3xl mx-auto">
            Find answers, learn about features, and get the most out of our platform
          </p>
          <div className="max-w-2xl mx-auto relative bg-white rounded-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="search"
              placeholder="Search for articles..."
              className="w-full pl-12 pr-4 py-4 rounded-xl text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-white shadow-lg"
            />
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((c: any) => {
            const Icon = categoryIcons[c.title] || Zap
            return (
              <Link
                key={String(c._id)}
                href={`/category/${String(c._id)}`}
                className="group bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-green-50 text-[#388fe5] group-hover:bg-green-100 transition-colors">
                    <Icon className="w-6 h-6" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#388fe5] group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900">{c.title}</h3>
                <p className="text-sm text-gray-600 mb-3 leading-relaxed">{c.description}</p>
                <p className="text-xs text-gray-500 font-medium">{map.get(String(c._id)) || 0} articles</p>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl p-8 md:p-12 text-center shadow-sm">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gray-900">Still need help?</h2>
          <p className="text-gray-600 mb-8 text-base md:text-lg max-w-2xl mx-auto">
            Can&apos;t find what you&apos;re looking for? Our support team is here to help.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a
              href="#"
              className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-[#388fe5] text-white font-semibold hover:bg-[#388fe5] transition-colors shadow-md"
            >
              Contact Support
            </a>
            <a
              href="#"
              className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:border-gray-400 hover:bg-gray-50 transition-all"
            >
              Community Forum
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
