"use client"

import useSWR from "swr"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { LogOut, FolderOpen, FileText, Trash2, ExternalLink, Plus, Layers } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function DashboardClient() {
  const { data: categories, mutate: mutCats, isLoading: catsLoading } = useSWR("/api/categories", fetcher)
  const [catTitle, setCatTitle] = useState("")
  const [catDesc, setCatDesc] = useState("")
  const [catSubmitting, setCatSubmitting] = useState(false)

  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const { data: articles, mutate: mutArts, isLoading: artsLoading } = useSWR(
    selectedCat ? `/api/articles?categoryId=${selectedCat}` : null,
    fetcher,
  )

  const [artTitle, setArtTitle] = useState("")
  const [artContent, setArtContent] = useState("")
  const [artSubmitting, setArtSubmitting] = useState(false)

  async function createCategory() {
    setCatSubmitting(true)
    try {
      await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: catTitle, description: catDesc }),
      })
      setCatTitle("")
      setCatDesc("")
      mutCats()
    } finally {
      setCatSubmitting(false)
    }
  }

  async function deleteCategory(id: string) {
    if (!confirm("Are you sure you want to delete this category? All articles in it will remain.")) return
    await fetch(`/api/categories/${id}`, { method: "DELETE" })
    if (selectedCat === id) setSelectedCat(null)
    mutCats()
  }

  async function createArticle() {
    if (!selectedCat) return
    setArtSubmitting(true)
    try {
      await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: artTitle, content: artContent, categoryId: selectedCat }),
      })
      setArtTitle("")
      setArtContent("")
      mutArts()
    } finally {
      setArtSubmitting(false)
    }
  }

  async function deleteArticle(id: string) {
    if (!confirm("Are you sure you want to delete this article?")) return
    await fetch(`/api/articles/${id}`, { method: "DELETE" })
    mutArts()
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" })
    window.location.href = "/"
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#388fe5] text-white">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Help Center</h1>
                <p className="text-xs text-gray-500">Admin Dashboard</p>
              </div>
            </div>
            <Button variant="outline" onClick={logout} className="gap-2">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-50 text-[#388fe5]">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <CardTitle className="text-xl">Categories</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-3">
                <Input
                  placeholder="Category Title"
                  value={catTitle}
                  onChange={(e) => setCatTitle(e.target.value)}
                  className="h-11"
                />
                <Input
                  placeholder="Category Description"
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  className="h-11"
                />
                <Button
                  onClick={createCategory}
                  disabled={!catTitle || !catDesc || catSubmitting}
                  className="w-full h-11 bg-[#388fe5] hover:bg-[#6db03f] text-white gap-2"
                >
                  {catSubmitting ? (
                    <>
                      <Spinner size="sm" className="text-white" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Add Category
                    </>
                  )}
                </Button>
              </div>

              <Separator />

              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {catsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Spinner size="lg" className="text-blue-600" />
                  </div>
                ) : categories?.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No categories yet</p>
                  </div>
                ) : (
                  categories?.map((c: any) => (
                    <div
                      key={c._id}
                      className={`rounded-xl border-2 p-4 transition-all cursor-pointer ${selectedCat === c._id
                        ? "border-[#388fe5] bg-green-50"
                        : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                        }`}
                      onClick={() => setSelectedCat(c._id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 mb-1">{c.title}</h3>
                          <p className="text-sm text-gray-600 mb-2">{c.description}</p>
                          <Badge variant="secondary" className="text-xs">
                            {c.articleCount} articles
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteCategory(c._id)
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-gray-200">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-50 text-[#388fe5]">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl">Articles</CardTitle>
                  {!selectedCat && <p className="text-sm text-gray-500 mt-0.5">Select a category first</p>}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-3">
                <Input
                  placeholder="Article Title"
                  value={artTitle}
                  onChange={(e) => setArtTitle(e.target.value)}
                  disabled={!selectedCat}
                  className="h-11"
                />
                <Textarea
                  placeholder="Article content in Markdown format..."
                  value={artContent}
                  onChange={(e) => setArtContent(e.target.value)}
                  rows={8}
                  disabled={!selectedCat}
                  className="resize-none"
                />
                <Button
                  onClick={createArticle}
                  disabled={!selectedCat || !artTitle || !artContent || artSubmitting}
                  className="w-full h-11 bg-[#388fe5] hover:bg-[#6db03f] text-white gap-2"
                >
                  {artSubmitting ? (
                    <>
                      <Spinner size="sm" className="text-white" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Add Article
                    </>
                  )}
                </Button>
              </div>

              <Separator />

              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {artsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Spinner size="lg" className="text-[#388fe5]" />
                  </div>
                ) : !selectedCat ? (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Select a category to view articles</p>
                  </div>
                ) : articles?.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No articles in this category</p>
                  </div>
                ) : (
                  articles?.map((a: any) => (
                    <div key={a._id} className="rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 mb-1">{a.title}</h3>
                          <p className="text-sm text-gray-600 line-clamp-2 mb-3">{a.content}</p>
                          <div className="flex items-center gap-2">
                            <a
                              href={`/article/${a._id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-sm text-[#388fe5] hover:opacity-80-700 hover:underline"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              View Article
                            </a>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteArticle(a._id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
