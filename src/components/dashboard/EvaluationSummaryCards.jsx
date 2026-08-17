import { BarChart3, ClipboardList, FileText, Trophy } from "lucide-react"
import { CRITERIA, TOTAL_MAX_SCORE } from "../../data/criteria.js"

/** Dashboard: umumiy natija — jami ball, yuklangan fayllar va mezonlar soni */
export default function EvaluationSummaryCards({ dark, totalFiles = 0 }) {
  const subtitle = dark ? "text-slate-400" : "text-slate-500"
  const titleClr = dark ? "text-slate-100" : "text-slate-900"
  const cardBase = dark ? "border-slate-600 bg-slate-800" : "border-slate-200 bg-white shadow-sm"

  const statCards = [
    {
      key: "files",
      icon: FileText,
      iconWrap: dark ? "bg-teal-500/15 text-teal-300" : "bg-teal-50 text-teal-600",
      value: String(totalFiles),
      label: "Jami yuklangan fayllar",
    },
    {
      key: "criteria",
      icon: ClipboardList,
      iconWrap: dark ? "bg-violet-500/15 text-violet-300" : "bg-violet-50 text-violet-600",
      value: String(CRITERIA.length),
      label: "Mezonlar soni",
    },
  ]


  return (
    <div className="space-y-4">
      <div className="dashboard-stat-in" style={{ animationDelay: "0ms" }}>
        <h2 className={`text-xl font-bold tracking-tight sm:text-2xl ${titleClr}`}>Umumiy natija</h2>
        <p className={`mt-1 text-sm ${subtitle}`}>Mezonlar bo'yicha yig'ilgan ball va holat</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {statCards.map(({ key, icon: Icon, iconWrap, value, label, extra }, i) => (
          <div
            key={key}
            className={`dashboard-stat-in rounded-xl border p-4 ${cardBase}`}
            style={{ animationDelay: `${70 + i * 75}ms` }}
          >
            <div className="flex items-start gap-3">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconWrap}`}>
                <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-lg font-bold tracking-tight ${titleClr}`}>{value}</p>
                <p className={`text-sm ${subtitle}`}>{label}</p>
                {extra}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
