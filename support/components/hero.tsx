import { cn } from "@/lib/utils"

export function Hero({ title, subtitle, className }: { title: string; subtitle?: string; className?: string }) {
  return (
    <section className={cn("bg-primary text-primary-foreground", className)}>
      <div className="max-w-6xl mx-auto p-8 md:p-12">
        <h1 className="text-3xl md:text-5xl font-semibold text-center text-balance">{title}</h1>
        {subtitle ? <p className="mt-3 text-center text-lg opacity-90">{subtitle}</p> : null}
      </div>
    </section>
  )
}
