import { useEffect, useMemo, useRef, useState } from "react"
import {
  ChevronDown,
  GraduationCap,
  Landmark,
  LogOut,
  Menu,
  Moon,
  Users as UsersIcon,
} from "lucide-react"
import { Link } from "react-router-dom"
import logoImg from "../../assets/logo.jpg"
import DashboardNav, { DASHBOARD_NAV, getDashboardNavLabel } from "./DashboardNav"
import EvaluationSummaryCards from "./EvaluationSummaryCards"
import Faculties from "./Faculties"
import Positions from "./Positions"
import Users from "./Users"
import Teachers from "./Teachers"
import Criteria from "./Criteria"
import Settings from "./Settings"
import AboutUs from "./AboutUs"
import AdminLogin from "../../components/admin/AdminLogin"
import { getAuthUsername, logout as apiLogout, verifyAdminSession } from "../../api/auth"
import { fetchUserByUsername } from "../../api/users"
import { SESSION_EXPIRED_EVENT } from "../../api/session"
import { fetchAllTeachers } from "../../api/teachers"
import { fetchTotalDocumentCount } from "../../api/teacherDocuments"
import FileTypeDistribution from "./FileTypeDistribution"
import FacultyFileBarChart from "./FacultyFileBarChart"

const TEAL = "#14b8a6"
const TEAL_BG = "bg-teal-500"

const STATS = {
  fakultetlar: 5,
  kafedralar: 15,
  foydalanuvchilar: 302,
  oqituvchilar: 0,
}

const ENTITY_COLORS = {
  fakultetlar: "#3b82f6",
  kafedralar: "#10b981",
  oqituvchilar: "#8b5cf6",
}

const MAVJUD_FAKULTETLAR = [
  { id: "f-1", nameUz: "Filologiya Fakulteti", nameRu: "Факультет филологии" },
  { id: "f-2", nameUz: "Pedagogika Fakulteti", nameRu: "Факультет Педагогики" },
  { id: "f-3", nameUz: "Aniq va tabiiy fanlar Fakulteti", nameRu: "Факультет точных и естественных наук" },
  { id: "f-4", nameUz: "Ijtimoiy va amaliy fanlar Fakulteti", nameRu: "Факультет социальных и прикладных наук" },
  { id: "f-5", nameUz: "Boshlang'ich ta'lim Fakulteti", nameRu: "Факультет начального образования" },
]

const KAFEDRALAR_ROYXATI = [
  {
    id: "k-1",
    nameUz: "Rus tili va adabiyoti kafedrasi",
    nameRu: "Кафедра русского языка и литературы",
    fakultet: "Filologiya Fakulteti",
  },
  {
    id: "k-2",
    nameUz: "O'zbek tili va adabiyoti kafedrasi",
    nameRu: "Кафедра узбекского языка и литературы",
    fakultet: "Filologiya Fakulteti",
  },
  {
    id: "k-3",
    nameUz: "Xorijiy tillar va tilshunoslik kafedrasi",
    nameRu: "Кафедра иностранных языков и лингвистики",
    fakultet: "Filologiya Fakulteti",
  },
  {
    id: "k-4",
    nameUz: "Pedagogika nazariyasi va tarix kafedrasi",
    nameRu: "Кафедра теории и истории педагогики",
    fakultet: "Pedagogika Fakulteti",
  },
  {
    id: "k-5",
    nameUz: "Psixologiya kafedrasi",
    nameRu: "Кафедра психологии",
    fakultet: "Pedagogika Fakulteti",
  },
  {
    id: "k-6",
    nameUz: "Maxsus pedagogika va inklyuziv ta'lim kafedrasi",
    nameRu: "Кафедра специальной педагогики и инклюзивного образования",
    fakultet: "Pedagogika Fakulteti",
  },
  {
    id: "k-7",
    nameUz: "Matematika va informatika o'qitish metodikasi kafedrasi",
    nameRu: "Кафедра методики преподавания математики и информатики",
    fakultet: "Aniq va tabiiy fanlar Fakulteti",
  },
  {
    id: "k-8",
    nameUz: "Fizika va astronomiya kafedrasi",
    nameRu: "Кафедра физики и астрономии",
    fakultet: "Aniq va tabiiy fanlar Fakulteti",
  },
  {
    id: "k-9",
    nameUz: "Kimyo va biologiya kafedrasi",
    nameRu: "Кафедра химии и биологии",
    fakultet: "Aniq va tabiiy fanlar Fakulteti",
  },
  {
    id: "k-10",
    nameUz: "Tarix va ijtimoiy fanlar kafedrasi",
    nameRu: "Кафедра истории и общественных наук",
    fakultet: "Ijtimoiy va amaliy fanlar Fakulteti",
  },
  {
    id: "k-11",
    nameUz: "Geografiya va ekologiya ta'limi kafedrasi",
    nameRu: "Кафедра географического и экологического образования",
    fakultet: "Ijtimoiy va amaliy fanlar Fakulteti",
  },
  {
    id: "k-12",
    nameUz: "Jismoniy tarbiya va sport kafedrasi",
    nameRu: "Кафедра физического воспитания и спорта",
    fakultet: "Ijtimoiy va amaliy fanlar Fakulteti",
  },
  {
    id: "k-13",
    nameUz: "Boshlang'ich ta'lim metodikasi kafedrasi",
    nameRu: "Кафедра методики начального образования",
    fakultet: "Boshlang'ich ta'lim Fakulteti",
  },
  {
    id: "k-14",
    nameUz: "Maktabgacha ta'lim kafedrasi",
    nameRu: "Кафедра дошкольного образования",
    fakultet: "Boshlang'ich ta'lim Fakulteti",
  },
  {
    id: "k-15",
    nameUz: "Bolalar rivojlanishi va ergonomika kafedrasi",
    nameRu: "Кафедра развития детей и эргономики",
    fakultet: "Boshlang'ich ta'lim Fakulteti",
  },
]

const LAVOZIMLAR_ROYXATI = [
  { id: "l-1", nameUz: "Kafedra mudiri" },
  { id: "l-2", nameUz: "Dekan o'rinbosari" },
  { id: "l-3", nameUz: "Dotsent" },
  { id: "l-4", nameUz: "Assistent" },
]

function pieGradient(slices) {
  let acc = 0
  const parts = slices.map((s) => {
    const start = acc
    acc += s.pct
    return `${s.color} ${start}% ${acc}%`
  })
  return `conic-gradient(${parts.join(", ")})`
}

export default function AdminDashboard() {
  const [authChecked, setAuthChecked] = useState(false)
  const [isAuthed, setIsAuthed] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 768px)").matches : true
  )
  const [activeNav, setActiveNav] = useState("dashboard")
  const [dark, setDark] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const adminUsername = getAuthUsername() || "admin"
  const [currentPermissions, setCurrentPermissions] = useState(/** @type {string[]} */ ([]))
  const [currentRoles, setCurrentRoles] = useState(/** @type {string[]} */ ([]))
  const [teacherCount, setTeacherCount] = useState(0)
  const [totalFiles, setTotalFiles] = useState(0)
  const profileRef = useRef(null)
  const mainScrollRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    verifyAdminSession().then((ok) => {
      if (!cancelled) {
        setIsAuthed(ok)
        setAuthChecked(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isAuthed) {
      setCurrentPermissions([])
      setCurrentRoles([])
      return
    }
    let cancelled = false
    const username = getAuthUsername()
    if (!username) return
    fetchUserByUsername(username)
      .then((u) => {
        if (cancelled) return
        setCurrentPermissions(Array.isArray(u?.permissions) ? u.permissions : [])
        setCurrentRoles(Array.isArray(u?.roles) ? u.roles.map(String) : [])
      })
      .catch(() => {
        if (!cancelled) {
          setCurrentPermissions([])
          setCurrentRoles([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [isAuthed])

  const hasAnyPermission = useMemo(() => {
    const set = new Set(currentPermissions.map((k) => String(k).trim().toLowerCase()))
    return (keys) => keys.some((k) => set.has(String(k).trim().toLowerCase()))
  }, [currentPermissions])

  const isAdmin = useMemo(() => currentRoles.some((r) => String(r).toUpperCase() === "ADMIN"), [currentRoles])

  const visibleNavIds = useMemo(() => {
    if (isAdmin) return DASHBOARD_NAV.map((n) => n.id)

    const ids = ["dashboard", "biz-haqimizda"]
    if (hasAnyPermission(["faculty_view", "faculty_create", "faculty_edit", "faculty_delete"])) ids.push("fakultetlar")
    if (hasAnyPermission(["position_view", "position_create", "position_edit", "position_delete"])) ids.push("lavozim")
    if (hasAnyPermission(["user_view", "user_create", "user_edit", "user_delete"])) ids.push("foydalanuvchilar")
    if (hasAnyPermission(["teacher_view", "teacher_create", "teacher_edit", "teacher_delete"])) ids.push("oqituvchilar")
    if (
      hasAnyPermission(["criteria_view", "criteria_create", "criteria_edit", "criteria_delete"]) ||
      hasAnyPermission(["category_view", "category_create", "category_edit", "category_delete"])
    ) {
      ids.push("mezonlar")
    }
    if (isAdmin || hasAnyPermission(["user_edit", "user_create", "user_delete"])) {
      ids.push("sozlamalar")
    }

    return ids

  }, [currentPermissions, hasAnyPermission, isAdmin])

  useEffect(() => {
    if (!visibleNavIds.includes(activeNav)) {
      setActiveNav("dashboard")
    }
  }, [activeNav, visibleNavIds])

  useEffect(() => {
    const onSessionExpired = () => {
      setProfileOpen(false)
      setIsAuthed(false)
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)")
    const onChange = () => {
      if (mq.matches) setSidebarOpen(true)
    }
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  useEffect(() => {
    if (!isAuthed) return
    let cancelled = false
    const loadStats = async () => {
      try {
        const teachers = await fetchAllTeachers()
        if (!cancelled) setTeacherCount(teachers.length)
      } catch {
        if (!cancelled) setTeacherCount(0)
      }
      try {
        const count = await fetchTotalDocumentCount()
        if (!cancelled) setTotalFiles(count)
      } catch {
        if (!cancelled) setTotalFiles(0)
      }
    }
    loadStats()
    return () => {
      cancelled = true
    }
  }, [isAuthed])

  useEffect(() => {
    if (!profileOpen) return
    const onDown = (e) => {
      if (e.key === "Escape") setProfileOpen(false)
    }
    const onClick = (e) => {
      const root = profileRef.current
      if (!root) return
      if (root.contains(e.target)) return
      setProfileOpen(false)
    }
    window.addEventListener("keydown", onDown)
    window.addEventListener("mousedown", onClick)
    return () => {
      window.removeEventListener("keydown", onDown)
      window.removeEventListener("mousedown", onClick)
    }
  }, [profileOpen])

  useEffect(() => {
    if (activeNav !== "kafedralar") return
    const el = mainScrollRef.current
    if (!el) return
    el.scrollTo({ top: 0, behavior: "smooth" })
  }, [activeNav])

  const mainTitle =
    activeNav === "dashboard"
      ? "Dashboard"
      : getDashboardNavLabel(activeNav)

  if (!authChecked) {
    return (
      <div className={`flex min-h-screen items-center justify-center font-sans ${dark ? "bg-slate-900 text-slate-400" : "bg-slate-100 text-slate-500"}`}>
        Tekshirilmoqda...
      </div>
    )
  }

  if (!isAuthed) {
    return <AdminLogin onSuccess={() => setIsAuthed(true)} />
  }

  return (
    <div
      className={`flex h-screen overflow-hidden font-sans ${dark ? "bg-slate-900 text-slate-100" : "bg-slate-100 text-slate-800"}`}
    >
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r shadow-sm transition-transform duration-200 md:relative md:translate-x-0 ${
          dark ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white"
        } ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className={`border-b px-5 py-6 ${dark ? "border-slate-700" : "border-slate-100"}`}>
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="" className="h-10 w-10 rounded-full border object-cover" />
            <div>
              <p className="text-lg font-bold leading-tight">UrSPI Admin</p>
              <p className={`text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>Dashboard</p>
            </div>
          </div>
        </div>
        <DashboardNav dark={dark} activeNav={activeNav} onChange={setActiveNav} tealBgClass={TEAL_BG} visibleIds={visibleNavIds} />
        <div className={`p-4 text-xs ${dark ? "text-slate-500" : "text-slate-400"}`}>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-lg border border-red-500 px-3 py-2 text-xs font-semibold text-red-500 transition-colors hover:bg-red-500 hover:text-white"
          >
            Platformaga qaytish
          </Link>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Menyuni yopish"
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex min-h-screen flex-1 flex-col md:min-h-0">
        <header
          className={`sticky top-0 z-20 flex h-16 items-center justify-between border-b px-4 shadow-sm ${
            dark ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              className={`rounded-lg p-2 md:hidden ${dark ? "hover:bg-slate-700" : "hover:bg-slate-100"}`}
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Menyu"
            >
              <Menu className="h-6 w-6" strokeWidth={1.5} aria-hidden />
            </button>
            <h1 className="text-lg font-semibold">{mainTitle}</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setDark((d) => !d)}
              className={`rounded-lg p-2 ${dark ? "hover:bg-slate-700" : "hover:bg-slate-100"}`}
              aria-label="Tungi rejim"
            >
              <Moon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
            </button>
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                className={`flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors ${
                  dark ? "hover:bg-slate-700/80" : "hover:bg-slate-100"
                }`}
                aria-haspopup="menu"
                aria-expanded={profileOpen}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
                  {adminUsername.slice(0, 2).toUpperCase()}
                </span>
                <div className="hidden text-sm sm:block">
                  <p className="font-medium leading-none">{adminUsername}</p>
                </div>
                <ChevronDown
                  className={`h-4 w-4 opacity-50 transition-transform ${profileOpen ? "rotate-180" : ""}`}
                  strokeWidth={2}
                  aria-hidden
                />
              </button>

              {profileOpen && (
                <div
                  role="menu"
                  className={`absolute right-0 top-full mt-2 w-44 overflow-hidden rounded-2xl border shadow-lg ${
                    dark ? "border-slate-700 bg-slate-800 text-slate-100" : "border-slate-200 bg-white text-slate-800"
                  }`}
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={async () => {
                      setProfileOpen(false)
                      await apiLogout()
                      setIsAuthed(false)
                    }}
                    className={`flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors ${
                      dark ? "hover:bg-slate-700/70" : "hover:bg-slate-50"
                    } text-red-600`}
                  >
                    <LogOut className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                    Chiqish
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main ref={mainScrollRef} className="flex-1 overflow-auto p-6 md:p-8">
          <div className="mx-auto w-full max-w-6xl">
            {activeNav === "dashboard" && (
              <div className="space-y-6">
                <EvaluationSummaryCards dark={dark} totalFiles={totalFiles} />

                <div className="grid gap-4 sm:grid-cols-2">
                  <article
                    className={`dashboard-stat-in rounded-xl border p-5 shadow-sm ${dark ? "border-slate-700 bg-slate-800" : "border-slate-100 bg-white"}`}
                    style={{ animationDelay: "0ms" }}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                          dark ? "bg-blue-500/15 text-blue-400" : "bg-blue-50 text-blue-600"
                        }`}
                      >
                        <Landmark className="h-6 w-6" strokeWidth={2} aria-hidden />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm ${dark ? "text-slate-400" : "text-slate-500"}`}>Fakultetlar</p>
                        <p className={`mt-2 text-3xl font-bold tabular-nums ${dark ? "text-blue-400" : "text-blue-600"}`}>
                          {STATS.fakultetlar}
                        </p>
                      </div>
                    </div>
                  </article>
                  <article
                    className={`dashboard-stat-in rounded-xl border p-5 shadow-sm ${dark ? "border-slate-700 bg-slate-800" : "border-slate-100 bg-white"}`}
                    style={{ animationDelay: "170ms" }}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                          dark ? "bg-violet-500/15 text-violet-400" : "bg-violet-50 text-violet-600"
                        }`}
                      >
                        <UsersIcon className="h-6 w-6" strokeWidth={2} aria-hidden />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm ${dark ? "text-slate-400" : "text-slate-500"}`}>O&apos;qituvchilar</p>
                        <p className={`mt-2 text-3xl font-bold tabular-nums ${dark ? "text-violet-400" : "text-violet-600"}`}>
                          {teacherCount}
                        </p>
                      </div>
                    </div>
                  </article>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <FileTypeDistribution dark={dark} />
                  <FacultyFileBarChart dark={dark} />
                </div>

              </div>
            )}

            {activeNav === "fakultetlar" && <Faculties dark={dark} permissions={currentPermissions} isAdmin={isAdmin} />}
            {activeNav === "lavozim" && <Positions dark={dark} permissions={currentPermissions} isAdmin={isAdmin} />}
            {activeNav === "foydalanuvchilar" && visibleNavIds.includes("foydalanuvchilar") && (
              <Users dark={dark} permissions={currentPermissions} isAdmin={isAdmin} />
            )}
            {activeNav === "oqituvchilar" && <Teachers dark={dark} permissions={currentPermissions} isAdmin={isAdmin} />}
            {activeNav === "mezonlar" && (
              <Criteria dark={dark} permissions={currentPermissions} isAdmin={isAdmin} />
            )}
            {activeNav === "sozlamalar" && <Settings dark={dark} permissions={currentPermissions} isAdmin={isAdmin} />}
            {activeNav === "biz-haqimizda" && <AboutUs dark={dark} />}

          </div>
        </main>
      </div>
    </div>
  )
}

function KafedralarPanel_UNUSED({ dark }) {
  const [rows, setRows] = useState(() => KAFEDRALAR_ROYXATI)
  const [searchDraft, setSearchDraft] = useState("")
  const [searchApplied, setSearchApplied] = useState("")
  const [modal, setModal] = useState({
    open: false,
    type: /** @type {null | "view" | "edit" | "delete" | "create"} */ (null),
    row: null,
  })
  const [editDraft, setEditDraft] = useState({ fakultet: "", nameUz: "" })
  const [createDraft, setCreateDraft] = useState({ fakultet: "", nameUz: "" })
  const [notice, setNotice] = useState({ open: false, message: "", variant: /** @type {"success" | "danger"} */ ("success") })
  const noticeTimeoutRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null))

  const filtered = useMemo(() => {
    const q = searchApplied.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (row) =>
        row.nameUz.toLowerCase().includes(q) ||
        row.fakultet.toLowerCase().includes(q)
    )
  }, [rows, searchApplied])

  const cardBase = dark
    ? "border-slate-600 bg-slate-800"
    : "border-slate-200 bg-white shadow-sm"
  const subtitle = dark ? "text-slate-400" : "text-slate-500"
  const title = dark ? "text-slate-100" : "text-slate-900"
  const meta = dark ? "text-slate-500" : "text-slate-400"
  const inputWrap = dark
    ? "border-slate-600 bg-slate-800/80 text-slate-100 placeholder:text-slate-500"
    : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"

  const input = dark
    ? "border-slate-600 bg-slate-900/40 text-slate-100 placeholder:text-slate-600"
    : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"

  const closeModal = () => setModal({ open: false, type: null, row: null })
  const closeNotice = () => setNotice({ open: false, message: "", variant: "success" })

  const showNotice = (message, variant = "success") => {
    setNotice({ open: true, message, variant })
    if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current)
    noticeTimeoutRef.current = setTimeout(() => {
      setNotice({ open: false, message: "", variant: "success" })
      noticeTimeoutRef.current = null
    }, 1300)
  }

  const fakultetOptions = useMemo(() => MAVJUD_FAKULTETLAR.map((f) => f.nameUz), [])

  const openView = (row) => setModal({ open: true, type: "view", row })

  const openEdit = (row) => {
    setEditDraft({ fakultet: row?.fakultet ?? "", nameUz: row?.nameUz ?? "" })
    setModal({ open: true, type: "edit", row })
  }

  const openDelete = (row) => setModal({ open: true, type: "delete", row })

  const openCreate = () => {
    setCreateDraft({ fakultet: fakultetOptions[0] ?? "", nameUz: "" })
    setModal({ open: true, type: "create", row: null })
  }

  const onSaveEdit = () => {
    const row = modal.row
    if (!row?.id) return
    const nextName = editDraft.nameUz.trim()
    const nextFac = editDraft.fakultet.trim()
    if (!nextName || !nextFac) return
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, nameUz: nextName, fakultet: nextFac } : r)))
    closeModal()
    showNotice("Muvaqqatli Tahrirlandi")
  }

  const onConfirmDelete = () => {
    const row = modal.row
    if (!row?.id) return
    setRows((prev) => prev.filter((r) => r.id !== row.id))
    closeModal()
    showNotice("Muvaqqatli O'chirildi", "danger")
  }

  const onSaveCreate = () => {
    const nextName = createDraft.nameUz.trim()
    const nextFac = createDraft.fakultet.trim()
    if (!nextName || !nextFac) return
    const newRow = { id: `k-${Date.now()}`, nameUz: nextName, nameRu: "", fakultet: nextFac }
    setRows((prev) => [newRow, ...prev])
    closeModal()
    showNotice("Muvaqqatli Qo'shildi")
  }

  return (
    <div className={`rounded-2xl border ${dark ? "border-slate-700 bg-slate-800/40" : "border-slate-200 bg-white"} p-5 sm:p-6`}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className={`text-xl font-bold tracking-tight ${title}`}>Kafedralar Ro&apos;yxati</h2>
          <button
            type="button"
            onClick={openCreate}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-600 ${TEAL_BG}`}
          >
            <Plus className="h-4 w-4 shrink-0 stroke-[2.5]" aria-hidden />
            Qo'shish
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <div className="relative min-w-0 flex-1">
            <Search
              className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${dark ? "text-slate-500" : "text-slate-400"}`}
              strokeWidth={2}
              aria-hidden
            />
            <input
              type="search"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setSearchApplied(searchDraft)
              }}
              placeholder="Kafedra qidirish..."
              className={`w-full rounded-lg border py-2.5 pl-10 pr-4 text-sm outline-none ring-teal-500/0 transition-shadow focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${inputWrap}`}
            />
          </div>
          <button
            type="button"
            onClick={() => setSearchApplied(searchDraft)}
            className={`inline-flex shrink-0 items-center justify-center rounded-lg border px-5 py-2.5 text-sm font-semibold transition-colors sm:min-w-[7.5rem] ${
              dark
                ? "border-blue-500/90 text-blue-400 hover:bg-slate-700/80"
                : "border-blue-600 text-blue-600 hover:bg-blue-50"
            }`}
          >
            Qidirish
          </button>
        </div>

        <ul className="flex flex-col gap-3">
          {filtered.map((row) => (
            <li
              key={row.id}
              className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border px-4 py-4 sm:px-5 ${cardBase}`}
            >
              <div className="min-w-0 flex-1">
                <p className={`font-bold leading-snug ${title}`}>{row.nameUz}</p>
                <p className={`mt-1.5 text-xs ${meta}`}>Fakultet: {row.fakultet}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                <button
                  type="button"
                  onClick={() => openView(row)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    dark
                      ? "border-blue-500/80 text-blue-400 hover:bg-slate-700/80"
                      : "border-blue-600 text-blue-600 hover:bg-blue-50"
                  }`}
                >
                  <Eye className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                  Ko'rish
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(row)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    dark
                      ? "border-emerald-500/80 text-emerald-400 hover:bg-slate-700/80"
                      : "border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                  }`}
                >
                  <Pencil className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                  Tahrirlash
                </button>
                <button
                  type="button"
                  onClick={() => openDelete(row)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    dark
                      ? "border-red-500/80 text-red-400 hover:bg-slate-700/80"
                      : "border-red-600 text-red-600 hover:bg-red-50"
                  }`}
                >
                  <Trash2 className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                  O'chirish
                </button>
              </div>
            </li>
          ))}
        </ul>

        {filtered.length === 0 && (
          <p className={`text-center text-sm ${subtitle}`}>Qidiruv bo&apos;yicha natija topilmadi.</p>
        )}
      </div>

      <Modal open={modal.open} onClose={closeModal} dark={dark}>
        {modal.type === "view" && modal.row && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-2xl font-bold tracking-tight">Kafedra ma&apos;lumotlari</h3>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Yopish"
                className={`-mt-2 rounded-lg p-2 transition-colors ${dark ? "hover:bg-slate-700/70" : "hover:bg-slate-100"}`}
              >
                <CircleX className={`h-7 w-7 ${dark ? "text-white" : "text-slate-900"}`} strokeWidth={2.25} aria-hidden />
              </button>
            </div>
            <div className="space-y-3 text-base">
              <div>
                <p className={`text-xs font-semibold ${meta}`}>Fakultet:</p>
                <p className="mt-1 font-semibold">{modal.row.fakultet}</p>
              </div>
              <div>
                <p className={`text-xs font-semibold ${meta}`}>Kafedra nomi:</p>
                <p className="mt-1 font-semibold">{modal.row.nameUz}</p>
              </div>
            </div>
          </div>
        )}

        {modal.type === "edit" && modal.row && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-2xl font-bold tracking-tight">Kafedrani Tahrirlash</h3>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Yopish"
                className={`-mt-2 rounded-lg p-2 transition-colors ${dark ? "hover:bg-slate-700/70" : "hover:bg-slate-100"}`}
              >
                <CircleX className={`h-7 w-7 ${dark ? "text-white" : "text-slate-900"}`} strokeWidth={2.25} aria-hidden />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-base font-semibold">Fakultet</label>
                <select
                  value={editDraft.fakultet}
                  onChange={(e) => setEditDraft((p) => ({ ...p, fakultet: e.target.value }))}
                  className={`w-full rounded-lg border px-4 py-3 text-base outline-none ring-teal-500/0 transition-shadow focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${input}`}
                >
                  {fakultetOptions.map((opt) => (
                    <option
                      key={opt}
                      value={opt}
                      className={dark ? "bg-slate-800 text-slate-100" : "bg-white text-slate-900"}
                    >
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-base font-semibold">Kafedra nomi</label>
                <input
                  value={editDraft.nameUz}
                  onChange={(e) => setEditDraft((p) => ({ ...p, nameUz: e.target.value }))}
                  className={`w-full rounded-lg border px-4 py-3 text-base outline-none ring-teal-500/0 transition-shadow focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${input}`}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onSaveEdit}
                className="inline-flex min-w-[11rem] items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-base font-bold text-white transition-colors hover:bg-emerald-600"
              >
                Saqlash
              </button>
              <button
                type="button"
                onClick={closeModal}
                className={`inline-flex min-w-[11rem] items-center justify-center rounded-full border px-6 py-3 text-base font-bold transition-colors ${
                  dark ? "border-slate-600 text-slate-200 hover:bg-slate-700/70" : "border-slate-200 text-slate-800 hover:bg-slate-50"
                }`}
              >
                Bekor qilish
              </button>
            </div>
          </div>
        )}

        {modal.type === "delete" && modal.row && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-2xl font-bold tracking-tight">Kafedrani o&apos;chirishni tasdiqlaysizmi?</h3>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Yopish"
                className={`-mt-2 rounded-lg p-2 transition-colors ${dark ? "hover:bg-slate-700/70" : "hover:bg-slate-100"}`}
              >
                <CircleX className={`h-7 w-7 ${dark ? "text-white" : "text-slate-900"}`} strokeWidth={2.25} aria-hidden />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={onConfirmDelete}
                className="inline-flex min-w-[11rem] items-center justify-center rounded-2xl bg-red-500 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-red-600"
              >
                Ha
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex min-w-[11rem] items-center justify-center rounded-2xl bg-blue-500 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-600"
              >
                Yo&apos;q
              </button>
            </div>
          </div>
        )}

        {modal.type === "create" && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-2xl font-bold tracking-tight">Kafedra qo&apos;shish</h3>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Yopish"
                className={`-mt-2 rounded-lg p-2 transition-colors ${dark ? "hover:bg-slate-700/70" : "hover:bg-slate-100"}`}
              >
                <CircleX className={`h-7 w-7 ${dark ? "text-white" : "text-slate-900"}`} strokeWidth={2.25} aria-hidden />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-base font-semibold">Fakultet</label>
                <select
                  value={createDraft.fakultet}
                  onChange={(e) => setCreateDraft((p) => ({ ...p, fakultet: e.target.value }))}
                  className={`w-full rounded-lg border px-4 py-3 text-base outline-none ring-teal-500/0 transition-shadow focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${input}`}
                >
                  {fakultetOptions.map((opt) => (
                    <option
                      key={opt}
                      value={opt}
                      className={dark ? "bg-slate-800 text-slate-100" : "bg-white text-slate-900"}
                    >
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-base font-semibold">Kafedra nomi</label>
                <input
                  value={createDraft.nameUz}
                  onChange={(e) => setCreateDraft((p) => ({ ...p, nameUz: e.target.value }))}
                  className={`w-full rounded-lg border px-4 py-3 text-base outline-none ring-teal-500/0 transition-shadow focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${input}`}
                  placeholder="Masalan: Rus tili va adabiyoti kafedrasi"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onSaveCreate}
                className="inline-flex min-w-[11rem] items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-base font-bold text-white transition-colors hover:bg-emerald-600"
              >
                Qo&apos;shish
              </button>
              <button
                type="button"
                onClick={closeModal}
                className={`inline-flex min-w-[11rem] items-center justify-center rounded-full border px-6 py-3 text-base font-bold transition-colors ${
                  dark ? "border-slate-600 text-slate-200 hover:bg-slate-700/70" : "border-slate-200 text-slate-800 hover:bg-slate-50"
                }`}
              >
                Bekor qilish
              </button>
            </div>
          </div>
        )}
      </Modal>

      {notice.open && (
        <div className="pointer-events-none fixed left-1/2 top-4 z-[60] w-[min(92vw,34rem)] -translate-x-1/2">
          <div
            role="status"
            className={`pointer-events-auto flex items-center justify-between gap-3 rounded-2xl px-4 py-3 shadow-xl ring-1 ${
              notice.variant === "danger"
                ? dark
                  ? "bg-red-600 text-white ring-white/10"
                  : "bg-red-500 text-white ring-red-600/30"
                : dark
                  ? "bg-emerald-600 text-white ring-white/10"
                  : "bg-emerald-500 text-white ring-emerald-600/30"
            }`}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <CircleCheck className="h-6 w-6 shrink-0 text-white" strokeWidth={2.25} aria-hidden />
              <p className="truncate text-sm font-semibold">{notice.message}</p>
            </div>
            <button
              type="button"
              onClick={closeNotice}
              aria-label="Yopish"
              className="rounded-xl p-1.5 transition-colors hover:bg-white/10"
            >
              <CircleX className="h-6 w-6 text-white" strokeWidth={2.25} aria-hidden />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function LavozimlarPanel_UNUSED({ dark }) {
  const [rows, setRows] = useState(() => LAVOZIMLAR_ROYXATI)
  const [modal, setModal] = useState({
    open: false,
    type: /** @type {null | "view" | "edit" | "delete" | "create"} */ (null),
    row: null,
  })
  const [editDraft, setEditDraft] = useState({ nameUz: "" })
  const [createDraft, setCreateDraft] = useState({ nameUz: "" })
  const [notice, setNotice] = useState({ open: false, message: "", variant: /** @type {"success" | "danger"} */ ("success") })
  const noticeTimeoutRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null))

  const cardBase = dark ? "border-slate-600 bg-slate-800" : "border-slate-200 bg-white shadow-sm"
  const subtitle = dark ? "text-slate-400" : "text-slate-500"
  const title = dark ? "text-slate-100" : "text-slate-900"
  const meta = dark ? "text-slate-500" : "text-slate-400"

  const input = dark
    ? "border-slate-600 bg-slate-900/40 text-slate-100 placeholder:text-slate-600"
    : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"

  const closeModal = () => setModal({ open: false, type: null, row: null })
  const closeNotice = () => setNotice({ open: false, message: "", variant: "success" })

  const showNotice = (message, variant = "success") => {
    setNotice({ open: true, message, variant })
    if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current)
    noticeTimeoutRef.current = setTimeout(() => {
      setNotice({ open: false, message: "", variant: "success" })
      noticeTimeoutRef.current = null
    }, 1300)
  }

  const openView = (row) => setModal({ open: true, type: "view", row })

  const openEdit = (row) => {
    setEditDraft({ nameUz: row?.nameUz ?? "" })
    setModal({ open: true, type: "edit", row })
  }

  const openDelete = (row) => setModal({ open: true, type: "delete", row })

  const openCreate = () => {
    setCreateDraft({ nameUz: "" })
    setModal({ open: true, type: "create", row: null })
  }

  const onSaveEdit = () => {
    const row = modal.row
    if (!row?.id) return
    const nextName = editDraft.nameUz.trim()
    if (!nextName) return
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, nameUz: nextName } : r)))
    closeModal()
    showNotice("Muvaqqatli Tahrirlandi")
  }

  const onConfirmDelete = () => {
    const row = modal.row
    if (!row?.id) return
    setRows((prev) => prev.filter((r) => r.id !== row.id))
    closeModal()
    showNotice("Muvaqqatli O'chirildi", "danger")
  }

  const onSaveCreate = () => {
    const nextName = createDraft.nameUz.trim()
    if (!nextName) return
    const newRow = { id: `l-${Date.now()}`, nameUz: nextName }
    setRows((prev) => [newRow, ...prev])
    closeModal()
    showNotice("Muvaqqatli Qo'shildi")
  }

  return (
    <div className={`rounded-2xl border ${dark ? "border-slate-700 bg-slate-800/40" : "border-slate-200 bg-white"} p-5 sm:p-6`}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className={`text-xl font-bold tracking-tight ${title}`}>Lavozimlar Ro&apos;yxati</h2>
          <button
            type="button"
            onClick={openCreate}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-600 ${TEAL_BG}`}
          >
            <Plus className="h-4 w-4 shrink-0 stroke-[2.5]" aria-hidden />
            Qo'shish
          </button>
        </div>

        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.id} className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border px-4 py-4 sm:px-5 ${cardBase}`}>
              <div className="min-w-0 flex-1">
                <p className={`font-bold leading-snug ${title}`}>{row.nameUz}</p>
                <p className={`mt-1.5 text-xs ${meta}`}>ID: {row.id}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                <button
                  type="button"
                  onClick={() => openView(row)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    dark ? "border-blue-500/80 text-blue-400 hover:bg-slate-700/80" : "border-blue-600 text-blue-600 hover:bg-blue-50"
                  }`}
                >
                  <Eye className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                  Ko'rish
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(row)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    dark
                      ? "border-emerald-500/80 text-emerald-400 hover:bg-slate-700/80"
                      : "border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                  }`}
                >
                  <Pencil className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                  Tahrirlash
                </button>
                <button
                  type="button"
                  onClick={() => openDelete(row)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    dark ? "border-red-500/80 text-red-400 hover:bg-slate-700/80" : "border-red-600 text-red-600 hover:bg-red-50"
                  }`}
                >
                  <Trash2 className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                  O'chirish
                </button>
              </div>
            </li>
          ))}
        </ul>

        {rows.length === 0 && <p className={`text-center text-sm ${subtitle}`}>Hozircha lavozim yo&apos;q.</p>}
      </div>

      <Modal open={modal.open} onClose={closeModal} dark={dark}>
        {modal.type === "view" && modal.row && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-2xl font-bold tracking-tight">Lavozim ma&apos;lumotlari</h3>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Yopish"
                className={`-mt-2 rounded-lg p-2 transition-colors ${dark ? "hover:bg-slate-700/70" : "hover:bg-slate-100"}`}
              >
                <CircleX className={`h-7 w-7 ${dark ? "text-white" : "text-slate-900"}`} strokeWidth={2.25} aria-hidden />
              </button>
            </div>
            <div className="space-y-3 text-base">
              <div>
                <p className={`text-xs font-semibold ${meta}`}>Lavozim nomi:</p>
                <p className="mt-1 font-semibold">{modal.row.nameUz}</p>
              </div>
              <div>
                <p className={`text-xs font-semibold ${meta}`}>ID:</p>
                <p className="mt-1 font-semibold">{modal.row.id}</p>
              </div>
            </div>
          </div>
        )}

        {modal.type === "edit" && modal.row && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-2xl font-bold tracking-tight">Lavozimni Tahrirlash</h3>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Yopish"
                className={`-mt-2 rounded-lg p-2 transition-colors ${dark ? "hover:bg-slate-700/70" : "hover:bg-slate-100"}`}
              >
                <CircleX className={`h-7 w-7 ${dark ? "text-white" : "text-slate-900"}`} strokeWidth={2.25} aria-hidden />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-base font-semibold">Lavozim nomi</label>
                <input
                  value={editDraft.nameUz}
                  onChange={(e) => setEditDraft((p) => ({ ...p, nameUz: e.target.value }))}
                  className={`w-full rounded-lg border px-4 py-3 text-base outline-none ring-teal-500/0 transition-shadow focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${input}`}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onSaveEdit}
                className="inline-flex min-w-[11rem] items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-base font-bold text-white transition-colors hover:bg-emerald-600"
              >
                Saqlash
              </button>
              <button
                type="button"
                onClick={closeModal}
                className={`inline-flex min-w-[11rem] items-center justify-center rounded-full border px-6 py-3 text-base font-bold transition-colors ${
                  dark ? "border-slate-600 text-slate-200 hover:bg-slate-700/70" : "border-slate-200 text-slate-800 hover:bg-slate-50"
                }`}
              >
                Bekor qilish
              </button>
            </div>
          </div>
        )}

        {modal.type === "delete" && modal.row && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-2xl font-bold tracking-tight">Lavozimni o&apos;chirishni tasdiqlaysizmi?</h3>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Yopish"
                className={`-mt-2 rounded-lg p-2 transition-colors ${dark ? "hover:bg-slate-700/70" : "hover:bg-slate-100"}`}
              >
                <CircleX className={`h-7 w-7 ${dark ? "text-white" : "text-slate-900"}`} strokeWidth={2.25} aria-hidden />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={onConfirmDelete}
                className="inline-flex min-w-[11rem] items-center justify-center rounded-2xl bg-red-500 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-red-600"
              >
                Ha
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex min-w-[11rem] items-center justify-center rounded-2xl bg-blue-500 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-600"
              >
                Yo&apos;q
              </button>
            </div>
          </div>
        )}

        {modal.type === "create" && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-2xl font-bold tracking-tight">Lavozim qo&apos;shish</h3>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Yopish"
                className={`-mt-2 rounded-lg p-2 transition-colors ${dark ? "hover:bg-slate-700/70" : "hover:bg-slate-100"}`}
              >
                <CircleX className={`h-7 w-7 ${dark ? "text-white" : "text-slate-900"}`} strokeWidth={2.25} aria-hidden />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-base font-semibold">Lavozim nomi</label>
              <input
                value={createDraft.nameUz}
                onChange={(e) => setCreateDraft({ nameUz: e.target.value })}
                className={`w-full rounded-lg border px-4 py-3 text-base outline-none ring-teal-500/0 transition-shadow focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${input}`}
                placeholder="Masalan: Kafedra mudiri"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onSaveCreate}
                className="inline-flex min-w-[11rem] items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-base font-bold text-white transition-colors hover:bg-emerald-600"
              >
                Qo&apos;shish
              </button>
              <button
                type="button"
                onClick={closeModal}
                className={`inline-flex min-w-[11rem] items-center justify-center rounded-full border px-6 py-3 text-base font-bold transition-colors ${
                  dark ? "border-slate-600 text-slate-200 hover:bg-slate-700/70" : "border-slate-200 text-slate-800 hover:bg-slate-50"
                }`}
              >
                Bekor qilish
              </button>
            </div>
          </div>
        )}
      </Modal>

      {notice.open && (
        <div className="pointer-events-none fixed left-1/2 top-4 z-[60] w-[min(92vw,34rem)] -translate-x-1/2">
          <div
            role="status"
            className={`pointer-events-auto flex items-center justify-between gap-3 rounded-2xl px-4 py-3 shadow-xl ring-1 ${
              notice.variant === "danger"
                ? dark
                  ? "bg-red-600 text-white ring-white/10"
                  : "bg-red-500 text-white ring-red-600/30"
                : dark
                  ? "bg-emerald-600 text-white ring-white/10"
                  : "bg-emerald-500 text-white ring-emerald-600/30"
            }`}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <CircleCheck className="h-6 w-6 shrink-0 text-white" strokeWidth={2.25} aria-hidden />
              <p className="truncate text-sm font-semibold">{notice.message}</p>
            </div>
            <button
              type="button"
              onClick={closeNotice}
              aria-label="Yopish"
              className="rounded-xl p-1.5 transition-colors hover:bg-white/10"
            >
              <CircleX className="h-6 w-6 text-white" strokeWidth={2.25} aria-hidden />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function FakultetlarPanel_UNUSED({ dark }) {
  const [rows, setRows] = useState(() => MAVJUD_FAKULTETLAR)
  const [modal, setModal] = useState({
    open: false,
    type: /** @type {null | "view" | "edit" | "delete" | "create"} */ (null),
    fac: null,
  })
  const [editDraft, setEditDraft] = useState({ nameUz: "" })
  const [createDraft, setCreateDraft] = useState({ nameUz: "" })
  const [notice, setNotice] = useState({ open: false, message: "", variant: /** @type {"success" | "danger"} */ ("success") })
  const noticeTimeoutRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null))

  const cardBase = dark
    ? "border-slate-600 bg-slate-800"
    : "border-slate-200 bg-white shadow-sm"
  const title = dark ? "text-slate-100" : "text-slate-900"
  const subtitle = dark ? "text-slate-400" : "text-slate-500"
  const label = dark ? "text-slate-400" : "text-slate-500"
  const input = dark
    ? "border-slate-600 bg-slate-900/40 text-slate-100 placeholder:text-slate-600"
    : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"

  const closeModal = () => setModal({ open: false, type: null, fac: null })
  const closeNotice = () => setNotice({ open: false, message: "", variant: "success" })

  const showNotice = (message, variant = "success") => {
    setNotice({ open: true, message, variant })
    if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current)
    noticeTimeoutRef.current = setTimeout(() => {
      setNotice({ open: false, message: "", variant: "success" })
      noticeTimeoutRef.current = null
    }, 1300)
  }

  const openView = (fac) => setModal({ open: true, type: "view", fac })

  const openEdit = (fac) => {
    setEditDraft({ nameUz: fac?.nameUz ?? "" })
    setModal({ open: true, type: "edit", fac })
  }

  const openCreate = () => {
    setCreateDraft({ nameUz: "" })
    setModal({ open: true, type: "create", fac: null })
  }

  const openDelete = (fac) => setModal({ open: true, type: "delete", fac })

  const onSaveEdit = () => {
    const fac = modal.fac
    if (!fac?.id) return
    const nextUz = editDraft.nameUz.trim()
    if (!nextUz) return

    setRows((prev) =>
      prev.map((r) => (r.id === fac.id ? { ...r, nameUz: nextUz } : r))
    )
    closeModal()
    showNotice("Muvaqqatli Tahrirlandi")
  }

  const onConfirmDelete = () => {
    const fac = modal.fac
    if (!fac?.id) return
    setRows((prev) => prev.filter((r) => r.id !== fac.id))
    closeModal()
    showNotice("Muvaqqatli O'chirildi", "danger")
  }

  const onSaveCreate = () => {
    const nextUz = createDraft.nameUz.trim()
    if (!nextUz) return

    const newFac = {
      id: `f-${Date.now()}`,
      nameUz: nextUz,
      nameRu: "",
    }
    setRows((prev) => [newFac, ...prev])
    closeModal()
    showNotice("Muvaqqatli Qo'shildi")
  }

  return (
    <div className={`rounded-2xl border ${dark ? "border-slate-700 bg-slate-800/40" : "border-slate-200 bg-white"} p-5 sm:p-6`}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className={`text-xl font-bold tracking-tight ${title}`}>Mavjud Fakultetlar</h2>
          <button
            type="button"
            onClick={openCreate}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-600 ${TEAL_BG}`}
          >
            <Plus className="h-4 w-4 shrink-0 stroke-[2.5]" aria-hidden />
            Qo'shish
          </button>
        </div>

        <ul className="flex flex-col gap-3">
          {rows.map((fac) => (
            <li
              key={fac.id}
              className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border px-4 py-4 sm:px-5 ${cardBase}`}
            >
              <div className="min-w-0 flex-1">
                <p className={`font-bold leading-snug ${title}`}>{fac.nameUz}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                <button
                  type="button"
                  onClick={() => openView(fac)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    dark
                      ? "border-blue-500/80 text-blue-400 hover:bg-slate-700/80"
                      : "border-blue-600 text-blue-600 hover:bg-blue-50"
                  }`}
                >
                  <Eye className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                  Ko'rish
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(fac)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    dark
                      ? "border-emerald-500/80 text-emerald-400 hover:bg-slate-700/80"
                      : "border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                  }`}
                >
                  <SquarePen className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                  Tahrirlash
                </button>
                <button
                  type="button"
                  onClick={() => openDelete(fac)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    dark
                      ? "border-red-500/80 text-red-400 hover:bg-slate-700/80"
                      : "border-red-600 text-red-600 hover:bg-red-50"
                  }`}
                >
                  <Trash2 className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                  O'chirish
                </button>
              </div>
            </li>
          ))}
        </ul>

        {rows.length === 0 && <p className={`text-center text-sm ${subtitle}`}>Hozircha fakultet yo&apos;q.</p>}
      </div>

      <Modal open={modal.open} onClose={closeModal} dark={dark}>
        {modal.type === "view" && modal.fac && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-2xl font-bold tracking-tight">Fakultet ma&apos;lumotlari</h3>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Yopish"
                className={`-mt-2 rounded-lg p-2 transition-colors ${dark ? "hover:bg-slate-700/70" : "hover:bg-slate-100"}`}
              >
                <CircleX className={`h-7 w-7 ${dark ? "text-white" : "text-slate-900"}`} strokeWidth={2.25} aria-hidden />
              </button>
            </div>
            <div className="space-y-3 text-base">
              <div>
                <p className={`text-xs font-semibold ${label}`}>Fakultet nomi:</p>
                <p className="mt-1 font-semibold">{modal.fac.nameUz}</p>
              </div>
            </div>
          </div>
        )}

        {modal.type === "edit" && modal.fac && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-2xl font-bold tracking-tight">Fakultetni Tahrirlash</h3>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Yopish"
                className={`-mt-2 rounded-lg p-2 transition-colors ${dark ? "hover:bg-slate-700/70" : "hover:bg-slate-100"}`}
              >
                <CircleX className={`h-7 w-7 ${dark ? "text-white" : "text-slate-900"}`} strokeWidth={2.25} aria-hidden />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-base font-semibold">Fakultet nomi</label>
                <input
                  value={editDraft.nameUz}
                  onChange={(e) => setEditDraft((p) => ({ ...p, nameUz: e.target.value }))}
                  className={`w-full rounded-lg border px-4 py-3 text-base outline-none ring-teal-500/0 transition-shadow focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${input}`}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onSaveEdit}
                className="inline-flex min-w-[11rem] items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-base font-bold text-white transition-colors hover:bg-emerald-600"
              >
                Saqlash
              </button>
              <button
                type="button"
                onClick={closeModal}
                className={`inline-flex min-w-[11rem] items-center justify-center rounded-full border px-6 py-3 text-base font-bold transition-colors ${
                  dark ? "border-slate-600 text-slate-200 hover:bg-slate-700/70" : "border-slate-200 text-slate-800 hover:bg-slate-50"
                }`}
              >
                Bekor qilish
              </button>
            </div>
          </div>
        )}

        {modal.type === "delete" && modal.fac && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-2xl font-bold tracking-tight">Fakultetni o&apos;chirishni tasdiqlaysizmi?</h3>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Yopish"
                className={`-mt-2 rounded-lg p-2 transition-colors ${dark ? "hover:bg-slate-700/70" : "hover:bg-slate-100"}`}
              >
                <CircleX className={`h-7 w-7 ${dark ? "text-white" : "text-slate-900"}`} strokeWidth={2.25} aria-hidden />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={onConfirmDelete}
                className="inline-flex min-w-[11rem] items-center justify-center rounded-2xl bg-red-500 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-red-600"
              >
                Ha
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex min-w-[11rem] items-center justify-center rounded-2xl bg-blue-500 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-600"
              >
                Yo&apos;q
              </button>
            </div>
          </div>
        )}

        {modal.type === "create" && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-2xl font-bold tracking-tight">Fakultet qo&apos;shish</h3>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Yopish"
                className={`-mt-2 rounded-lg p-2 transition-colors ${dark ? "hover:bg-slate-700/70" : "hover:bg-slate-100"}`}
              >
                <CircleX className={`h-7 w-7 ${dark ? "text-white" : "text-slate-900"}`} strokeWidth={2.25} aria-hidden />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-base font-semibold">Fakultet nomi</label>
              <input
                value={createDraft.nameUz}
                onChange={(e) => setCreateDraft({ nameUz: e.target.value })}
                className={`w-full rounded-lg border px-4 py-3 text-base outline-none ring-teal-500/0 transition-shadow focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${input}`}
                placeholder="Masalan: Filologiya Fakulteti"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onSaveCreate}
                className="inline-flex min-w-[11rem] items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-base font-bold text-white transition-colors hover:bg-emerald-600"
              >
                Qo&apos;shish
              </button>
              <button
                type="button"
                onClick={closeModal}
                className={`inline-flex min-w-[11rem] items-center justify-center rounded-full border px-6 py-3 text-base font-bold transition-colors ${
                  dark ? "border-slate-600 text-slate-200 hover:bg-slate-700/70" : "border-slate-200 text-slate-800 hover:bg-slate-50"
                }`}
              >
                Bekor qilish
              </button>
            </div>
          </div>
        )}
      </Modal>

      {notice.open && (
        <div className="pointer-events-none fixed left-1/2 top-4 z-[60] w-[min(92vw,34rem)] -translate-x-1/2">
          <div
            role="status"
            className={`pointer-events-auto flex items-center justify-between gap-3 rounded-2xl px-4 py-3 shadow-xl ring-1 ${
              notice.variant === "danger"
                ? dark
                  ? "bg-red-600 text-white ring-white/10"
                  : "bg-red-500 text-white ring-red-600/30"
                : dark
                  ? "bg-emerald-600 text-white ring-white/10"
                  : "bg-emerald-500 text-white ring-emerald-600/30"
            }`}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <CircleCheck className="h-6 w-6 shrink-0 text-white" strokeWidth={2.25} aria-hidden />
              <p className="truncate text-sm font-semibold">{notice.message}</p>
            </div>
            <button
              type="button"
              onClick={closeNotice}
              aria-label="Yopish"
              className="rounded-xl p-1.5 transition-colors hover:bg-white/10"
            >
              <CircleX className="h-6 w-6 text-white" strokeWidth={2.25} aria-hidden />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Placeholder({ dark, title }) {
  return (
    <div
      className={`rounded-xl border p-8 text-center ${dark ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white"}`}
    >
      <p className={`text-lg font-semibold ${dark ? "text-slate-100" : "text-slate-900"}`}>{title}</p>
      <p className={`mt-2 text-sm ${dark ? "text-slate-400" : "text-slate-500"}`}>
        Bu bo&apos;lim tez orada to&apos;ldiriladi.
      </p>
    </div>
  )
}

function Modal({ open, onClose, dark, children }) {
  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (e.key === "Escape") onClose?.()
    }
    window.addEventListener("keydown", onDown)
    return () => window.removeEventListener("keydown", onDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 sm:pt-14">
      <button
        type="button"
        aria-label="Yopish"
        className="absolute inset-0 bg-black/40"
        onClick={() => onClose?.()}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-10 w-full max-w-lg rounded-2xl border p-6 text-lg shadow-xl ${
          dark ? "border-slate-700 bg-slate-800 text-slate-100" : "border-slate-200 bg-white text-slate-900"
        }`}
      >
        {children}
      </div>
    </div>
  )
}
