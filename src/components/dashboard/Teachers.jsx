import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { CircleCheck, CircleX, Eye, EyeOff, Loader2, LockKeyhole, Pencil, Plus, SlidersHorizontal, Trash2 } from "lucide-react"
import { fetchAllDepartments } from "../../api/departments"
import { fetchAllFaculties } from "../../api/faculties"
import { fetchAllPositions } from "../../api/positions"
import {
  deleteTeacher,
  fetchAllTeachers,
  saveTeacher,
  updateTeacher,
} from "../../api/teachers"

const TEAL_BG = "bg-teal-500"

function Modal({ open, onClose, dark, children }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 sm:pt-14">
      <button type="button" aria-label="Yopish" className="absolute inset-0 bg-black/40" onClick={() => onClose?.()} />
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

export default function Teachers({ dark }) {
  const [rows, setRows] = useState(/** @type {import("../../api/teachers").TeacherRow[]} */ ([]))
  const [faculties, setFaculties] = useState(/** @type {import("../../api/faculties").FacultyRow[]} */ ([]))
  const [departments, setDepartments] = useState(/** @type {import("../../api/departments").DepartmentRow[]} */ ([]))
  const [positions, setPositions] = useState(/** @type {import("../../api/positions").PositionRow[]} */ ([]))
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState("")
  const [modal, setModal] = useState({
    open: false,
    type: /** @type {null | "view" | "edit" | "credentials" | "delete" | "create"} */ (null),
    row: null,
  })
  const [editDraft, setEditDraft] = useState({
    facultyId: "",
    departmentId: "",
    positionId: "",
    fio: "",
    login: "",
  })
  const [createDraft, setCreateDraft] = useState({
    facultyId: "",
    departmentId: "",
    positionId: "",
    fio: "",
    login: "",
    password: "",
  })
  const [credentialsDraft, setCredentialsDraft] = useState({
    password: "",
  })
  const [showCredentialsPassword, setShowCredentialsPassword] = useState(false)
  const [showCreatePassword, setShowCreatePassword] = useState(false)
  const [searchDraft, setSearchDraft] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [facultyFilter, setFacultyFilter] = useState("all")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [openActionsFor, setOpenActionsFor] = useState(/** @type {string | null} */ (null))
  const [notice, setNotice] = useState({ open: false, message: "", variant: /** @type {"success" | "danger"} */ ("success") })
  const noticeTimeoutRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null))

  const cardBase = dark ? "border-slate-600 bg-slate-800" : "border-slate-200 bg-white shadow-sm"
  const subtitle = dark ? "text-slate-400" : "text-slate-500"
  const title = dark ? "text-slate-100" : "text-slate-900"
  const meta = dark ? "text-slate-500" : "text-slate-400"

  const input = dark
    ? "border-slate-600 bg-slate-900/40 text-slate-100 placeholder:text-slate-600"
    : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
  const selectInput = `${input} ${
    dark ? "[&>option]:bg-slate-800 [&>option]:text-slate-100" : "[&>option]:bg-white [&>option]:text-slate-900"
  }`

  const facultyNames = useMemo(() => {
    /** @type {Record<string, string>} */
    const map = {}
    for (const f of faculties) map[f.id] = f.nameUz
    return map
  }, [faculties])

  const departmentNames = useMemo(() => {
    /** @type {Record<string, string>} */
    const map = {}
    for (const d of departments) map[d.id] = d.nameUz
    return map
  }, [departments])

  const positionNames = useMemo(() => {
    /** @type {Record<string, string>} */
    const map = {}
    for (const p of positions) map[p.id] = p.nameUz
    return map
  }, [positions])

  const loadData = useCallback(async () => {
    setLoading(true)
    setLoadError("")
    try {
      const facList = await fetchAllFaculties()
      setFaculties(facList)
      const names = Object.fromEntries(facList.map((f) => [f.id, f.nameUz]))
      const depList = await fetchAllDepartments(names)
      setDepartments(depList)
      const depNames = Object.fromEntries(depList.map((d) => [d.id, d.nameUz]))
      const posList = await fetchAllPositions()
      setPositions(posList)
      const list = await fetchAllTeachers(names, depNames)
      setRows(
        list.map((r) => ({
          ...r,
          fakultet: r.fakultet || names[r.facultyId] || "",
          kafedra: r.kafedra || depNames[r.departmentId] || "",
        })),
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : "Tyutorlarni yuklab bo'lmadi"
      setLoadError(message)
      setRows([])
      setPositions([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const departmentsForFaculty = (facultyId) =>
    departments.filter((d) => d.facultyId === facultyId)

  const closeModal = () => {
    setShowCredentialsPassword(false)
    setShowCreatePassword(false)
    setModal({ open: false, type: null, row: null })
  }
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
    setEditDraft({
      facultyId: row?.facultyId ?? faculties[0]?.id ?? "",
      departmentId: row?.departmentId ?? "",
      positionId: row?.positionId ?? positions[0]?.id ?? "",
      fio: row?.fio ?? "",
      login: row?.login ?? "",
    })
    setModal({ open: true, type: "edit", row })
  }

  const openDelete = (row) => setModal({ open: true, type: "delete", row })

  const openCredentials = (row) => {
    setCredentialsDraft({
      password: "",
    })
    setModal({ open: true, type: "credentials", row })
  }

  const openCreate = () => {
    const firstFaculty = faculties[0]?.id ?? ""
    setCreateDraft({
      facultyId: firstFaculty,
      departmentId: "",
      positionId: "",
      fio: "",
      login: "",
      password: "",
    })
    setModal({ open: true, type: "create", row: null })
  }

  const onSaveEdit = async () => {
    const row = modal.row
    if (!row?.id || busy) return

    const fio = editDraft.fio.trim()
    const facultyId = editDraft.facultyId
    const departmentId = editDraft.departmentId || ""
    const positionId = editDraft.positionId || ""
    if (!fio || !facultyId) return

    setBusy(true)
    try {
      await updateTeacher(
        row.id,
        {
          fio,
          login: row.login,
          facultyId,
          departmentId,
          positionId,
        },
        facultyNames,
        departmentNames,
      )
      await loadData()
      closeModal()
      showNotice("Muvaffaqiyatli o'zgartirildi")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Saqlab bo'lmadi"
      showNotice(message, "danger")
    } finally {
      setBusy(false)
    }
  }

  const onConfirmDelete = async () => {
    const row = modal.row
    if (!row?.id || busy) return

    setBusy(true)
    try {
      await deleteTeacher(row.id)
      setRows((prev) => prev.filter((r) => r.id !== row.id))
      closeModal()
      showNotice("Muvaffaqiyatli o'chirildi", "danger")
    } catch (err) {
      const message = err instanceof Error ? err.message : "O'chirib bo'lmadi"
      showNotice(message, "danger")
    } finally {
      setBusy(false)
    }
  }

  const onSaveCredentials = async () => {
    const row = modal.row
    if (!row?.id || busy) return

    const password = credentialsDraft.password.trim()
    if (!password) return

    setBusy(true)
    try {
      await updateTeacher(
        row.id,
        {
          fio: row.fio,
          login: row.login,
          facultyId: row.facultyId,
          departmentId: row.departmentId,
          positionId: row.positionId,
          password,
        },
        facultyNames,
        departmentNames,
      )
      closeModal()
      showNotice("Parol muvaqqiyatli o'zgartirildi")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Parolni yangilab bo'lmadi"
      showNotice(message, "danger")
    } finally {
      setBusy(false)
    }
  }

  const onSaveCreate = async () => {
    if (busy) return
    const fio = createDraft.fio.trim()
    const login = createDraft.login.trim()
    const password = createDraft.password.trim()
    const facultyId = createDraft.facultyId
    const departmentId = createDraft.departmentId || ""
    const positionId = createDraft.positionId || ""
    if (!fio || !login || !password || !facultyId) return

    setBusy(true)
    try {
      await saveTeacher(
        { fio, login, password, facultyId, departmentId, positionId },
        facultyNames,
        departmentNames,
      )
      await loadData()
      closeModal()
      showNotice("Muvaffaqiyatli qo'shildi")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Qo'shib bo'lmadi"
      showNotice(message, "danger")
    } finally {
      setBusy(false)
    }
  }

  const facultyFilterOptions = useMemo(() => {
    const ids = new Set(rows.map((r) => r.facultyId).filter(Boolean))
    return faculties.filter((f) => ids.has(f.id))
  }, [faculties, rows])

  const departmentFilterOptions = useMemo(() => {
    const ids = new Set(rows.map((r) => r.departmentId).filter(Boolean))
    return departments.filter((d) => ids.has(d.id))
  }, [departments, rows])

  const filteredRows = rows.filter((row) => {
    if (facultyFilter !== "all" && row.facultyId !== facultyFilter) return false
    if (departmentFilter !== "all" && row.departmentId !== departmentFilter) return false

    const q = searchQuery.trim().toLowerCase()
    if (!q) return true
    return [row.fakultet, row.kafedra, positionNames[row.positionId ?? ""] ?? "", row.fio, row.login].some((value) =>
      String(value ?? "").toLowerCase().includes(q),
    )
  })

  const renderFacultySelect = (value, onFacultyChange, onDepartmentChange) => (
    <select
      value={value}
      onChange={(e) => {
        const nextFaculty = e.target.value
        onFacultyChange(nextFaculty)
        const nextDeps = departmentsForFaculty(nextFaculty)
        onDepartmentChange(nextDeps[0]?.id ?? "")
      }}
      disabled={faculties.length === 0 || loading}
      className={`w-full rounded-lg border px-4 py-3 text-base outline-none ring-teal-500/0 transition-shadow focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${selectInput}`}
    >
      {faculties.length === 0 ? (
        <option value="">Fakultetlar yuklanmadi</option>
      ) : (
        faculties.map((f) => (
          <option key={f.id} value={f.id}>
            {f.nameUz}
          </option>
        ))
      )}
    </select>
  )

  const renderDepartmentSelect = (facultyId, value, onChange) => {
    const deps = departmentsForFaculty(facultyId)
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={deps.length === 0 || loading}
        className={`w-full rounded-lg border px-4 py-3 text-base outline-none ring-teal-500/0 transition-shadow focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${selectInput}`}
      >
        {deps.length === 0 ? (
          <option value="">Kafedralar yo'q</option>
        ) : (
          deps.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nameUz}
            </option>
          ))
        )}
      </select>
    )
  }

  const renderPositionSelect = (value, onChange) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={positions.length === 0 || loading}
      className={`w-full rounded-lg border px-4 py-3 text-base outline-none ring-teal-500/0 transition-shadow focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${selectInput}`}
    >
      {positions.length === 0 ? (
        <option value="">Lavozimlar yuklanmadi</option>
      ) : (
        positions.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nameUz}
          </option>
        ))
      )}
    </select>
  )

  return (
    <div className={`rounded-2xl border ${dark ? "border-slate-700 bg-slate-800/40" : "border-slate-200 bg-white"} p-5 sm:p-6`}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className={`text-xl font-bold tracking-tight ${title}`}>Tyutorlar</h2>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ${
                dark ? "border-emerald-500 text-emerald-300 hover:bg-slate-700/70" : "border-emerald-600 text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              Excelga yuklash
            </button>
            <button
              type="button"
              onClick={openCreate}
              disabled={loading || faculties.length === 0}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60 ${TEAL_BG}`}
            >
              <Plus className="h-4 w-4 shrink-0 stroke-[2.5]" aria-hidden />
              Qo'shish
            </button>
          </div>
        </div>

        {loadError && (
          <p className={`rounded-lg border px-4 py-3 text-sm ${dark ? "border-red-500/40 bg-red-500/10 text-red-300" : "border-red-200 bg-red-50 text-red-700"}`}>
            {loadError}
          </p>
        )}

        <div className="flex w-full flex-wrap items-center gap-2">
          <select
            value={facultyFilter}
            onChange={(e) => setFacultyFilter(e.target.value)}
            disabled={loading}
            className={`w-full sm:w-auto sm:min-w-[11rem] rounded-lg border px-3 py-2.5 text-sm outline-none ring-teal-500/0 transition-shadow focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${selectInput}`}
          >
            <option value="all">Barcha fakultetlar</option>
            {facultyFilterOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nameUz}
              </option>
            ))}
          </select>

          <input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Tyutorni izlash"
            className={`min-w-[12rem] flex-1 rounded-lg border px-4 py-2.5 text-sm outline-none ring-teal-500/0 transition-shadow focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${input}`}
          />
          <button
            type="button"
            onClick={() => setSearchQuery(searchDraft)}
            className={`inline-flex shrink-0 items-center rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ${
              dark ? "border-teal-500 text-teal-300 hover:bg-slate-700/70" : "border-teal-600 text-teal-700 hover:bg-teal-50"
            }`}
          >
            Qidirish
          </button>
        </div>

        {loading ? (
          <div className={`flex items-center justify-center gap-2 rounded-xl border py-16 ${cardBase}`}>
            <Loader2 className="h-6 w-6 animate-spin text-teal-500" aria-hidden />
            <span className={`text-sm font-medium ${subtitle}`}>Yuklanmoqda...</span>
          </div>
        ) : (
        <div className={`overflow-x-auto rounded-xl border ${cardBase}`}>
          <table className={`min-w-full border-collapse text-sm ${dark ? "border-slate-700" : "border-slate-200"}`}>
            <thead className={dark ? "bg-slate-900/40" : "bg-slate-50"}>
              <tr>
                <th className={`border px-4 py-3 text-center text-sm font-bold ${dark ? "border-slate-700" : "border-slate-200"} ${title}`}>№</th>
                <th className={`border px-4 py-3 text-left text-sm font-bold ${dark ? "border-slate-700" : "border-slate-200"} ${title}`}>Fakultet</th>
                <th className={`border px-4 py-3 text-left text-sm font-bold ${dark ? "border-slate-700" : "border-slate-200"} ${title}`}>F.I.O</th>
                <th className={`border px-4 py-3 text-left text-sm font-bold ${dark ? "border-slate-700" : "border-slate-200"} ${title}`}>Login</th>
                <th className={`border px-4 py-3 text-right text-sm font-bold ${dark ? "border-slate-700" : "border-slate-200"} ${title}`}>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, index) => (
                <tr key={row.id}>
                  <td className={`border px-4 py-3 text-center text-sm font-semibold ${dark ? "border-slate-700" : "border-slate-200"} ${title}`}>
                    {index + 1}
                  </td>
                  <td className={`border px-4 py-3 text-sm ${dark ? "border-slate-700" : "border-slate-200"} ${subtitle}`}>{row.fakultet}</td>
                  <td className={`border px-4 py-3 text-sm font-semibold ${dark ? "border-slate-700" : "border-slate-200"} ${title}`}>{row.fio}</td>
                  <td className={`border px-4 py-3 text-sm ${dark ? "border-slate-700" : "border-slate-200"}`}>
                    <span className={`font-bold ${title}`}>{row.login}</span>
                  </td>
                  <td className={`border px-4 py-3 text-center ${dark ? "border-slate-700" : "border-slate-200"}`}>
                    <div className="relative inline-flex">
                      <button
                        type="button"
                        onClick={() => setOpenActionsFor((prev) => (prev === row.id ? null : row.id))}
                        className={`inline-flex items-center justify-center rounded-lg border p-2.5 transition-colors ${
                          dark ? "border-slate-600 text-slate-200 hover:bg-slate-700/70" : "border-slate-300 text-slate-700 hover:bg-slate-100"
                        }`}
                        aria-label="Amallar menyusi"
                        aria-expanded={openActionsFor === row.id}
                      >
                        <SlidersHorizontal className="h-5 w-5" strokeWidth={1.9} aria-hidden />
                      </button>

                      {openActionsFor === row.id && (
                        <div
                          className={`absolute right-0 top-full z-20 mt-2 min-w-52 rounded-xl border p-1 shadow-lg ${
                            dark ? "border-slate-600 bg-slate-800" : "border-slate-200 bg-white"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setOpenActionsFor(null)
                              openCredentials(row)
                            }}
                            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                              dark ? "text-amber-400 hover:bg-slate-700/80" : "text-amber-700 hover:bg-amber-50"
                            }`}
                          >
                            <LockKeyhole className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                            Parolni o'zgartirish
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenActionsFor(null)
                              openView(row)
                            }}
                            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                              dark ? "text-blue-400 hover:bg-slate-700/80" : "text-blue-700 hover:bg-blue-50"
                            }`}
                          >
                            <Eye className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                            Ko'rish
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenActionsFor(null)
                              openEdit(row)
                            }}
                            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                              dark ? "text-emerald-400 hover:bg-slate-700/80" : "text-emerald-700 hover:bg-emerald-50"
                            }`}
                          >
                            <Pencil className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                            Tahrirlash
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenActionsFor(null)
                              openDelete(row)
                            }}
                            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                              dark ? "text-red-400 hover:bg-slate-700/80" : "text-red-700 hover:bg-red-50"
                            }`}
                          >
                            <Trash2 className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                            O'chirish
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}

        {!loading && filteredRows.length === 0 && (
          <p className={`text-center text-sm ${subtitle}`}>{searchQuery ? "Qidiruv bo'yicha natija topilmadi." : "Hozircha tyutor yo'q."}</p>
        )}
      </div>

      <Modal open={modal.open} onClose={closeModal} dark={dark}>
        {modal.type === "view" && modal.row && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-2xl font-bold tracking-tight">Tyutor ma'lumotlari</h3>
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
              <div><p className={`text-xs font-semibold ${meta}`}>Fakultet:</p><p className="mt-1 font-semibold">{modal.row.fakultet}</p></div>
              <div><p className={`text-xs font-semibold ${meta}`}>F.I.O:</p><p className="mt-1 font-semibold">{modal.row.fio}</p></div>
              <div><p className={`text-xs font-semibold ${meta}`}>Login:</p><p className="mt-1 font-semibold">{modal.row.login}</p></div>
            </div>
          </div>
        )}

        {modal.type === "edit" && modal.row && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-2xl font-bold tracking-tight">Tyutorni tahrirlash</h3>
              <button type="button" onClick={closeModal} aria-label="Yopish" className={`-mt-2 rounded-lg p-2 transition-colors ${dark ? "hover:bg-slate-700/70" : "hover:bg-slate-100"}`}>
                <CircleX className={`h-7 w-7 ${dark ? "text-white" : "text-slate-900"}`} strokeWidth={2.25} aria-hidden />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2"><label className="text-base font-semibold">Fakultet</label>{renderFacultySelect(editDraft.facultyId, (facultyId) => setEditDraft((p) => ({ ...p, facultyId })), (departmentId) => setEditDraft((p) => ({ ...p, departmentId })))}</div>
              <div className="space-y-2"><label className="text-base font-semibold">F.I.O</label><input value={editDraft.fio} onChange={(e) => setEditDraft((p) => ({ ...p, fio: e.target.value }))} disabled={busy} className={`w-full rounded-lg border px-4 py-3 text-base outline-none ring-teal-500/0 transition-shadow focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${input}`} /></div>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button type="button" onClick={onSaveEdit} disabled={busy} className="inline-flex min-w-[11rem] items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-base font-bold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60">Saqlash</button>
              <button type="button" onClick={closeModal} className={`inline-flex min-w-[11rem] items-center justify-center rounded-full border px-6 py-3 text-base font-bold transition-colors ${dark ? "border-slate-600 text-slate-200 hover:bg-slate-700/70" : "border-slate-200 text-slate-800 hover:bg-slate-50"}`}>Bekor qilish</button>
            </div>
          </div>
        )}

        {modal.type === "delete" && modal.row && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-2xl font-bold tracking-tight">Tyutorni o'chirishni tasdiqlaysizmi?</h3>
              <button type="button" onClick={closeModal} aria-label="Yopish" className={`-mt-2 rounded-lg p-2 transition-colors ${dark ? "hover:bg-slate-700/70" : "hover:bg-slate-100"}`}>
                <CircleX className={`h-7 w-7 ${dark ? "text-white" : "text-slate-900"}`} strokeWidth={2.25} aria-hidden />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button type="button" onClick={onConfirmDelete} disabled={busy} className="inline-flex min-w-[11rem] items-center justify-center rounded-2xl bg-red-500 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60">Ha</button>
              <button type="button" onClick={closeModal} className="inline-flex min-w-[11rem] items-center justify-center rounded-2xl bg-blue-500 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-600">Yo'q</button>
            </div>
          </div>
        )}

        {modal.type === "credentials" && modal.row && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-2xl font-bold tracking-tight">Parolini o'zgartirish</h3>
              <button type="button" onClick={closeModal} aria-label="Yopish" className={`-mt-2 rounded-lg p-2 transition-colors ${dark ? "hover:bg-slate-700/70" : "hover:bg-slate-100"}`}>
                <CircleX className={`h-7 w-7 ${dark ? "text-white" : "text-slate-900"}`} strokeWidth={2.25} aria-hidden />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-base font-semibold">Login</label>
                <input value={modal.row.login} readOnly className={`w-full rounded-lg border px-4 py-3 text-base ${input}`} />
              </div>
              <div className="space-y-2">
                <label className="text-base font-semibold">Yangi parol</label>
                <div className="relative">
                  <input
                    type={showCredentialsPassword ? "text" : "password"}
                    value={credentialsDraft.password}
                    onChange={(e) => setCredentialsDraft((p) => ({ ...p, password: e.target.value }))}
                    className={`w-full rounded-lg border py-3 pl-4 pr-12 text-base outline-none ring-teal-500/0 transition-shadow focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${input}`}
                    placeholder="Yangi parol kiriting"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowCredentialsPassword((v) => !v)}
                    aria-label={showCredentialsPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                    className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg transition-colors text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  >
                    {showCredentialsPassword ? <EyeOff className="h-5 w-5" strokeWidth={2} aria-hidden /> : <Eye className="h-5 w-5" strokeWidth={2} aria-hidden />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button type="button" onClick={onSaveCredentials} disabled={busy} className="inline-flex min-w-[11rem] items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-base font-bold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60">Saqlash</button>
              <button type="button" onClick={closeModal} className={`inline-flex min-w-[11rem] items-center justify-center rounded-full border px-6 py-3 text-base font-bold transition-colors ${dark ? "border-slate-600 text-slate-200 hover:bg-slate-700/70" : "border-slate-200 text-slate-800 hover:bg-slate-50"}`}>Bekor qilish</button>
            </div>
          </div>
        )}

        {modal.type === "create" && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-2xl font-bold tracking-tight">Tyutor qo'shish</h3>
              <button type="button" onClick={closeModal} aria-label="Yopish" className={`-mt-2 rounded-lg p-2 transition-colors ${dark ? "hover:bg-slate-700/70" : "hover:bg-slate-100"}`}>
                <CircleX className={`h-7 w-7 ${dark ? "text-white" : "text-slate-900"}`} strokeWidth={2.25} aria-hidden />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2"><label className="text-base font-semibold">Fakultet</label>{renderFacultySelect(createDraft.facultyId, (facultyId) => setCreateDraft((p) => ({ ...p, facultyId })), (departmentId) => setCreateDraft((p) => ({ ...p, departmentId })))}</div>
              <div className="space-y-2"><label className="text-base font-semibold">F.I.O</label><input value={createDraft.fio} onChange={(e) => setCreateDraft((p) => ({ ...p, fio: e.target.value }))} disabled={busy} className={`w-full rounded-lg border px-4 py-3 text-base outline-none ring-teal-500/0 transition-shadow focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${input}`} placeholder="Masalan: F.I.O" /></div>
              <div className="space-y-2"><label className="text-base font-semibold">Login</label><input value={createDraft.login} onChange={(e) => setCreateDraft((p) => ({ ...p, login: e.target.value }))} disabled={busy} className={`w-full rounded-lg border px-4 py-3 text-base outline-none ring-teal-500/0 transition-shadow focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${input}`} placeholder="Teacher.login" /></div>
              <div className="space-y-2">
                <label className="text-base font-semibold">Parol</label>
                <div className="relative">
                  <input
                    type={showCreatePassword ? "text" : "password"}
                    value={createDraft.password}
                    onChange={(e) => setCreateDraft((p) => ({ ...p, password: e.target.value }))}
                    disabled={busy}
                    className={`w-full rounded-lg border py-3 pl-4 pr-12 text-base outline-none ring-teal-500/0 transition-shadow focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${input}`}
                    placeholder="Parol kiriting"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowCreatePassword((v) => !v)}
                    aria-label={showCreatePassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                    className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg transition-colors text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  >
                    {showCreatePassword ? <EyeOff className="h-5 w-5" strokeWidth={2} aria-hidden /> : <Eye className="h-5 w-5" strokeWidth={2} aria-hidden />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button type="button" onClick={onSaveCreate} disabled={busy} className="inline-flex min-w-[11rem] items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-base font-bold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60">Qo'shish</button>
              <button type="button" onClick={closeModal} className={`inline-flex min-w-[11rem] items-center justify-center rounded-full border px-6 py-3 text-base font-bold transition-colors ${dark ? "border-slate-600 text-slate-200 hover:bg-slate-700/70" : "border-slate-200 text-slate-800 hover:bg-slate-50"}`}>Bekor qilish</button>
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
            <button type="button" onClick={closeNotice} aria-label="Yopish" className="rounded-xl p-1.5 transition-colors hover:bg-white/10">
              <CircleX className="h-6 w-6 text-white" strokeWidth={2.25} aria-hidden />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
