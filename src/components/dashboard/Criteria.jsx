import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  ChevronDown,
  ChevronUp,
  CircleCheck,
  CircleX,
  Eye,
  FolderPlus,
  Loader2,
  Pencil,
  Plus,
  SlidersHorizontal,
  Trash2,
} from "lucide-react"
import {
  deleteCriterionRow,
  fetchAllCriterionRows,
  saveCriterionRow,
  updateCriterionRow,
} from "../../api/categories"
import {
  deleteSection,
  fetchAllSections,
  saveSection,
  updateSection,
} from "../../api/criteriaApi"
import { getCrudPermissions } from "../../data/permissionLabels"

const PREVIEW_ROWS = 3
const TEAL_BG = "bg-teal-500"

/** @typedef {import("../../api/criteriaApi").SectionRow} DashboardSection */
/** @typedef {import("../../api/categories").CriterionRow} DashboardCriterion */

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

export default function Criteria({ dark, permissions = [], isAdmin = false }) {
  const sectionPerms = useMemo(
    () => getCrudPermissions(permissions, "criteria", isAdmin),
    [permissions, isAdmin]
  )
  const rowPerms = useMemo(
    () => getCrudPermissions(permissions, "category", isAdmin),
    [permissions, isAdmin]
  )
  const canViewPage = sectionPerms.canView || rowPerms.canView

  const [sections, setSections] = useState(/** @type {DashboardSection[]} */ ([]))
  const [criteria, setCriteria] = useState(/** @type {DashboardCriterion[]} */ ([]))
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState("")

  const [openSection, setOpenSection] = useState("")
  const [showAllInSection, setShowAllInSection] = useState(() => ({}))
  const [sectionFilter, setSectionFilter] = useState("all")

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createDraft, setCreateDraft] = useState({
    sectionId: "",
    title: "",
    maxScore: "5",
    fileUpload: true,
  })

  const [sectionModalOpen, setSectionModalOpen] = useState(false)
  const [editingSectionId, setEditingSectionId] = useState(/** @type {string | null} */ (null))
  const [sectionFormDraft, setSectionFormDraft] = useState({
    title: "",
    maxScore: "20",
  })
  const [deleteSectionTarget, setDeleteSectionTarget] = useState(/** @type {DashboardSection | null} */ (null))

  const [notice, setNotice] = useState({
    open: false,
    message: "",
    variant: /** @type {"success" | "danger"} */ ("success"),
  })
  const noticeTimeoutRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null))

  const [openActionsFor, setOpenActionsFor] = useState(/** @type {string | null} */ (null))
  const [actionsMenu, setActionsMenu] = useState(
    /** @type {{ open: boolean, rowId: string | null, position: "bottom" | "top", x: number, y: number }} */ ({
      open: false,
      rowId: null,
      position: "bottom",
      x: 0,
      y: 0,
    }),
  )

  const [criterionModal, setCriterionModal] = useState({
    open: false,
    type: /** @type {null | "view" | "edit" | "delete"} */ (null),
    row: /** @type {DashboardCriterion | null} */ (null),
  })
  const [editCriterionDraft, setEditCriterionDraft] = useState({
    sectionId: "",
    title: "",
    maxScore: "5",
    fileUpload: true,
  })

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    setLoadError("")
    try {
      const sectionList = await fetchAllSections()
      const rowList = await fetchAllCriterionRows(sectionList)
      setSections(sectionList)
      setCriteria(rowList)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ma'lumotlarni yuklab bo'lmadi"
      setLoadError(message)
      if (!silent) {
        setSections([])
        setCriteria([])
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!canViewPage) {
      setLoading(false)
      setSections([])
      setCriteria([])
      setLoadError("")
      return
    }
    loadData()
  }, [canViewPage, loadData])

  const rows = criteria

  const cardBase = dark ? "border-slate-600 bg-slate-800" : "border-slate-200 bg-white shadow-sm"
  const subtitle = dark ? "text-slate-400" : "text-slate-500"
  const meta = dark ? "text-slate-500" : "text-slate-400"
  const titleClr = dark ? "text-slate-100" : "text-slate-900"
  const input = dark
    ? "border-slate-600 bg-slate-900/40 text-slate-100 placeholder:text-slate-600"
    : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
  const selectInput = `${input} ${
    dark ? "[&>option]:bg-slate-800 [&>option]:text-slate-100" : "[&>option]:bg-white [&>option]:text-slate-900"
  }`

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (sectionFilter !== "all" && r.sectionId !== sectionFilter) return false
      return true
    })
  }, [rows, sectionFilter])

  const bySectionId = useMemo(() => {
    const map = {}
    sections.forEach((s) => {
      map[s.id] = filteredRows.filter((r) => r.sectionId === s.id)
    })
    return map
  }, [filteredRows, sections])

  const toggleSection = (sectionId) => {
    setOpenSection((prev) => (prev === sectionId ? "" : sectionId))
  }

  const toggleShowAllRows = (sectionId) => {
    setShowAllInSection((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }))
  }

  const closeCreateModal = () => setCreateModalOpen(false)
  const closeSectionModal = () => {
    setSectionModalOpen(false)
    setEditingSectionId(null)
  }

  const closeActionsMenu = useCallback(() => {
    setOpenActionsFor(null)
    setActionsMenu((p) => ({ ...p, open: false, rowId: null }))
  }, [])

  const openActionsMenuFor = useCallback((rowId, anchorEl) => {
    if (!anchorEl) return
    const rect = anchorEl.getBoundingClientRect()

    const menuHeight = 250
    const gap = 8
    const spaceBelow = window.innerHeight - rect.bottom
    const position = spaceBelow < menuHeight ? "top" : "bottom"
    const x = rect.right
    const y = position === "bottom" ? rect.bottom + gap : rect.top - gap

    setOpenActionsFor(rowId)
    setActionsMenu({ open: true, rowId, position, x, y })
  }, [])

  useEffect(() => {
    if (!actionsMenu.open) return
    const onDown = (e) => {
      if (e.key === "Escape") closeActionsMenu()
    }
    const onPointerDown = (e) => {
      const target = e.target
      if (!(target instanceof Element)) return
      if (target.closest("[data-actions-menu='true']")) return
      if (target.closest("[data-actions-anchor='true']")) return
      closeActionsMenu()
    }
    window.addEventListener("keydown", onDown)
    window.addEventListener("pointerdown", onPointerDown, { capture: true })
    return () => {
      window.removeEventListener("keydown", onDown)
      window.removeEventListener("pointerdown", onPointerDown, { capture: true })
    }
  }, [actionsMenu.open, closeActionsMenu])

  const openCreateCriterion = () => {
    const first = sections[0]?.id ?? ""
    setCreateDraft({
      sectionId: first,
      title: "",
      maxScore: "5",
      fileUpload: true,
    })
    setCreateModalOpen(true)
  }

  const openCreateForSection = (sectionId) => {
    setCreateDraft({
      sectionId,
      title: "",
      maxScore: "5",
      fileUpload: true,
    })
    setCreateModalOpen(true)
  }

  const openCreateSection = () => {
    setEditingSectionId(null)
    setSectionFormDraft({ title: "", maxScore: "20" })
    setSectionModalOpen(true)
  }

  const openEditSection = (sec) => {
    setEditingSectionId(sec.id)
    setSectionFormDraft({
      title: sec.title,
      maxScore: String(sec.maxScore),
    })
    setSectionModalOpen(true)
  }

  const showNotice = (message, variant = "success") => {
    setNotice({ open: true, message, variant })
    if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current)
    noticeTimeoutRef.current = setTimeout(() => {
      setNotice({ open: false, message: "", variant: "success" })
      noticeTimeoutRef.current = null
    }, variant === "danger" ? 3500 : 1300)
  }

  const closeCriterionModal = () =>
    setCriterionModal({ open: false, type: null, row: null })

  const sectionTitleById = (sectionId) => sections.find((s) => s.id === sectionId)?.title ?? "—"

  const openViewCriterion = (row) => {
    setCriterionModal({ open: true, type: "view", row })
  }

  const openEditCriterion = (row) => {
    setEditCriterionDraft({
      sectionId: row.sectionId,
      title: row.title,
      maxScore: String(row.maxScore),
      fileUpload: Boolean(row.fileUpload),
    })
    setCriterionModal({ open: true, type: "edit", row })
  }

  const openDeleteCriterion = (row) => {
    setCriterionModal({ open: true, type: "delete", row })
  }

  const onSaveCriterionEdit = async () => {
    const row = criterionModal.row
    if (!row?.id || busy || !rowPerms.canEdit) return
    const title = editCriterionDraft.title.trim()
    const maxScore = Number(editCriterionDraft.maxScore)
    if (!title || !Number.isFinite(maxScore) || maxScore <= 0) {
      showNotice("Mezon nomi va maks. ballni to'ldiring", "danger")
      return
    }
    if (!sections.some((s) => s.id === editCriterionDraft.sectionId)) {
      showNotice("Avval bo'lim tanlang", "danger")
      return
    }

    setBusy(true)
    try {
      const updated = await updateCriterionRow(row.id, {
        sectionId: editCriterionDraft.sectionId,
        title,
        maxScore: Math.round(maxScore),
        fileUpload: editCriterionDraft.fileUpload,
      })
      setCriteria((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
      closeCriterionModal()
      showNotice("Mezon yangilandi")
      setOpenSection(editCriterionDraft.sectionId)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Saqlab bo'lmadi"
      showNotice(message, "danger")
    } finally {
      setBusy(false)
    }
  }

  const onConfirmCriterionDelete = async () => {
    const row = criterionModal.row
    if (!row?.id || busy || !rowPerms.canDelete) return

    setBusy(true)
    try {
      await deleteCriterionRow(row.id)
      setCriteria((prev) => prev.filter((c) => c.id !== row.id))
      closeCriterionModal()
      showNotice("Mezon o'chirildi")
    } catch (err) {
      const message = err instanceof Error ? err.message : "O'chirib bo'lmadi"
      showNotice(message, "danger")
    } finally {
      setBusy(false)
    }
  }

  const onSaveCriterion = async () => {
    if (busy || !rowPerms.canAdd) return
    const title = createDraft.title.trim()
    const maxScore = Number(createDraft.maxScore)
    if (!title || !Number.isFinite(maxScore) || maxScore <= 0) {
      showNotice("Mezon nomi va maks. ballni to'ldiring", "danger")
      return
    }
    const sectionId = createDraft.sectionId || sections[0]?.id || ""
    if (!sectionId || !sections.some((s) => s.id === sectionId)) {
      showNotice("Avval bo'lim qo'shing", "danger")
      return
    }

    setBusy(true)
    try {
      const created = await saveCriterionRow({
        sectionId,
        title,
        maxScore: Math.round(maxScore),
        fileUpload: createDraft.fileUpload,
      })
      setCriteria((prev) => [...prev.filter((c) => c.id !== created.id), created])

      const needsRefresh = String(created.id).startsWith("tmp-")
      if (needsRefresh) {
        await loadData({ silent: true })
      }

      closeCreateModal()
      showNotice("Mezon qo'shildi")
      setOpenSection(sectionId)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Qo'shib bo'lmadi"
      showNotice(message, "danger")
    } finally {
      setBusy(false)
    }
  }

  const onSaveSection = async () => {
    if (busy) return
    const title = sectionFormDraft.title.trim()
    const maxScore = Number(sectionFormDraft.maxScore)
    if (!title || !Number.isFinite(maxScore) || maxScore <= 0) {
      showNotice("Bo'lim nomi va maks. ballni to'ldiring", "danger")
      return
    }

    setBusy(true)
    try {
      if (editingSectionId) {
        if (!sectionPerms.canEdit) return
        const updated = await updateSection(editingSectionId, {
          title,
          maxScore: Math.round(maxScore),
        })
        setSections((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
        closeSectionModal()
        showNotice("Bo'lim yangilandi")
        return
      }

      if (!sectionPerms.canAdd) return
      const created = await saveSection({ title, maxScore: Math.round(maxScore) })
      setSections((prev) => [...prev.filter((s) => s.id !== created.id), created])
      if (String(created.id).startsWith("tmp-")) {
        await loadData({ silent: true })
      }
      closeSectionModal()
      showNotice("Bo'lim yaratildi")
      setOpenSection(created.id)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Saqlab bo'lmadi"
      showNotice(message, "danger")
    } finally {
      setBusy(false)
    }
  }

  const criteriaCountForSection = (sectionId) => criteria.filter((c) => c.sectionId === sectionId).length

  const confirmDeleteSection = async () => {
    const target = deleteSectionTarget
    if (!target?.id || busy || !sectionPerms.canDelete) return
    const id = target.id

    setBusy(true)
    try {
      await deleteSection(id)
      setSections((prev) => prev.filter((s) => s.id !== id))
      setCriteria((prev) => prev.filter((c) => c.sectionId !== id))
      await loadData({ silent: true })
      setSectionFilter((f) => (f === id ? "all" : f))
      setDeleteSectionTarget(null)
      showNotice("Bo'lim o'chirildi")
    } catch (err) {
      const message = err instanceof Error ? err.message : "O'chirib bo'lmadi"
      showNotice(message, "danger")
    } finally {
      setBusy(false)
    }
  }

  const firstSectionId = sections[0]?.id ?? ""

  if (!canViewPage) {
    return (
      <div className={`rounded-2xl border px-6 py-10 text-center ${dark ? "border-slate-700 bg-slate-800/40 text-slate-300" : "border-slate-200 bg-white text-slate-600"}`}>
        <p className="text-sm">Mezonlar bo'limini ko'rish uchun ruxsat yo'q.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={`flex min-h-[16rem] items-center justify-center rounded-2xl border ${dark ? "border-slate-700 bg-slate-800/40" : "border-slate-200 bg-white"} p-8`}>
        <Loader2 className={`h-8 w-8 animate-spin ${dark ? "text-teal-400" : "text-teal-500"}`} aria-hidden />
        <span className="sr-only">Yuklanmoqda</span>
      </div>
    )
  }

  return (
    <div className={`rounded-2xl border ${dark ? "border-slate-700 bg-slate-800/40" : "border-slate-200 bg-white"} p-5 sm:p-6`}>
      <div className="space-y-6">
        {loadError ? (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              dark ? "border-red-500/40 bg-red-950/30 text-red-200" : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            <p>{loadError}</p>
            <button
              type="button"
              onClick={() => loadData()}
              className={`mt-2 font-semibold underline ${dark ? "text-red-100" : "text-red-700"}`}
            >
              Qayta yuklash
            </button>
          </div>
        ) : null}

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className={`text-xl font-bold tracking-tight ${titleClr}`}>Mezonlar</h2>
            <p className={`mt-1 max-w-2xl text-sm leading-relaxed ${subtitle}`}>
              Avval <span className={`font-semibold ${titleClr}`}>Bo'lim qo'shish</span> bilan yangi bo'lim yarating, keyin uning ichiga{" "}
              <span className={`font-semibold ${titleClr}`}>Mezon qo'shish</span> yoki bo'lim ochilganda{" "}
              <span className={`font-semibold ${titleClr}`}>Bu bo'limga mezon qo'shish</span> orqali qator qo'shing.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {sectionPerms.canAdd ? (
              <button
                type="button"
                onClick={openCreateSection}
                className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ${
                  dark ? "border-emerald-500 text-emerald-300 hover:bg-slate-700/70" : "border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                }`}
              >
                <FolderPlus className="h-4 w-4 shrink-0 stroke-[2.5]" aria-hidden />
                Bo'lim qo'shish
              </button>
            ) : null}
            {rowPerms.canAdd ? (
            <button
              type="button"
              onClick={openCreateCriterion}
              disabled={sections.length === 0}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-600 disabled:pointer-events-none disabled:opacity-50 ${TEAL_BG}`}
            >
              <Plus className="h-4 w-4 shrink-0 stroke-[2.5]" aria-hidden />
              Mezon qo'shish
            </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className={`w-full min-w-[11rem] rounded-lg border px-3 py-2.5 text-sm outline-none ring-teal-500/0 transition-shadow focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 sm:w-auto ${selectInput}`}
          >
            <option value="all">Barcha bo'limlar</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          {sections.map((sec, idx) => {
            const sectionRows = bySectionId[sec.id] ?? []
            const catMax = sec.maxScore
            const isOpen = openSection === sec.id
            const showAll = showAllInSection[sec.id]
            const visibleRows =
              sectionRows.length > PREVIEW_ROWS && !showAll ? sectionRows.slice(0, PREVIEW_ROWS) : sectionRows
            const sectionNum = idx + 1

            return (
              <div key={sec.id} className={`overflow-hidden rounded-xl border ${cardBase}`}>
                <div
                  className={`flex w-full items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4 sm:py-4 ${
                    dark ? "hover:bg-slate-700/20" : "hover:bg-slate-50/80"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleSection(sec.id)}
                    className={`flex min-w-0 flex-1 items-start gap-2 text-left sm:gap-3 ${
                      dark ? "hover:bg-transparent" : "hover:bg-transparent"
                    }`}
                  >
                    <div className={`mt-0.5 shrink-0 ${subtitle}`}>
                      {isOpen ? <ChevronUp className="h-5 w-5" strokeWidth={2} aria-hidden /> : <ChevronDown className="h-5 w-5" strokeWidth={2} aria-hidden />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`font-bold ${titleClr}`}>
                        {sectionNum}. {sec.title}
                      </p>
                    </div>
                  </button>
                  <div className="shrink-0 self-center text-right">
                    <p className={`text-sm font-bold tabular-nums leading-none ${titleClr}`}>
                      Maks.Ball: {catMax}
                    </p>
                  </div>
                  {(sectionPerms.canEdit || sectionPerms.canDelete) ? (
                  <div className="flex shrink-0 items-center gap-1">
                    {sectionPerms.canEdit ? (
                    <button
                      type="button"
                      title="Bo'limni tahrirlash"
                      onClick={(e) => {
                        e.stopPropagation()
                        openEditSection(sec)
                      }}
                      className={`rounded-lg border p-2 transition-colors ${
                        dark ? "border-slate-600 text-slate-200 hover:bg-slate-700/70" : "border-slate-300 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <Pencil className="h-4 w-4" strokeWidth={2} aria-hidden />
                    </button>
                    ) : null}
                    {sectionPerms.canDelete ? (
                    <button
                      type="button"
                      title="Bo'limni o'chirish"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteSectionTarget(sec)
                      }}
                      className={`rounded-lg border p-2 transition-colors ${
                        dark ? "border-red-500/50 text-red-300 hover:bg-red-950/40" : "border-red-200 text-red-700 hover:bg-red-50"
                      }`}
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={2} aria-hidden />
                    </button>
                    ) : null}
                  </div>
                  ) : null}
                </div>

                {isOpen && (
                  <div className={`border-t ${dark ? "border-slate-600" : "border-slate-200"}`}>
                    <div
                      className={`flex flex-wrap items-center justify-end gap-2 border-b px-4 py-2.5 ${
                        dark ? "border-slate-600 bg-slate-900/25" : "border-slate-200 bg-slate-50/90"
                      }`}
                    >
                      {rowPerms.canAdd ? (
                      <button
                        type="button"
                        onClick={() => openCreateForSection(sec.id)}
                        className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                          dark ? "bg-teal-600 text-white hover:bg-teal-500" : "bg-teal-600 text-white hover:bg-teal-700"
                        }`}
                      >
                        <Plus className="h-4 w-4 shrink-0 stroke-[2.5]" aria-hidden />
                        Bu bo'limga mezon qo'shish
                      </button>
                      ) : null}
                    </div>

                    {sectionRows.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className={`min-w-[520px] w-full border-collapse text-sm ${dark ? "border-slate-700" : "border-slate-200"}`}>
                          <thead className={dark ? "bg-slate-900/40" : "bg-slate-50"}>
                            <tr>
                              <th className={`border px-3 py-3 text-left font-bold ${dark ? "border-slate-600" : "border-slate-200"} ${titleClr}`}>№</th>
                              <th className={`border px-3 py-3 text-left font-bold ${dark ? "border-slate-600" : "border-slate-200"} ${titleClr}`}>Mezon nomi</th>
                              <th className={`border px-3 py-3 text-center font-bold ${dark ? "border-slate-600" : "border-slate-200"} ${titleClr}`}>Maks. ball</th>
                              <th className={`border px-3 py-3 text-center font-bold ${dark ? "border-slate-600" : "border-slate-200"} ${titleClr}`}>Amallar</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleRows.map((row) => {
                              const fullIdx = sectionRows.indexOf(row)
                              const numLabel = `${sectionNum}.${fullIdx + 1}`
                              return (
                                <tr key={row.id}>
                                  <td className={`border px-3 py-3 font-semibold tabular-nums ${dark ? "border-slate-600" : "border-slate-200"} ${titleClr}`}>{numLabel}</td>
                                  <td className={`border px-3 py-3 ${dark ? "border-slate-600" : "border-slate-200"} ${subtitle}`}>
                                    <span className={`font-medium ${titleClr}`}>{row.title}</span>
                                  </td>
                                  <td className={`border px-3 py-3 text-center font-semibold tabular-nums ${dark ? "border-slate-600" : "border-slate-200"} ${titleClr}`}>
                                    {row.maxScore}
                                  </td>
                                  <td className={`border px-3 py-3 text-center align-middle ${dark ? "border-slate-600" : "border-slate-200"}`}>
                                    <div className="inline-flex">
                                      <button
                                        type="button"
                                        data-actions-anchor="true"
                                        onClick={(e) => {
                                          if (openActionsFor === row.id) {
                                            closeActionsMenu()
                                            return
                                          }
                                          openActionsMenuFor(row.id, e.currentTarget)
                                        }}
                                        className={`inline-flex items-center justify-center rounded-lg border p-2.5 transition-colors ${
                                          dark ? "border-slate-600 text-slate-200 hover:bg-slate-700/70" : "border-slate-300 text-slate-700 hover:bg-slate-100"
                                        }`}
                                        aria-label="Amallar menyusi"
                                        aria-expanded={openActionsFor === row.id}
                                      >
                                        <SlidersHorizontal className="h-5 w-5" strokeWidth={1.9} aria-hidden />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className={`px-4 py-8 text-center text-sm ${subtitle}`}>
                        Bu bo'limda mezon topilmadi. Yangi qator qo'shish uchun yuqoridagi tugmadan foydalaning.
                      </div>
                    )}

                    {sectionRows.length > PREVIEW_ROWS && (
                      <div className={`flex justify-center border-t px-4 py-3 ${dark ? "border-slate-600 bg-slate-900/30" : "border-slate-200 bg-slate-50/80"}`}>
                        <button
                          type="button"
                          onClick={() => toggleShowAllRows(sec.id)}
                          className={`inline-flex items-center gap-2 text-sm font-semibold transition-colors ${
                            dark ? "text-teal-300 hover:text-teal-200" : "text-teal-700 hover:text-teal-800"
                          }`}
                        >
                          {showAll ? (
                            <>
                              Kamroq ko'rsatish
                              <ChevronUp className="h-4 w-4" aria-hidden />
                            </>
                          ) : (
                            <>
                              Barcha mezonlarni ko'rish ({sectionRows.length})
                              <ChevronDown className="h-4 w-4" aria-hidden />
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {sections.length === 0 && (
          <p className={`text-center text-sm ${subtitle}`}>Hozircha bo'lim yo'q. «Bo'lim qo'shish» dan boshlang.</p>
        )}
      </div>

      <Modal open={createModalOpen} onClose={closeCreateModal} dark={dark}>
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-2xl font-bold tracking-tight">Mezon qo'shish</h3>
            <button
              type="button"
              onClick={closeCreateModal}
              aria-label="Yopish"
              className={`-mt-2 rounded-lg p-2 transition-colors ${dark ? "hover:bg-slate-700/70" : "hover:bg-slate-100"}`}
            >
              <CircleX className={`h-7 w-7 ${dark ? "text-white" : "text-slate-900"}`} strokeWidth={2.25} aria-hidden />
            </button>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-base font-semibold">Bo'lim</label>
              <select
                value={createDraft.sectionId || firstSectionId}
                onChange={(e) => setCreateDraft((p) => ({ ...p, sectionId: e.target.value }))}
                className={`w-full rounded-lg border px-4 py-3 text-base outline-none ring-teal-500/0 transition-shadow focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${selectInput}`}
              >
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-base font-semibold">Mezon nomi</label>
              <input
                value={createDraft.title}
                onChange={(e) => setCreateDraft((p) => ({ ...p, title: e.target.value }))}
                className={`w-full rounded-lg border px-4 py-3 text-base outline-none ring-teal-500/0 transition-shadow focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${input}`}
                placeholder="Masalan: ochiq darslar hisoboti"
              />
            </div>
            <div className="space-y-2">
              <label className="text-base font-semibold">Maks. ball</label>
              <input
                type="number"
                min={1}
                value={createDraft.maxScore}
                onChange={(e) => setCreateDraft((p) => ({ ...p, maxScore: e.target.value }))}
                className={`w-full rounded-lg border px-4 py-3 text-base outline-none ring-teal-500/0 transition-shadow focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${input}`}
              />
            </div>
            <div className="space-y-2">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={createDraft.fileUpload}
                  onChange={(e) => setCreateDraft((p) => ({ ...p, fileUpload: e.target.checked }))}
                  className="h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-base font-semibold">Hujjat yuklash talab qilinadi</span>
              </label>
              <p className={`text-sm ${subtitle}`}>
                Yoqilsa, tyutor ushbu mezon uchun fayl yuklash imkoniyatiga ega bo'ladi.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onSaveCriterion}
              disabled={busy || sections.length === 0 || !rowPerms.canAdd}
              className="inline-flex min-w-[11rem] items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-base font-bold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : null}
              Saqlash
            </button>
            <button
              type="button"
              onClick={closeCreateModal}
              className={`inline-flex min-w-[11rem] items-center justify-center rounded-full border px-6 py-3 text-base font-bold transition-colors ${
                dark ? "border-slate-600 text-slate-200 hover:bg-slate-700/70" : "border-slate-200 text-slate-800 hover:bg-slate-50"
              }`}
            >
              Bekor qilish
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={sectionModalOpen} onClose={closeSectionModal} dark={dark}>
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-2xl font-bold tracking-tight">
              {editingSectionId ? "Bo'limni tahrirlash" : "Bo'lim yaratish"}
            </h3>
            <button
              type="button"
              onClick={closeSectionModal}
              aria-label="Yopish"
              className={`-mt-2 rounded-lg p-2 transition-colors ${dark ? "hover:bg-slate-700/70" : "hover:bg-slate-100"}`}
            >
              <CircleX className={`h-7 w-7 ${dark ? "text-white" : "text-slate-900"}`} strokeWidth={2.25} aria-hidden />
            </button>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-base font-semibold">Bo'lim nomi</label>
              <input
                value={sectionFormDraft.title}
                onChange={(e) => setSectionFormDraft((p) => ({ ...p, title: e.target.value }))}
                className={`w-full rounded-lg border px-4 py-3 text-base outline-none ring-teal-500/0 transition-shadow focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${input}`}
                placeholder="Masalan: Innovatsion faoliyat"
              />
            </div>
            <div className="space-y-2">
              <label className="text-base font-semibold">Bo'lim uchun jami maks. ball</label>
              <input
                type="number"
                min={1}
                value={sectionFormDraft.maxScore}
                onChange={(e) => setSectionFormDraft((p) => ({ ...p, maxScore: e.target.value }))}
                className={`w-full rounded-lg border px-4 py-3 text-base outline-none ring-teal-500/0 transition-shadow focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${input}`}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onSaveSection}
              disabled={busy}
              className="inline-flex min-w-[11rem] items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-base font-bold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : null}
              {editingSectionId ? "Saqlash" : "Yaratish"}
            </button>
            <button
              type="button"
              onClick={closeSectionModal}
              className={`inline-flex min-w-[11rem] items-center justify-center rounded-full border px-6 py-3 text-base font-bold transition-colors ${
                dark ? "border-slate-600 text-slate-200 hover:bg-slate-700/70" : "border-slate-200 text-slate-800 hover:bg-slate-50"
              }`}
            >
              Bekor qilish
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteSectionTarget} onClose={() => setDeleteSectionTarget(null)} dark={dark}>
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-2xl font-bold tracking-tight">Bo'limni o'chirish</h3>
            <button
              type="button"
              onClick={() => setDeleteSectionTarget(null)}
              aria-label="Yopish"
              className={`-mt-2 rounded-lg p-2 transition-colors ${dark ? "hover:bg-slate-700/70" : "hover:bg-slate-100"}`}
            >
              <CircleX className={`h-7 w-7 ${dark ? "text-white" : "text-slate-900"}`} strokeWidth={2.25} aria-hidden />
            </button>
          </div>
          <p className={`text-base leading-relaxed ${subtitle}`}>
            <span className={`font-semibold ${titleClr}`}>{deleteSectionTarget?.title}</span> bo'limini o'chirishni tasdiqlaysizmi? Bu bo'limga
            tegishli barcha mezonlar ham ro'yxatdan olib tashlanadi (
            {deleteSectionTarget ? criteriaCountForSection(deleteSectionTarget.id) : 0} ta).
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={confirmDeleteSection}
              disabled={busy}
              className="inline-flex min-w-[11rem] items-center justify-center gap-2 rounded-full bg-red-600 px-6 py-3 text-base font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : null}
              O'chirish
            </button>
            <button
              type="button"
              onClick={() => setDeleteSectionTarget(null)}
              className={`inline-flex min-w-[11rem] items-center justify-center rounded-full border px-6 py-3 text-base font-bold transition-colors ${
                dark ? "border-slate-600 text-slate-200 hover:bg-slate-700/70" : "border-slate-200 text-slate-800 hover:bg-slate-50"
              }`}
            >
              Bekor qilish
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={criterionModal.open} onClose={closeCriterionModal} dark={dark}>
        {criterionModal.type === "view" && criterionModal.row && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-2xl font-bold tracking-tight">Mezon ma'lumotlari</h3>
              <button
                type="button"
                onClick={closeCriterionModal}
                aria-label="Yopish"
                className={`-mt-2 rounded-lg p-2 transition-colors ${dark ? "hover:bg-slate-700/70" : "hover:bg-slate-100"}`}
              >
                <CircleX className={`h-7 w-7 ${dark ? "text-white" : "text-slate-900"}`} strokeWidth={2.25} aria-hidden />
              </button>
            </div>
            <div className="space-y-3 text-base">
              <div>
                <p className={`text-xs font-semibold ${meta}`}>Bo'lim:</p>
                <p className="mt-1 font-semibold">{sectionTitleById(criterionModal.row.sectionId)}</p>
              </div>
              <div>
                <p className={`text-xs font-semibold ${meta}`}>Mezon nomi:</p>
                <p className="mt-1 font-semibold">{criterionModal.row.title}</p>
              </div>
              <div>
                <p className={`text-xs font-semibold ${meta}`}>Maks. ball:</p>
                <p className="mt-1 font-semibold tabular-nums">{criterionModal.row.maxScore}</p>
              </div>
              <div>
                <p className={`text-xs font-semibold ${meta}`}>Hujjat yuklash:</p>
                <p className="mt-1 font-semibold">{criterionModal.row.fileUpload ? "Talab qilinadi" : "Talab qilinmaydi"}</p>
              </div>
            </div>
          </div>
        )}

        {criterionModal.type === "edit" && criterionModal.row && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-2xl font-bold tracking-tight">Mezonni tahrirlash</h3>
              <button
                type="button"
                onClick={closeCriterionModal}
                aria-label="Yopish"
                className={`-mt-2 rounded-lg p-2 transition-colors ${dark ? "hover:bg-slate-700/70" : "hover:bg-slate-100"}`}
              >
                <CircleX className={`h-7 w-7 ${dark ? "text-white" : "text-slate-900"}`} strokeWidth={2.25} aria-hidden />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-base font-semibold">Bo'lim</label>
                <select
                  value={editCriterionDraft.sectionId || firstSectionId}
                  onChange={(e) => setEditCriterionDraft((p) => ({ ...p, sectionId: e.target.value }))}
                  className={`w-full rounded-lg border px-4 py-3 text-base outline-none ring-teal-500/0 transition-shadow focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${selectInput}`}
                >
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-base font-semibold">Mezon nomi</label>
                <input
                  value={editCriterionDraft.title}
                  onChange={(e) => setEditCriterionDraft((p) => ({ ...p, title: e.target.value }))}
                  className={`w-full rounded-lg border px-4 py-3 text-base outline-none ring-teal-500/0 transition-shadow focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${input}`}
                  placeholder="Masalan: ochiq darslar hisoboti"
                />
              </div>
              <div className="space-y-2">
                <label className="text-base font-semibold">Maks. ball</label>
                <input
                  type="number"
                  min={1}
                  value={editCriterionDraft.maxScore}
                  onChange={(e) => setEditCriterionDraft((p) => ({ ...p, maxScore: e.target.value }))}
                  className={`w-full rounded-lg border px-4 py-3 text-base outline-none ring-teal-500/0 transition-shadow focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${input}`}
                />
              </div>
              <div className="space-y-2">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={editCriterionDraft.fileUpload}
                    onChange={(e) => setEditCriterionDraft((p) => ({ ...p, fileUpload: e.target.checked }))}
                    className="h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-base font-semibold">Hujjat yuklash talab qilinadi</span>
                </label>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onSaveCriterionEdit}
                disabled={busy}
                className="inline-flex min-w-[11rem] items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-base font-bold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : null}
                Saqlash
              </button>
              <button
                type="button"
                onClick={closeCriterionModal}
                className={`inline-flex min-w-[11rem] items-center justify-center rounded-full border px-6 py-3 text-base font-bold transition-colors ${
                  dark ? "border-slate-600 text-slate-200 hover:bg-slate-700/70" : "border-slate-200 text-slate-800 hover:bg-slate-50"
                }`}
              >
                Bekor qilish
              </button>
            </div>
          </div>
        )}

        {criterionModal.type === "delete" && criterionModal.row && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-2xl font-bold tracking-tight">Mezonni o'chirishni tasdiqlaysizmi?</h3>
              <button
                type="button"
                onClick={closeCriterionModal}
                aria-label="Yopish"
                className={`-mt-2 rounded-lg p-2 transition-colors ${dark ? "hover:bg-slate-700/70" : "hover:bg-slate-100"}`}
              >
                <CircleX className={`h-7 w-7 ${dark ? "text-white" : "text-slate-900"}`} strokeWidth={2.25} aria-hidden />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={onConfirmCriterionDelete}
                disabled={busy}
                className="inline-flex min-w-[11rem] items-center justify-center gap-2 rounded-2xl bg-red-500 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : null}
                Ha
              </button>
              <button
                type="button"
                onClick={closeCriterionModal}
                className="inline-flex min-w-[11rem] items-center justify-center rounded-2xl bg-blue-500 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-600"
              >
                Yo'q
              </button>
            </div>
          </div>
        )}
      </Modal>

      {actionsMenu.open && actionsMenu.rowId && typeof document !== "undefined"
        ? createPortal(
            <div
              data-actions-menu="true"
              className={`fixed z-[80] min-w-52 rounded-xl border p-1 shadow-xl ${
                dark ? "border-slate-600 bg-slate-800" : "border-slate-200 bg-white"
              }`}
              style={{
                left: actionsMenu.x,
                top: actionsMenu.y,
                transform:
                  actionsMenu.position === "bottom"
                    ? "translateX(-100%)"
                    : "translate(-100%, -100%)",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  closeActionsMenu()
                  const target = criteria.find((r) => r.id === actionsMenu.rowId)
                  if (target) openViewCriterion(target)
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                  dark ? "text-blue-400 hover:bg-slate-700/80" : "text-blue-700 hover:bg-blue-50"
                }`}
              >
                <Eye className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                Ko'rish
              </button>
              {rowPerms.canEdit ? (
                <button
                  type="button"
                  onClick={() => {
                    closeActionsMenu()
                    const target = criteria.find((r) => r.id === actionsMenu.rowId)
                    if (target) openEditCriterion(target)
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                    dark ? "text-emerald-400 hover:bg-slate-700/80" : "text-emerald-700 hover:bg-emerald-50"
                  }`}
                >
                  <Pencil className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                  Tahrirlash
                </button>
              ) : null}
              {rowPerms.canDelete ? (
                <button
                  type="button"
                  onClick={() => {
                    closeActionsMenu()
                    const target = criteria.find((r) => r.id === actionsMenu.rowId)
                    if (target) openDeleteCriterion(target)
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                    dark ? "text-red-400 hover:bg-slate-700/80" : "text-red-700 hover:bg-red-50"
                  }`}
                >
                  <Trash2 className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                  O'chirish
                </button>
              ) : null}
            </div>,
            document.body,
          )
        : null}

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
              {notice.variant === "danger" ? (
                <CircleX className="h-6 w-6 shrink-0 text-white" strokeWidth={2.25} aria-hidden />
              ) : (
                <CircleCheck className="h-6 w-6 shrink-0 text-white" strokeWidth={2.25} aria-hidden />
              )}
              <p className="truncate text-sm font-semibold">{notice.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setNotice({ open: false, message: "", variant: "success" })}
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
