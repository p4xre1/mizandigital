import { AnimatedCount } from "./AnimatedCount"

export interface StatItem {
  value: number
  label: string
}

/**
 * شريط الأرقام في الصفحة الرئيسية. كل رقم من بيانات البناء (counts.json)،
 * ويُحذف أي رقم يساوي 0 بدل أن يظهر «0» للزائر.
 */
export function HomeStatsBand({ items }: { items: StatItem[] }) {
  const visible = items.filter((item) => item.value > 0)
  if (visible.length === 0) return null

  return (
    <section className="py-10 bg-[#2563eb] dark:bg-[#1e40af] text-white" aria-label="ميزان بالأرقام">
      <div className="container mx-auto max-w-[1280px] px-6">
        <dl className={`grid gap-6 text-center grid-cols-2 ${visible.length >= 4 ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
          {visible.map((item) => (
            <div key={item.label}>
              <dt className="text-[13px] font-bold text-white">{item.label}</dt>
              <dd className="m-0 mt-1 text-[32px] md:text-[36px] font-black leading-none">
                <AnimatedCount value={item.value} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
