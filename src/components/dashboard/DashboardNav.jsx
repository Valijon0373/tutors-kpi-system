import {
  ClipboardCheck,
  GraduationCap,
  Info,
  Landmark,
  LayoutDashboard,
  Settings,
  User,
  Users,
} from "lucide-react"

export const DASHBOARD_NAV = [
  { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  {
    id: "fakultetlar",
    label: "Fakultetlar",
    Icon: Landmark,
    iconStroke: 1.25,
    inactiveClassLight: "text-slate-700",
  },
  { id: "foydalanuvchilar", label: "Foydalanuvchilar", Icon: User },
  { id: "oqituvchilar", label: "Tyutorlar", Icon: Users },
  { id: "mezonlar", label: "Mezonlar", Icon: ClipboardCheck },
  { id: "sozlamalar", label: "Sozlamalar", Icon: Settings },
  { id: "biz-haqimizda", label: "Biz haqimizda", Icon: Info },
]


export function getDashboardNavLabel(activeNav) {
  return DASHBOARD_NAV.find((n) => n.id === activeNav)?.label ?? "Administrator"
}

export default function DashboardNav({ dark, activeNav, onChange, tealBgClass = "bg-teal-500", visibleIds }) {
  const items =
    visibleIds == null ? DASHBOARD_NAV : DASHBOARD_NAV.filter((item) => visibleIds.includes(item.id))

  return (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {items.map((item) => {
        const active = activeNav === item.id
        const NavItemIcon = item.Icon
        const stroke = item.iconStroke ?? 1.5
        const inactiveLight = item.inactiveClassLight ?? "text-slate-600"
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange?.(item.id)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
              active
                ? `font-medium ${tealBgClass} text-white shadow-md shadow-teal-900/20`
                : `font-medium ${dark ? "text-slate-300 hover:bg-slate-700/80" : `${inactiveLight} hover:bg-slate-50`}`
            }`}
          >
            <NavItemIcon className={`h-5 w-5 shrink-0 ${active ? "" : "opacity-95"}`} strokeWidth={stroke} aria-hidden />
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}
