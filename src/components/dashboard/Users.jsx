import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { CircleCheck, CircleX, Eye, EyeOff, LockKeyhole, Loader2, Pencil, Plus, ShieldCheck, SlidersHorizontal, Trash2 } from "lucide-react"
import { getAuthUsername } from "../../api/auth"
import {
  checkUsernameAvailable,
  deleteUser,
  fetchAllUsers,
  fetchPermissionsCatalog,
  fetchUserByUsername,
  removeUserPermissions,
  saveUser,
  setUserPermissions,
  updateUser,
} from "../../api/users"
import {
  getCrudPermissions,
  getImpliedPermissionsWhenGranting,
  getMissingViewPermissionOptionIds,
  hasEffectivePermission,
  mergePermissionOptionsFromCatalog,
  normalizePermissionKey,
  PERMISSION_OPTIONS_UZ,
  resolvePermissionOptionId,
} from "../../data/permissionLabels"

const TEAL_BG = "bg-teal-500"
const ROLES = ["Admin", "Foydalanuvchi", "Komissiya"]
const EDITABLE_PERMISSION_ROLES = new Set(["Foydalanuvchi", "Komissiya"])

/** @param {{ role?: string, login?: string } | null | undefined} row */
function isEditablePermissionTarget(row) {
  return EDITABLE_PERMISSION_ROLES.has(String(row?.role ?? ""))
}

/** @param {{ login?: string } | null | undefined} row */
function isCurrentUserRow(row) {
  const current = getAuthUsername().trim().toLowerCase()
  const target = String(row?.login ?? "").trim().toLowerCase()
  return Boolean(current && target && current === target)
}

/** @param {{ id: string, label: string }[]} options */
function allPermissionsDraft(options) {
  return Object.fromEntries(options.map((o) => [o.id, true]))
}

/**
 * @param {string[] | undefined} permissions
 * @param {{ id: string, label: string }[]} options
 */
function permissionsToDraft(permissions, options) {
  /** @type {Record<string, boolean>} */
  const draft = {}
  const set = new Set((permissions ?? []).map((p) => normalizePermissionKey(p)))
  for (const opt of options) {
    draft[opt.id] = set.has(normalizePermissionKey(opt.id))
  }
  for (const opt of options) {
    const key = normalizePermissionKey(opt.id)
    if (!key.endsWith("_view") || draft[opt.id]) continue
    const entity = key.slice(0, -"_view".length)
    const hasWrite = [...set].some((p) => {
      const parts = p.split("_")
      const action = parts[parts.length - 1]
      return parts.slice(0, -1).join("_") === entity && action !== "view"
    })
    if (hasWrite) draft[opt.id] = true
  }
  return draft
}

function PermissionToggle({ label, checked, onChange, dark, disabled = false, saving = false }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className={`text-base font-medium ${dark ? "text-slate-100" : "text-slate-800"}`}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled || saving}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border p-0.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 disabled:cursor-not-allowed disabled:opacity-50 ${
          checked
            ? dark
              ? "border-teal-600/40 bg-teal-950/50"
              : "border-teal-200/80 bg-teal-50/80"
            : dark
              ? "border-slate-600 bg-slate-700/80"
              : "border-slate-200/90 bg-[#eef1f5]"
        }`}
      >
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${
            checked ? "translate-x-6" : "translate-x-0"
          }`}
        >
          {saving ? (
            <Loader2 className={`h-4 w-4 animate-spin ${dark ? "text-teal-400" : "text-teal-500"}`} aria-hidden />
          ) : checked ? (
            <CircleCheck className={`h-4 w-4 ${dark ? "text-teal-400" : "text-teal-500"}`} strokeWidth={2} aria-hidden />
          ) : (
            <CircleX className={`h-4 w-4 ${dark ? "text-red-400" : "text-red-500"}`} strokeWidth={2} aria-hidden />
          )}
        </span>
      </button>
    </div>
  )
}

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

export default function Users({ dark, permissions = [], isAdmin = false }) {
  const permSet = useMemo(
    () => new Set(permissions.map((p) => String(p).trim().toLowerCase())),
    [permissions]
  )
  const { canView, canAdd, canEdit, canDelete } = useMemo(
    () => getCrudPermissions(permissions, "user", isAdmin),
    [permissions, isAdmin]
  )
  const canPassword = canEdit
  const canPermissions =
    isAdmin || permSet.has("permission_edit") || hasEffectivePermission(permissions, "permission_view")

  const canOpenPermissionsFor = useCallback(
    (row) => {
      if (isCurrentUserRow(row)) return false
      if (!canPermissions && !isAdmin) return false
      if (isAdmin) return true
      return isEditablePermissionTarget(row)
    },
    [canPermissions, isAdmin]
  )

  const canTogglePermissionsFor = useCallback(
    (row) => {
      if (isCurrentUserRow(row)) return false
      if (!isEditablePermissionTarget(row)) return false
      return isAdmin || canPermissions
    },
    [canPermissions, isAdmin]
  )
  const [rows, setRows] = useState([])
  const [permissionOptions, setPermissionOptions] = useState(PERMISSION_OPTIONS_UZ)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState("")
  const [modal, setModal] = useState({
    open: false,
    type: /** @type {null | "view" | "edit" | "credentials" | "delete" | "create" | "permissions"} */ (null),
    row: null,
  })
  const [editDraft, setEditDraft] = useState({
    role: ROLES[0],
    fio: "",
    izoh: "",
    login: "",
    password: "",
  })
  const [createDraft, setCreateDraft] = useState({
    role: ROLES[0],
    fio: "",
    izoh: "",
    login: "",
    password: "",
  })
  const [credentialsDraft, setCredentialsDraft] = useState({
    password: "",
  })
  const [showCredentialsPassword, setShowCredentialsPassword] = useState(false)
  const [showCreatePassword, setShowCreatePassword] = useState(false)
  const [permissionsDraft, setPermissionsDraft] = useState(/** @type {Record<string, boolean>} */ ({}))
  const [permissionSavingId, setPermissionSavingId] = useState(/** @type {string | null} */ (null))
  const [searchDraft, setSearchDraft] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
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
  const [notice, setNotice] = useState({ open: false, message: "", variant: /** @type {"success" | "danger"} */ ("success") })
  const noticeTimeoutRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null))

  const loadData = useCallback(async () => {
    setLoading(true)
    setLoadError("")
    try {
      const [list, catalog] = await Promise.all([
        fetchAllUsers(),
        fetchPermissionsCatalog().catch(() => []),
      ])
      setPermissionOptions(mergePermissionOptionsFromCatalog(catalog))
      setRows(list.filter((u) => u.role !== "O'qituvchi" && u.role !== "Tyutor").map((u) => ({ ...u, password: "" })))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Foydalanuvchilarni yuklab bo'lmadi"
      setLoadError(message)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!canView) {
      setLoading(false)
      setRows([])
      setLoadError("")
      return
    }
    loadData()
  }, [canView, loadData])

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

  const closeModal = () => {
    setShowCredentialsPassword(false)
    setShowCreatePassword(false)
    setModal({ open: false, type: null, row: null })
  }

  const closeActionsMenu = useCallback(() => {
    setOpenActionsFor(null)
    setActionsMenu((p) => ({ ...p, open: false, rowId: null }))
  }, [])

  const openActionsMenuFor = useCallback((rowId, anchorEl) => {
    if (!anchorEl) return
    const rect = anchorEl.getBoundingClientRect()

    // Pastga joy yetmasa tepaga ochiladi.
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
      // Menyu portalda bo'lgani uchun tashqariga bosilsa yopamiz.
      // (Menyu ichida bosilsa, handlerlar closeActionsMenu chaqiradi.)
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
  const closeNotice = () => setNotice({ open: false, message: "", variant: "success" })

  const showNotice = (message, variant = "success") => {
    setNotice({ open: true, message, variant })
    if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current)
    noticeTimeoutRef.current = setTimeout(() => {
      setNotice({ open: false, message: "", variant: "success" })
      noticeTimeoutRef.current = null
    }, 1300)
  }

  const openView = async (row) => {
    setModal({ open: true, type: "view", row })
    if (!row?.login) return

    setBusy(true)
    try {
      const fresh = await fetchUserByUsername(row.login)
      setModal({ open: true, type: "view", row: { ...fresh, password: "" } })
    } catch {
      showNotice("Ma'lumotlarni yuklab bo'lmadi", "danger")
    } finally {
      setBusy(false)
    }
  }

  const openEdit = (row) => {
    setEditDraft({
      role: row?.role ?? ROLES[0],
      fio: row?.fio ?? "",
      izoh: row?.izoh ?? "",
      login: row?.login ?? "",
      password: row?.password ?? "",
    })
    setModal({ open: true, type: "edit", row })
  }

  const openDelete = (row) => setModal({ open: true, type: "delete", row })

  const openCredentials = (row) => {
    setCredentialsDraft({
      password: row?.password ?? "",
    })
    setModal({ open: true, type: "credentials", row })
  }

  const openPermissions = async (row) => {
    if (!canOpenPermissionsFor(row)) return

    let permissions = row?.permissions
    if (row?.login && canTogglePermissionsFor(row)) {
      const missingViewIds = getMissingViewPermissionOptionIds(permissions, permissionOptions)
      if (missingViewIds.length) {
        try {
          await setUserPermissions(row.login, { ids: missingViewIds, codes: missingViewIds })
          const merged = new Set((permissions ?? []).map((p) => normalizePermissionKey(p)))
          for (const id of missingViewIds) merged.add(normalizePermissionKey(id))
          permissions = [...merged]
          setRows((prev) =>
            prev.map((r) => (r.login === row.login ? { ...r, permissions } : r))
          )
        } catch {
          /* ko'rish ruxsatini keyinroq qo'lda berish mumkin */
        }
      }
    }

    const draft =
      row?.role === "Admin"
        ? allPermissionsDraft(permissionOptions)
        : permissionsToDraft(permissions, permissionOptions)
    setPermissionsDraft(draft)
    setPermissionSavingId(null)
    setModal({ open: true, type: "permissions", row: { ...row, permissions } })
  }

  const updateRowPermissions = useCallback((login, code, enabled) => {
    const key = normalizePermissionKey(code)
    const patch = (perms) => {
      const set = new Set((perms ?? []).map((p) => normalizePermissionKey(p)))
      if (enabled) set.add(key)
      else set.delete(key)
      return [...set]
    }
    setRows((prev) => prev.map((r) => (r.login === login ? { ...r, permissions: patch(r.permissions) } : r)))
    setModal((m) =>
      m.row?.login === login ? { ...m, row: { ...m.row, permissions: patch(m.row.permissions) } } : m
    )
  }, [])

  const onPermissionToggle = async (optId, next) => {
    const row = modal.row
    if (!row?.login || !canTogglePermissionsFor(row) || permissionSavingId) return

    const impliedKeys = next
      ? getImpliedPermissionsWhenGranting(optId).map((k) => resolvePermissionOptionId(k, permissionOptions))
      : [optId]
    const uniqueIds = [...new Set(impliedKeys)]

    const prevDraft = { ...permissionsDraft }
    setPermissionsDraft((prev) => {
      const nextDraft = { ...prev }
      for (const id of uniqueIds) nextDraft[id] = next
      return nextDraft
    })
    setPermissionSavingId(optId)

    try {
      const payload = { ids: uniqueIds, codes: uniqueIds }
      if (next) {
        await setUserPermissions(row.login, payload)
        showNotice(uniqueIds.length > 1 ? "Ruxsatlar berildi" : "Ruxsat berildi")
      } else {
        await removeUserPermissions(row.login, payload)
        showNotice("Ruxsat olib tashlandi")
      }
      for (const id of uniqueIds) updateRowPermissions(row.login, id, next)
    } catch (err) {
      setPermissionsDraft(prevDraft)
      const message = err instanceof Error ? err.message : "Ruxsatni saqlab bo'lmadi"
      showNotice(message, "danger")
    } finally {
      setPermissionSavingId(null)
    }
  }

  const openCreate = () => {
    setCreateDraft({
      role: ROLES[0],
      fio: "",
      izoh: "",
      login: "",
      password: "",
    })
    setModal({ open: true, type: "create", row: null })
  }

  const onSaveEdit = async () => {
    const row = modal.row
    if (!row?.login || busy) return

    const fio = editDraft.fio.trim()
    if (!fio) return

    setBusy(true)
    try {
      await updateUser(row.login, {
        fio,
        izoh: editDraft.izoh.trim(),
        role: editDraft.role,
      })
      setRows((prev) =>
        prev.map((r) =>
          r.login === row.login ? { ...r, role: editDraft.role, fio, izoh: editDraft.izoh.trim() } : r
        )
      )
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
    if (!row?.login || busy) return

    setBusy(true)
    try {
      await deleteUser(row.login)
      setRows((prev) => prev.filter((r) => r.login !== row.login))
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
    if (!row?.login || busy) return

    const password = credentialsDraft.password.trim()
    if (!password) return

    setBusy(true)
    try {
      await updateUser(row.login, {
        fio: row.fio,
        izoh: row.izoh ?? "",
        role: row.role,
        password,
      })
      setRows((prev) => prev.map((r) => (r.login === row.login ? { ...r, password: "" } : r)))
      closeModal()
      showNotice("Muvaffaqiyatli o'zgartirildi")
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
    if (!fio || !login || !password) return

    setBusy(true)
    try {
      const free = await checkUsernameAvailable(login)
      if (!free) {
        showNotice("Bu login band", "danger")
        return
      }
      await saveUser({
        fio,
        login,
        password,
        izoh: createDraft.izoh.trim(),
        role: createDraft.role,
      })
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

  const roleOptions = Array.from(new Set([...ROLES, ...rows.map((row) => row.role)]))

  const filteredRows = rows.filter((row) => {
    if (roleFilter !== "all" && row.role !== roleFilter) return false

    const q = searchQuery.trim().toLowerCase()
    if (!q) return true
    return [row.role, row.fio, row.izoh, row.login].some((value) => String(value ?? "").toLowerCase().includes(q))
  })

  if (!canView) {
    return (
      <div className={`rounded-2xl border ${dark ? "border-slate-700 bg-slate-800/40" : "border-slate-200 bg-white"} p-8 text-center`}>
        <p className={`text-lg font-semibold ${dark ? "text-slate-100" : "text-slate-900"}`}>Ruxsat yo'q</p>
        <p className={`mt-2 text-sm ${dark ? "text-slate-400" : "text-slate-500"}`}>Foydalanuvchilarni ko'rish uchun ruxsat berilmagan.</p>
      </div>
    )
  }

  return (
    <div className={`rounded-2xl border ${dark ? "border-slate-700 bg-slate-800/40" : "border-slate-200 bg-white"} p-5 sm:p-6 min-h-[75vh]`}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className={`text-xl font-bold tracking-tight ${title}`}>Foydalanuvchilar</h2>
          {canAdd && (
            <button
              type="button"
              onClick={openCreate}
              disabled={loading}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60 ${TEAL_BG}`}
            >
              <Plus className="h-4 w-4 shrink-0 stroke-[2.5]" aria-hidden />
              Foydalanuvchi Qo'shish
            </button>
          )}
        </div>
        <div className="flex w-full flex-wrap items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            disabled={loading}
            className={`w-full sm:w-auto sm:min-w-[11rem] rounded-lg border px-3 py-2.5 text-sm outline-none ring-teal-500/0 transition-shadow focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 disabled:opacity-60 ${selectInput}`}
          >
            <option value="all">Barcha rollar</option>
            {roleOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            disabled={loading}
            placeholder="Foydalanuvchini izlash"
            className={`min-w-[12rem] flex-1 rounded-lg border px-4 py-2.5 text-sm outline-none ring-teal-500/0 transition-shadow focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 disabled:opacity-60 ${input}`}
          />
          <button
            type="button"
            onClick={() => setSearchQuery(searchDraft)}
            disabled={loading}
            className={`inline-flex shrink-0 items-center rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
              dark ? "border-teal-500 text-teal-300 hover:bg-slate-700/70" : "border-teal-600 text-teal-700 hover:bg-teal-50"
            }`}
          >
            Qidirish
          </button>
        </div>

        {loading && (
          <div className={`flex items-center justify-center gap-2 py-10 text-sm ${subtitle}`}>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            Yuklanmoqda...
          </div>
        )}

        {!loading && loadError && (
          <div className="py-6 text-center">
            <p className={`text-sm ${subtitle}`}>{loadError}</p>
            <button
              type="button"
              onClick={loadData}
              className={`mt-3 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                dark ? "border-slate-600 text-slate-200 hover:bg-slate-700/70" : "border-slate-200 text-slate-800 hover:bg-slate-50"
              }`}
            >
              Qayta urinish
            </button>
          </div>
        )}

        {!loading && !loadError && (
          <>
        <div className={`rounded-xl border ${cardBase}`}>
          <div className="max-h-[48rem] overflow-auto">
          <table className={`min-w-full border-collapse text-sm ${dark ? "border-slate-700" : "border-slate-200"}`}>
            <thead className={`sticky top-0 z-10 ${dark ? "bg-slate-900/40" : "bg-slate-50"}`}>
              <tr>
                <th className={`border px-4 py-3 text-center text-sm font-bold ${dark ? "border-slate-700" : "border-slate-200"} ${title}`}>№</th>
                <th className={`border px-4 py-3 text-left text-sm font-bold ${dark ? "border-slate-700" : "border-slate-200"} ${title}`}>F.I.O</th>
                <th className={`border px-4 py-3 text-left text-sm font-bold ${dark ? "border-slate-700" : "border-slate-200"} ${title}`}>Izoh</th>
                <th className={`border px-4 py-3 text-left text-sm font-bold ${dark ? "border-slate-700" : "border-slate-200"} ${title}`}>Role</th>
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
                  <td className={`border px-4 py-3 text-sm font-semibold ${dark ? "border-slate-700" : "border-slate-200"} ${title}`}>{row.fio}</td>
                  <td className={`border px-4 py-3 text-sm ${dark ? "border-slate-700" : "border-slate-200"} ${subtitle}`}>{row.izoh ?? ""}</td>
                  <td className={`border px-4 py-3 text-sm ${dark ? "border-slate-700" : "border-slate-200"} ${subtitle}`}>{row.role}</td>
                  <td className={`border px-4 py-3 text-sm ${dark ? "border-slate-700" : "border-slate-200"}`}>
                    <span className={`font-bold ${title}`}>{row.login}</span>
                  </td>
                  <td className={`border px-4 py-3 text-center ${dark ? "border-slate-700" : "border-slate-200"}`}>
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
              ))}
            </tbody>
          </table>
          </div>
        </div>

        {filteredRows.length === 0 && (
          <p className={`text-center text-sm ${subtitle}`}>{searchQuery ? "Qidiruv bo'yicha natija topilmadi." : "Hozircha foydalanuvchi yo'q."}</p>
        )}
          </>
        )}
      </div>

      <Modal open={modal.open} onClose={closeModal} dark={dark}>
        {modal.type === "view" && modal.row && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-2xl font-bold tracking-tight">Foydalanuvchi ma'lumotlari</h3>
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
              <div><p className={`text-xs font-semibold ${meta}`}>F.I.O:</p><p className="mt-1 font-semibold">{modal.row.fio}</p></div>
              <div><p className={`text-xs font-semibold ${meta}`}>Izoh:</p><p className="mt-1 font-semibold">{modal.row.izoh ?? "—"}</p></div>
              <div><p className={`text-xs font-semibold ${meta}`}>Role:</p><p className="mt-1 font-semibold">{modal.row.role}</p></div>
              <div><p className={`text-xs font-semibold ${meta}`}>Login:</p><p className="mt-1 font-semibold">{modal.row.login}</p></div>
            </div>
          </div>
        )}

        {modal.type === "edit" && modal.row && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-2xl font-bold tracking-tight">Foydalanuvchini tahrirlash</h3>
              <button type="button" onClick={closeModal} aria-label="Yopish" className={`-mt-2 rounded-lg p-2 transition-colors ${dark ? "hover:bg-slate-700/70" : "hover:bg-slate-100"}`}>
                <CircleX className={`h-7 w-7 ${dark ? "text-white" : "text-slate-900"}`} strokeWidth={2.25} aria-hidden />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2"><label className="text-base font-semibold">F.I.O</label><input value={editDraft.fio} onChange={(e) => setEditDraft((p) => ({ ...p, fio: e.target.value }))} className={`w-full rounded-lg border px-4 py-3 text-base outline-none ring-teal-500/0 transition-shadow focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${input}`} /></div>
              <div className="space-y-2"><label className="text-base font-semibold">Izoh</label><input value={editDraft.izoh} onChange={(e) => setEditDraft((p) => ({ ...p, izoh: e.target.value }))} className={`w-full rounded-lg border px-4 py-3 text-base outline-none ring-teal-500/0 transition-shadow focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${input}`} placeholder="Masalan: Kafedra mudiri" /></div>
              <div className="space-y-2"><label className="text-base font-semibold">Role</label><select value={editDraft.role} onChange={(e) => setEditDraft((p) => ({ ...p, role: e.target.value }))} className={`w-full rounded-lg border px-4 py-3 text-base outline-none ring-teal-500/0 transition-shadow focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${selectInput}`}>{roleOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button type="button" disabled={busy} onClick={onSaveEdit} className="inline-flex min-w-[11rem] items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-base font-bold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60">Saqlash</button>
              <button type="button" onClick={closeModal} className={`inline-flex min-w-[11rem] items-center justify-center rounded-full border px-6 py-3 text-base font-bold transition-colors ${dark ? "border-slate-600 text-slate-200 hover:bg-slate-700/70" : "border-slate-200 text-slate-800 hover:bg-slate-50"}`}>Bekor qilish</button>
            </div>
          </div>
        )}

        {modal.type === "delete" && modal.row && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-2xl font-bold tracking-tight">Foydalanuvchini o'chirishni tasdiqlaysizmi?</h3>
              <button type="button" onClick={closeModal} aria-label="Yopish" className={`-mt-2 rounded-lg p-2 transition-colors ${dark ? "hover:bg-slate-700/70" : "hover:bg-slate-100"}`}>
                <CircleX className={`h-7 w-7 ${dark ? "text-white" : "text-slate-900"}`} strokeWidth={2.25} aria-hidden />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button type="button" disabled={busy} onClick={onConfirmDelete} className="inline-flex min-w-[11rem] items-center justify-center rounded-2xl bg-red-500 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60">Ha</button>
              <button type="button" onClick={closeModal} className="inline-flex min-w-[11rem] items-center justify-center rounded-2xl bg-blue-500 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-600">Yo'q</button>
            </div>
          </div>
        )}

        {modal.type === "permissions" && modal.row && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className={`h-9 w-9 shrink-0 ${dark ? "text-violet-400" : "text-violet-600"}`} strokeWidth={1.85} aria-hidden />
                <h3 className="text-2xl font-bold tracking-tight">Ruxsatlar</h3>
              </div>
              <button type="button" onClick={closeModal} aria-label="Yopish" className={`-mt-2 rounded-lg p-2 transition-colors ${dark ? "hover:bg-slate-700/70" : "hover:bg-slate-100"}`}>
                <CircleX className={`h-7 w-7 ${dark ? "text-white" : "text-slate-900"}`} strokeWidth={2.25} aria-hidden />
              </button>
            </div>
            <div className={`space-y-2 rounded-xl border px-4 py-3 text-base ${dark ? "border-slate-600 bg-slate-900/40" : "border-slate-200 bg-slate-50"}`}>
              <p className={`text-xs font-semibold uppercase tracking-wide ${meta}`}>Foydalanuvchi</p>
              <p className="font-semibold">{modal.row.fio}</p>
              <p className={`text-sm ${subtitle}`}>{modal.row.login}</p>
            </div>
            {modal.row.role === "Admin" && (
              <p className={`text-sm ${subtitle}`}>
                Admin foydalanuvchida barcha ruxsatlar yoqilgan. Faqat Komissiya va Foydalanuvchi rollarida ruxsatlarni o'zgartirish mumkin.
              </p>
            )}
            {isCurrentUserRow(modal.row) && (
              <p className={`text-sm ${subtitle}`}>O&apos;z ruxsatlaringizni o&apos;zgartira olmaysiz.</p>
            )}
            {!canTogglePermissionsFor(modal.row) && !isCurrentUserRow(modal.row) && modal.row.role !== "Admin" && (
              <p className={`text-sm ${subtitle}`}>Ushbu foydalanuvchi uchun ruxsatlarni o&apos;zgartirish mumkin emas.</p>
            )}
            <div
              className={`divide-y rounded-xl border ${dark ? "divide-slate-600 border-slate-600" : "divide-slate-200 border-slate-200"} max-h-[55vh] overflow-y-auto`}
            >
              {permissionOptions.map((opt) => (
                <div key={opt.id} className="px-4">
                  <PermissionToggle
                    label={opt.label}
                    checked={Boolean(permissionsDraft[opt.id])}
                    onChange={(next) => onPermissionToggle(opt.id, next)}
                    dark={dark}
                    disabled={!canTogglePermissionsFor(modal.row)}
                    saving={permissionSavingId === opt.id}
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={closeModal}
                className={`inline-flex min-w-[11rem] items-center justify-center rounded-full border px-6 py-3 text-base font-bold transition-colors ${
                  dark ? "border-slate-600 text-slate-200 hover:bg-slate-700/70" : "border-slate-200 text-slate-800 hover:bg-slate-50"
                }`}
              >
                Yopish
              </button>
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
                <label className="text-base font-semibold">Parol</label>
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
                    onClick={() => setShowCredentialsPassword((v) => !v)}
                    aria-label={showCredentialsPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                    className={`absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg transition-colors ${
                      dark ? "text-slate-300 hover:bg-slate-700/80" : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {showCredentialsPassword ? <EyeOff className="h-5 w-5" strokeWidth={2} aria-hidden /> : <Eye className="h-5 w-5" strokeWidth={2} aria-hidden />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button type="button" disabled={busy} onClick={onSaveCredentials} className="inline-flex min-w-[11rem] items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-base font-bold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60">Saqlash</button>
              <button type="button" onClick={closeModal} className={`inline-flex min-w-[11rem] items-center justify-center rounded-full border px-6 py-3 text-base font-bold transition-colors ${dark ? "border-slate-600 text-slate-200 hover:bg-slate-700/70" : "border-slate-200 text-slate-800 hover:bg-slate-50"}`}>Bekor qilish</button>
            </div>
          </div>
        )}

        {modal.type === "create" && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-2xl font-bold tracking-tight">Foydalanuvchi qo'shish</h3>
              <button type="button" onClick={closeModal} aria-label="Yopish" className={`-mt-2 rounded-lg p-2 transition-colors ${dark ? "hover:bg-slate-700/70" : "hover:bg-slate-100"}`}>
                <CircleX className={`h-7 w-7 ${dark ? "text-white" : "text-slate-900"}`} strokeWidth={2.25} aria-hidden />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2"><label className="text-base font-semibold">F.I.O</label><input value={createDraft.fio} onChange={(e) => setCreateDraft((p) => ({ ...p, fio: e.target.value }))} className={`w-full rounded-lg border px-4 py-3 text-base outline-none ring-teal-500/0 transition-shadow focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${input}`} placeholder="Masalan: F.I.O" /></div>
              <div className="space-y-2"><label className="text-base font-semibold">Izoh</label><input value={createDraft.izoh} onChange={(e) => setCreateDraft((p) => ({ ...p, izoh: e.target.value }))} className={`w-full rounded-lg border px-4 py-3 text-base outline-none ring-teal-500/0 transition-shadow focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${input}`} placeholder="Masalan: Kafedra mudiri" /></div>
              <div className="space-y-2"><label className="text-base font-semibold">Role</label><select value={createDraft.role} onChange={(e) => setCreateDraft((p) => ({ ...p, role: e.target.value }))} className={`w-full rounded-lg border px-4 py-3 text-base outline-none ring-teal-500/0 transition-shadow focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${selectInput}`}>{ROLES.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
              <div className="space-y-2"><label className="text-base font-semibold">Login</label><input value={createDraft.login} onChange={(e) => setCreateDraft((p) => ({ ...p, login: e.target.value }))} className={`w-full rounded-lg border px-4 py-3 text-base outline-none ring-teal-500/0 transition-shadow focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${input}`} placeholder="user.login" /></div>
              <div className="space-y-2">
                <label className="text-base font-semibold">Parol</label>
                <div className="relative">
                  <input
                    type={showCreatePassword ? "text" : "password"}
                    value={createDraft.password}
                    onChange={(e) => setCreateDraft((p) => ({ ...p, password: e.target.value }))}
                    className={`w-full rounded-lg border py-3 pl-4 pr-12 text-base outline-none ring-teal-500/0 transition-shadow focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${input}`}
                    placeholder="Parol kiriting"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword((v) => !v)}
                    aria-label={showCreatePassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                    className={`absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg transition-colors ${
                      dark ? "text-slate-300 hover:bg-slate-700/80" : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {showCreatePassword ? <EyeOff className="h-5 w-5" strokeWidth={2} aria-hidden /> : <Eye className="h-5 w-5" strokeWidth={2} aria-hidden />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button type="button" disabled={busy} onClick={onSaveCreate} className="inline-flex min-w-[11rem] items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-base font-bold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60">Qo'shish</button>
              <button type="button" onClick={closeModal} className={`inline-flex min-w-[11rem] items-center justify-center rounded-full border px-6 py-3 text-base font-bold transition-colors ${dark ? "border-slate-600 text-slate-200 hover:bg-slate-700/70" : "border-slate-200 text-slate-800 hover:bg-slate-50"}`}>Bekor qilish</button>
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
              {canOpenPermissionsFor(rows.find((r) => r.id === actionsMenu.rowId)) && (
                <button
                  type="button"
                  onClick={() => {
                    closeActionsMenu()
                    const row = rows.find((r) => r.id === actionsMenu.rowId)
                    if (row) openPermissions(row)
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                    dark ? "text-violet-400 hover:bg-slate-700/80" : "text-violet-700 hover:bg-violet-50"
                  }`}
                >
                  <ShieldCheck className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                  Ruxsatlar
                </button>
              )}
              {canPassword && (
                <button
                  type="button"
                  onClick={() => {
                    closeActionsMenu()
                    const row = rows.find((r) => r.id === actionsMenu.rowId)
                    if (row) openCredentials(row)
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                    dark ? "text-amber-400 hover:bg-slate-700/80" : "text-amber-700 hover:bg-amber-50"
                  }`}
                >
                  <LockKeyhole className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                  Parolni o'zgartirish
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  closeActionsMenu()
                  const row = rows.find((r) => r.id === actionsMenu.rowId)
                  if (row) openView(row)
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                  dark ? "text-blue-400 hover:bg-slate-700/80" : "text-blue-700 hover:bg-blue-50"
                }`}
              >
                <Eye className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                Ko'rish
              </button>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    closeActionsMenu()
                    const row = rows.find((r) => r.id === actionsMenu.rowId)
                    if (row) openEdit(row)
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                    dark ? "text-emerald-400 hover:bg-slate-700/80" : "text-emerald-700 hover:bg-emerald-50"
                  }`}
                >
                  <Pencil className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                  Tahrirlash
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => {
                    closeActionsMenu()
                    const row = rows.find((r) => r.id === actionsMenu.rowId)
                    if (row) openDelete(row)
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                    dark ? "text-red-400 hover:bg-slate-700/80" : "text-red-700 hover:bg-red-50"
                  }`}
                >
                  <Trash2 className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                  O'chirish
                </button>
              )}
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
