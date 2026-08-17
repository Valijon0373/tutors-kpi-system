import { useEffect, useState } from "react"
import {
  Calendar,
  Check,
  CheckCircle,
  Copy,
  Clock,
  Edit2,
  Key,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
  Lock,
  UserCheck,
  AlertCircle,
  X,
  ChevronRight,
  Layers,
} from "lucide-react"
import {
  fetchAllAcademicYears,
  createAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
  activateAcademicYear,
  setAcademicYearWindows,
  setSeasonWindows,
  copyAcademicYearCriteria,
  fetchAcademicYearSeasons,
} from "../../api/academicYears"
import { fetchAllRoles, setRolePermissions, fetchAllPermissions } from "../../api/roles"
import { changeUserPassword } from "../../api/users"
import { changeTeacherPassword } from "../../api/teachers"
import { formatApiErrorMessage } from "../../api/client"
import { getPermissionLabelUz } from "../../data/permissionLabels"


export default function Settings({ dark }) {
  const [activeTab, setActiveTab] = useState("academicYears") // 'academicYears' | 'roles' | 'passwords'

  // Notification / toast state
  const [toast, setToast] = useState(null)

  const showToast = (message, type = "success") => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // --- ACADEMIC YEARS STATE ---
  const [academicYears, setAcademicYears] = useState([])
  const [loadingYears, setLoadingYears] = useState(true)
  const [selectedYear, setSelectedYear] = useState(null)
  const [seasons, setSeasons] = useState([])
  const [loadingSeasons, setLoadingSeasons] = useState(false)

  // Modals
  const [showYearModal, setShowYearModal] = useState(false)
  const [editingYear, setEditingYear] = useState(null)
  const [yearForm, setYearForm] = useState({ name: "", startYear: 2026, endYear: 2027, active: false })

  const [showWindowModal, setShowWindowModal] = useState(false)
  const [windowTarget, setWindowTarget] = useState(null) // { type: 'year'|'season', id: number, title: string }
  const [windowForm, setWindowForm] = useState({
    uploadFrom: "",
    uploadTo: "",
    scoringFrom: "",
    scoringTo: "",
  })

  const [showCopyModal, setShowCopyModal] = useState(false)
  const [targetYearId, setTargetYearId] = useState(null)
  const [sourceYearId, setSourceYearId] = useState("")

  // --- ROLES & PERMISSIONS STATE ---
  const [roles, setRoles] = useState([])
  const [allPermissions, setAllPermissions] = useState([])
  const [selectedRole, setSelectedRole] = useState(null)
  const [rolePermissions, setRolePermissionsState] = useState([])
  const [loadingRoles, setLoadingRoles] = useState(false)
  const [savingRolePerms, setSavingRolePerms] = useState(false)

  // --- PASSWORD CHANGE STATE ---
  const [pwdTarget, setPwdTarget] = useState("user") // 'user' | 'tutor'
  const [pwdForm, setPwdForm] = useState({ username: "", newPassword: "", confirmPassword: "" })
  const [pwdLoading, setPwdLoading] = useState(false)

  // Load initial data
  const loadAcademicYears = async () => {
    setLoadingYears(true)
    try {
      const data = await fetchAllAcademicYears()
      setAcademicYears(data)
      if (data.length > 0) {
        const active = data.find((y) => y.active) || data[0]
        setSelectedYear(active)
      }
    } catch (err) {
      showToast(formatApiErrorMessage(err.message), "error")
    } finally {
      setLoadingYears(false)
    }
  }

  const loadRolesAndPermissions = async () => {
    setLoadingRoles(true)
    try {
      const [rList, pList] = await Promise.all([fetchAllRoles(), fetchAllPermissions()])
      setRoles(rList)
      setAllPermissions(pList)
      if (rList.length > 0) {
        setSelectedRole(rList[0])
        setRolePermissionsState(rList[0].permissions || [])
      }
    } catch (err) {
      showToast(formatApiErrorMessage(err.message), "error")
    } finally {
      setLoadingRoles(false)
    }
  }

  useEffect(() => {
    loadAcademicYears()
    loadRolesAndPermissions()
  }, [])

  useEffect(() => {
    if (!selectedYear?.id) return
    let cancelled = false
    setLoadingSeasons(true)
    fetchAcademicYearSeasons(selectedYear.id)
      .then((data) => {
        if (!cancelled) setSeasons(data)
      })
      .catch(() => {
        if (!cancelled) setSeasons([])
      })
      .finally(() => {
        if (!cancelled) setLoadingSeasons(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedYear])

  // --- ACADEMIC YEAR HANDLERS ---
  const handleSaveAcademicYear = async (e) => {
    e.preventDefault()
    try {
      if (editingYear) {
        await updateAcademicYear(editingYear.id, yearForm)
        showToast("O'quv yili muvaffaqiyatli yangilandi!")
      } else {
        await createAcademicYear(yearForm)
        showToast("Yangi o'quv yili yaratildi!")
      }
      setShowYearModal(false)
      loadAcademicYears()
    } catch (err) {
      showToast(formatApiErrorMessage(err.message), "error")
    }
  }

  const handleActivateYear = async (id) => {
    try {
      await activateAcademicYear(id)
      showToast("O'quv yili faollashtirildi!")
      loadAcademicYears()
    } catch (err) {
      showToast(formatApiErrorMessage(err.message), "error")
    }
  }

  const handleDeleteYear = async (id) => {
    if (!window.confirm("Haqiqatdan ham ushbu o'quv yilini o'chirmoqchimisiz?")) return
    try {
      await deleteAcademicYear(id)
      showToast("O'quv yili o'chirildi!")
      loadAcademicYears()
    } catch (err) {
      showToast(formatApiErrorMessage(err.message), "error")
    }
  }

  const handleOpenWindowModal = (target) => {
    // target: { type: 'year', item: AcademicYear } or { type: 'season', item: Season }
    setWindowTarget(target)
    const item = target.item
    setWindowForm({
      uploadFrom: item.uploadFrom || "",
      uploadTo: item.uploadTo || "",
      scoringFrom: item.scoringFrom || "",
      scoringTo: item.scoringTo || "",
    })
    setShowWindowModal(true)
  }

  const handleSaveWindows = async (e) => {
    e.preventDefault()
    if (!windowTarget) return
    try {
      if (windowTarget.type === "year") {
        await setAcademicYearWindows(windowTarget.item.id, windowForm)
      } else {
        await setSeasonWindows(windowTarget.item.id, windowForm)
      }
      showToast("Yuklash va baholash muddatlari saqlandi!")
      setShowWindowModal(false)
      loadAcademicYears()
      if (selectedYear?.id) {
        fetchAcademicYearSeasons(selectedYear.id).then(setSeasons)
      }
    } catch (err) {
      showToast(formatApiErrorMessage(err.message), "error")
    }
  }

  const handleCopyCriteria = async (e) => {
    e.preventDefault()
    if (!targetYearId || !sourceYearId) return
    try {
      const res = await copyAcademicYearCriteria(targetYearId, sourceYearId)
      showToast(
        res.message ||
          `Mezonlar ko'chirildi! (${res.copiedCriteria ?? 0} mezon, ${res.copiedCategories ?? 0} kategoriya)`,
      )
      setShowCopyModal(false)
    } catch (err) {
      showToast(formatApiErrorMessage(err.message), "error")
    }
  }

  // --- ROLE PERMISSIONS HANDLERS ---
  const handleSelectRole = (role) => {
    setSelectedRole(role)
    setRolePermissionsState(role.permissions || [])
  }

  const handleTogglePermission = (permName) => {
    setRolePermissionsState((prev) =>
      prev.includes(permName) ? prev.filter((p) => p !== permName) : [...prev, permName],
    )
  }

  const handleSaveRolePermissions = async () => {
    if (!selectedRole) return
    setSavingRolePerms(true)
    try {
      await setRolePermissions(selectedRole.name, rolePermissions)
      showToast(`${selectedRole.name} roliga ruxsatlar biriktirildi!`)
      loadRolesAndPermissions()
    } catch (err) {
      showToast(formatApiErrorMessage(err.message), "error")
    } finally {
      setSavingRolePerms(false)
    }
  }

  // --- PASSWORD HANDLER ---
  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault()
    if (!pwdForm.username || !pwdForm.newPassword) {
      showToast("Username va yangi parolni kiriting", "error")
      return
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      showToast("Parollar mos kelmadi", "error")
      return
    }

    setPwdLoading(true)
    try {
      if (pwdTarget === "user") {
        await changeUserPassword(pwdForm.username, pwdForm.newPassword)
      } else {
        await changeTeacherPassword({ username: pwdForm.username, newPassword: pwdForm.newPassword })
      }
      showToast("Parol muvaffaqiyatli o'zgartirildi!")
      setPwdForm({ username: "", newPassword: "", confirmPassword: "" })
    } catch (err) {
      showToast(formatApiErrorMessage(err.message), "error")
    } finally {
      setPwdLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Notification Toast */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-xl border px-5 py-3 shadow-xl transition-all ${
            toast.type === "error"
              ? "border-red-500/50 bg-red-900/90 text-white"
              : "border-teal-500/50 bg-teal-900/90 text-white"
          }`}
        >
          {toast.type === "error" ? <AlertCircle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Header & Tabs */}
      <div
        className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5 shadow-sm ${
          dark ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white"
        }`}
      >
        <div>
          <h2 className="text-xl font-bold">Tizim Sozlamalari</h2>
          <p className={`text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>
            O'quv yillari, baholash muddatlari va tizim ruxsatlarini boshqarish
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("academicYears")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              activeTab === "academicYears"
                ? "bg-teal-500 text-white shadow-md shadow-teal-500/20"
                : dark
                  ? "text-slate-300 hover:bg-slate-700"
                  : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Calendar className="h-4 w-4" />
            O'quv yillari va Mavsumlar
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("roles")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              activeTab === "roles"
                ? "bg-teal-500 text-white shadow-md shadow-teal-500/20"
                : dark
                  ? "text-slate-300 hover:bg-slate-700"
                  : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Shield className="h-4 w-4" />
            Rollar va Ruxsatlar
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("passwords")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              activeTab === "passwords"
                ? "bg-teal-500 text-white shadow-md shadow-teal-500/20"
                : dark
                  ? "text-slate-300 hover:bg-slate-700"
                  : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Key className="h-4 w-4" />
            Parolni O'zgartirish
          </button>
        </div>
      </div>

      {/* TAB 1: ACADEMIC YEARS & SEASONS */}
      {activeTab === "academicYears" && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-teal-500" />
              O'quv yillari ro'yxati
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingYear(null)
                  setYearForm({ name: "", startYear: 2026, endYear: 2027, active: false })
                  setShowYearModal(true)
                }}
                className="flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-teal-600 shadow-md shadow-teal-500/20"
              >
                <Plus className="h-4 w-4" />
                Yangi o'quv yili
              </button>
            </div>
          </div>

          {/* Academic Years List Grid */}
          {loadingYears ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-teal-500" />
            </div>
          ) : academicYears.length === 0 ? (
            <div
              className={`rounded-2xl border p-8 text-center ${
                dark ? "border-slate-700 bg-slate-800 text-slate-400" : "border-slate-200 bg-white text-slate-500"
              }`}
            >
              Hozircha o'quv yillari mavjud emas. Yuqoridagi tugma orqali yangi o'quv yili qo'shing.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {academicYears.map((year) => {
                const isSelected = selectedYear?.id === year.id
                return (
                  <div
                    key={year.id}
                    className={`relative rounded-2xl border p-5 transition-all ${
                      year.active
                        ? dark
                          ? "border-teal-500/60 bg-teal-950/20 shadow-lg shadow-teal-950/30"
                          : "border-teal-500 bg-teal-50/50 shadow-lg shadow-teal-500/10"
                        : dark
                          ? "border-slate-700 bg-slate-800 hover:border-slate-600"
                          : "border-slate-200 bg-white hover:border-slate-300"
                    } ${isSelected ? "ring-2 ring-teal-500" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-bold">{year.name || `${year.startYear}-${year.endYear}`}</h4>
                          {year.active && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/20 px-2.5 py-0.5 text-xs font-semibold text-teal-500">
                              <CheckCircle className="h-3.5 w-3.5" /> Faol
                            </span>
                          )}
                        </div>
                        <p className={`text-xs mt-1 ${dark ? "text-slate-400" : "text-slate-500"}`}>
                          Davr: {year.startYear} - {year.endYear}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          title="Tahrirlash"
                          onClick={() => {
                            setEditingYear(year)
                            setYearForm({
                              name: year.name || "",
                              startYear: year.startYear,
                              endYear: year.endYear,
                              active: year.active,
                            })
                            setShowYearModal(true)
                          }}
                          className={`rounded-lg p-1.5 transition-colors ${
                            dark ? "hover:bg-slate-700 text-slate-300" : "hover:bg-slate-100 text-slate-600"
                          }`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="O'chirish"
                          onClick={() => handleDeleteYear(year.id)}
                          className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Window dates summary */}
                    <div className={`mt-4 rounded-xl p-3 text-xs space-y-1.5 ${dark ? "bg-slate-900/60" : "bg-slate-100"}`}>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Hujjat topshirish:</span>
                        <span className="font-medium">
                          {year.uploadFrom && year.uploadTo
                            ? `${year.uploadFrom} — ${year.uploadTo}`
                            : "Belgilanmagan"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Baholash davri:</span>
                        <span className="font-medium">
                          {year.scoringFrom && year.scoringTo
                            ? `${year.scoringFrom} — ${year.scoringTo}`
                            : "Belgilanmagan"}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons on card */}
                    <div className="mt-4 flex flex-wrap gap-2 pt-2 border-t border-slate-700/30">
                      {!year.active && (
                        <button
                          type="button"
                          onClick={() => handleActivateYear(year.id)}
                          className="flex items-center gap-1 text-xs font-semibold text-teal-500 hover:underline"
                        >
                          <Check className="h-3.5 w-3.5" /> Faollashtirish
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenWindowModal({ type: "year", item: year })}
                        className="flex items-center gap-1 text-xs font-semibold text-blue-500 hover:underline"
                      >
                        <Clock className="h-3.5 w-3.5" /> Muddatlarni o'rnatish
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTargetYearId(year.id)
                          setSourceYearId("")
                          setShowCopyModal(true)
                        }}
                        className="flex items-center gap-1 text-xs font-semibold text-purple-500 hover:underline"
                      >
                        <Copy className="h-3.5 w-3.5" /> Mezon ko'chirish
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedYear(year)}
                        className={`ml-auto flex items-center gap-1 text-xs font-semibold ${
                          isSelected ? "text-teal-500 font-bold" : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        Mavsumlar <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Selected Year Seasons Details */}
          {selectedYear && (
            <div
              className={`rounded-2xl border p-6 space-y-4 ${
                dark ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between border-b pb-3 border-slate-700/50">
                <h4 className="text-base font-bold flex items-center gap-2">
                  <Layers className="h-5 w-5 text-teal-500" />
                  {selectedYear.name || `${selectedYear.startYear}-${selectedYear.endYear}`} o'quv yili mavsumlari (Choraklar)
                </h4>
                <span className="text-xs text-slate-400">Jami 4 chorak mavsumi</span>
              </div>

              {loadingSeasons ? (
                <div className="flex justify-center py-6">
                  <RefreshCw className="h-6 w-6 animate-spin text-teal-500" />
                </div>
              ) : seasons.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">
                  Mavsumlar yuklanmadi yoki backend bu o'quv yili uchun javob bermadi.
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {seasons.map((season) => (
                    <div
                      key={season.id}
                      className={`rounded-xl border p-4 flex flex-col justify-between space-y-3 ${
                        dark ? "border-slate-700 bg-slate-900/50" : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <h5 className="font-bold text-sm text-teal-500">{season.name || `${season.number}-chorak`}</h5>
                          <span className="text-xs font-mono text-slate-400">{season.quarter}</span>
                        </div>
                        {season.months && <p className="text-xs text-slate-400 mt-0.5">{season.months}</p>}
                      </div>

                      <div className="text-xs space-y-1 py-2 border-y border-slate-700/30">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Yuklash:</span>
                          <span className="font-medium">{season.uploadFrom ? `${season.uploadFrom} - ${season.uploadTo}` : "Erkin"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Baholash:</span>
                          <span className="font-medium">{season.scoringFrom ? `${season.scoringFrom} - ${season.scoringTo}` : "Erkin"}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenWindowModal({ type: "season", item: season })}
                        className="w-full flex items-center justify-center gap-1 text-xs font-semibold rounded-lg bg-teal-500/10 text-teal-500 hover:bg-teal-500 hover:text-white py-1.5 transition-all"
                      >
                        <Clock className="h-3.5 w-3.5" /> Muddatni o'zgartirish
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ROLES & PERMISSIONS */}
      {activeTab === "roles" && (
        <div className="space-y-6">
          {loadingRoles ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-teal-500" />
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Roles Selector List */}
              <div
                className={`rounded-2xl border p-5 space-y-3 ${
                  dark ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white"
                }`}
              >
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Shield className="h-5 w-5 text-teal-500" />
                  Rollar Ro'yxati
                </h3>
                <p className={`text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>
                  Ruxsatlarini tahrirlash uchun rolni tanlang
                </p>

                <div className="space-y-2 pt-2">
                  {roles.map((role) => {
                    const isSelected = selectedRole?.name === role.name
                    const roleUpper = String(role.name || "").toUpperCase()
                    const roleLabelUz =
                      roleUpper === "ADMIN"
                        ? "Admin (Tizim administratori)"
                        : roleUpper === "USER"
                          ? "Foydalanuvchi"
                          : roleUpper === "COMMISSION" || roleUpper === "MODERATOR"
                            ? "Komissiya a'zosi"
                            : roleUpper === "TUTOR"
                              ? "Tyutor"
                              : roleUpper === "TEACHER"
                                ? "O'qituvchi"
                                : role.name
                    return (
                      <button
                        key={role.id || role.name}
                        type="button"
                        onClick={() => handleSelectRole(role)}
                        className={`w-full flex items-center justify-between p-3.5 rounded-xl text-left text-sm font-semibold transition-all ${
                          isSelected
                            ? "bg-teal-500 text-white shadow-md shadow-teal-500/20"
                            : dark
                              ? "bg-slate-900/60 text-slate-200 hover:bg-slate-700"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        <div className="flex flex-col">
                          <span>{roleLabelUz}</span>
                          <span className="text-[10px] opacity-70 font-mono">{role.name}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${isSelected ? "bg-white/20" : "bg-slate-500/20"}`}>
                          {role.permissions?.length || 0} ruxsat
                        </span>
                      </button>
                    )
                  })}

                </div>
              </div>

              {/* Permissions Checklist for selected role */}
              <div
                className={`lg:col-span-2 rounded-2xl border p-5 space-y-4 ${
                  dark ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white"
                }`}
              >
                {selectedRole ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4 border-slate-700/50">
                      <div>
                        <h3 className="text-lg font-bold text-teal-500">
                          {selectedRole.name} rolining ruxsatlari
                        </h3>
                        <p className={`text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>
                          Tanlangan ruxsatlar foydalanuvchilarga ushbu rol tayinlanganda beriladi
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={savingRolePerms}
                        onClick={handleSaveRolePermissions}
                        className="flex items-center gap-2 rounded-xl bg-teal-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-teal-600 disabled:opacity-50 shadow-md shadow-teal-500/20"
                      >
                        {savingRolePerms ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        Saqlash
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 max-h-[500px] overflow-y-auto pr-1">
                      {allPermissions.map((perm) => {
                        const code = perm.name || perm.code || perm.id
                        const checked = rolePermissions.includes(code)
                        const labelUz = getPermissionLabelUz(code)
                        return (
                          <label
                            key={code}
                            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                              checked
                                ? dark
                                  ? "border-teal-500/60 bg-teal-950/20 text-teal-300"
                                  : "border-teal-500 bg-teal-50 text-teal-900"
                                : dark
                                  ? "border-slate-700 bg-slate-900/40 text-slate-300 hover:border-slate-600"
                                  : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleTogglePermission(code)}
                              className="mt-0.5 h-4 w-4 rounded text-teal-500 focus:ring-teal-500"
                            />
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold leading-tight">
                                {labelUz || code}
                              </span>
                              <span className="text-[11px] font-mono opacity-60">{code}</span>
                            </div>
                          </label>
                        )

                      })}
                    </div>
                  </>
                ) : (
                  <p className="text-center text-slate-400 py-12">Iltimos, ruxsatlarni ko'rish uchun rol tanlang.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PASSWORD CHANGE */}
      {activeTab === "passwords" && (
        <div className="max-w-xl mx-auto space-y-6">
          <div
            className={`rounded-2xl border p-6 space-y-6 ${
              dark ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white"
            }`}
          >
            <div className="border-b pb-4 border-slate-700/50">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Key className="h-5 w-5 text-teal-500" />
                Parolni o'zgartirish
              </h3>
              <p className={`text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>
                Foydalanuvchi yoki tyutorning parolini yangilash (ADMIN ruxsati bilan)
              </p>
            </div>

            {/* Target Switcher */}
            <div
              className={`flex rounded-xl p-1.5 border transition-all ${
                dark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-slate-100"
              }`}
            >
              <button
                type="button"
                onClick={() => setPwdTarget("user")}
                className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
                  pwdTarget === "user"
                    ? "bg-teal-500 text-white shadow-md shadow-teal-500/20"
                    : dark
                      ? "text-slate-300 hover:bg-slate-800"
                      : "text-slate-700 hover:bg-slate-200"
                }`}
              >
                Foydalanuvchi / Admin
              </button>
              <button
                type="button"
                onClick={() => setPwdTarget("tutor")}
                className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
                  pwdTarget === "tutor"
                    ? "bg-teal-500 text-white shadow-md shadow-teal-500/20"
                    : dark
                      ? "text-slate-300 hover:bg-slate-800"
                      : "text-slate-700 hover:bg-slate-200"
                }`}
              >
                Tyutor
              </button>
            </div>


            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {pwdTarget === "user" ? "Foydalanuvchi login (username)" : "Tyutor login (username)"}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Masalan: akbar123"
                    value={pwdForm.username}
                    onChange={(e) => setPwdForm({ ...pwdForm, username: e.target.value })}
                    className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      dark ? "border-slate-700 bg-slate-900 text-white" : "border-slate-200 bg-slate-50 text-slate-800"
                    }`}
                  />
                  <UserCheck className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Yangi parol</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="Yangi parolni kiriting"
                    value={pwdForm.newPassword}
                    onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                    className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      dark ? "border-slate-700 bg-slate-900 text-white" : "border-slate-200 bg-slate-50 text-slate-800"
                    }`}
                  />
                  <Lock className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Yangi parolni tasdiqlang</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="Yangi parolni qayta kiriting"
                    value={pwdForm.confirmPassword}
                    onChange={(e) => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })}
                    className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      dark ? "border-slate-700 bg-slate-900 text-white" : "border-slate-200 bg-slate-50 text-slate-800"
                    }`}
                  />
                  <Lock className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                </div>
              </div>

              <button
                type="submit"
                disabled={pwdLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-teal-500 py-3 text-sm font-semibold text-white transition-all hover:bg-teal-600 disabled:opacity-50 shadow-md shadow-teal-500/20 mt-4"
              >
                {pwdLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                Parolni yangilash
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODALS --- */}

      {/* 1. Academic Year Modal (Create/Edit) */}
      {showYearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div
            className={`w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl ${
              dark ? "border-slate-700 bg-slate-800 text-white" : "border-slate-200 bg-white text-slate-900"
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-slate-700/50">
              <h3 className="font-bold text-base">
                {editingYear ? "O'quv yilini tahrirlash" : "Yangi o'quv yili yaratish"}
              </h3>
              <button type="button" onClick={() => setShowYearModal(false)} className="rounded-lg p-1 hover:bg-slate-700/50">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAcademicYear} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Nomi (Ixtiyoriy)</label>
                <input
                  type="text"
                  placeholder="Masalan: 2026-2027"
                  value={yearForm.name}
                  onChange={(e) => setYearForm({ ...yearForm, name: e.target.value })}
                  className={`w-full rounded-xl border px-3 py-2 text-sm ${
                    dark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-slate-50"
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Boshlanish yili</label>
                  <input
                    type="number"
                    required
                    value={yearForm.startYear}
                    onChange={(e) => setYearForm({ ...yearForm, startYear: Number(e.target.value) })}
                    className={`w-full rounded-xl border px-3 py-2 text-sm ${
                      dark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-slate-50"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Tugash yili</label>
                  <input
                    type="number"
                    required
                    value={yearForm.endYear}
                    onChange={(e) => setYearForm({ ...yearForm, endYear: Number(e.target.value) })}
                    className={`w-full rounded-xl border px-3 py-2 text-sm ${
                      dark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-slate-50"
                    }`}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={yearForm.active}
                  onChange={(e) => setYearForm({ ...yearForm, active: e.target.checked })}
                  className="h-4 w-4 rounded text-teal-500 focus:ring-teal-500"
                />
                <span className="text-xs font-semibold">Ushbu o'quv yilini faol deb belgilash</span>
              </label>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowYearModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-700/50"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-500 px-5 py-2 text-xs font-semibold text-white hover:bg-teal-600"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Windows Modal (Upload / Scoring Dates) */}
      {showWindowModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div
            className={`w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl ${
              dark ? "border-slate-700 bg-slate-800 text-white" : "border-slate-200 bg-white text-slate-900"
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-slate-700/50">
              <h3 className="font-bold text-base">
                {windowTarget?.type === "year" ? "Yillik muddatlarni o'rnatish" : "Mavsumiy muddatlarni o'rnatish"}
              </h3>
              <button type="button" onClick={() => setShowWindowModal(false)} className="rounded-lg p-1 hover:bg-slate-700/50">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWindows} className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-bold text-teal-500 uppercase">Hujjat topshirish davri (Upload window)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Boshlanish sana</label>
                    <input
                      type="date"
                      required
                      value={windowForm.uploadFrom}
                      onChange={(e) => setWindowForm({ ...windowForm, uploadFrom: e.target.value })}
                      className={`w-full rounded-xl border px-3 py-2 text-xs ${
                        dark ? "border-slate-700 bg-slate-900 text-white" : "border-slate-200 bg-slate-50"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Tugash sana</label>
                    <input
                      type="date"
                      required
                      value={windowForm.uploadTo}
                      onChange={(e) => setWindowForm({ ...windowForm, uploadTo: e.target.value })}
                      className={`w-full rounded-xl border px-3 py-2 text-xs ${
                        dark ? "border-slate-700 bg-slate-900 text-white" : "border-slate-200 bg-slate-50"
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <p className="text-xs font-bold text-purple-500 uppercase">Baholash davri (Scoring window)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Boshlanish sana</label>
                    <input
                      type="date"
                      required
                      value={windowForm.scoringFrom}
                      onChange={(e) => setWindowForm({ ...windowForm, scoringFrom: e.target.value })}
                      className={`w-full rounded-xl border px-3 py-2 text-xs ${
                        dark ? "border-slate-700 bg-slate-900 text-white" : "border-slate-200 bg-slate-50"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Tugash sana</label>
                    <input
                      type="date"
                      required
                      value={windowForm.scoringTo}
                      onChange={(e) => setWindowForm({ ...windowForm, scoringTo: e.target.value })}
                      className={`w-full rounded-xl border px-3 py-2 text-xs ${
                        dark ? "border-slate-700 bg-slate-900 text-white" : "border-slate-200 bg-slate-50"
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowWindowModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-700/50"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-500 px-5 py-2 text-xs font-semibold text-white hover:bg-teal-600"
                >
                  Muddatlarni saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Copy Criteria Modal */}
      {showCopyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div
            className={`w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl ${
              dark ? "border-slate-700 bg-slate-800 text-white" : "border-slate-200 bg-white text-slate-900"
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-slate-700/50">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Copy className="h-4 w-4 text-teal-500" />
                Mezon va kategoriyalarni ko'chirish
              </h3>
              <button type="button" onClick={() => setShowCopyModal(false)} className="rounded-lg p-1 hover:bg-slate-700/50">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCopyCriteria} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Manba (Qaysi o'quv yilidan nusxalansin)</label>
                <select
                  required
                  value={sourceYearId}
                  onChange={(e) => setSourceYearId(e.target.value)}
                  className={`w-full rounded-xl border px-3 py-2 text-sm ${
                    dark ? "border-slate-700 bg-slate-900 text-white" : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <option value="">O'quv yilini tanlang...</option>
                  {academicYears
                    .filter((y) => y.id !== targetYearId)
                    .map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.name || `${y.startYear}-${y.endYear}`}
                      </option>
                    ))}
                </select>
              </div>

              <p className="text-xs text-slate-400">
                Ushbu amal tanlangan o'quv yilidagi barcha mezon va ularning kategoriyalarini nishon o'quv yiliga nusxalaydi.
              </p>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCopyModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-700/50"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-500 px-5 py-2 text-xs font-semibold text-white hover:bg-teal-600"
                >
                  Nusxalash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
