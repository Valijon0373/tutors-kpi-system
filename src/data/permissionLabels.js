/** @type {Record<string, string>} */
export const PERMISSION_LABELS_UZ = {
  USER_VIEW: "Foydalanuvchilarni ko'rish",
  USER_CREATE: "Foydalanuvchi qo'shish",
  USER_EDIT: "Foydalanuvchini tahrirlash",
  USER_DELETE: "Foydalanuvchini o'chirish",

  FACULTY_VIEW: "Fakultetlarni ko'rish",
  FACULTY_CREATE: "Fakultet qo'shish",
  FACULTY_EDIT: "Fakultetni tahrirlash",
  FACULTY_DELETE: "Fakultetni o'chirish",

  DEPARTMENT_VIEW: "Kafedralarni ko'rish",
  DEPARTMENT_CREATE: "Kafedra qo'shish",
  DEPARTMENT_EDIT: "Kafedrani tahrirlash",
  DEPARTMENT_DELETE: "Kafedrani o'chirish",

  POSITION_VIEW: "Lavozimlarni ko'rish",
  POSITION_CREATE: "Lavozim qo'shish",
  POSITION_EDIT: "Lavozimni tahrirlash",
  POSITION_DELETE: "Lavozimni o'chirish",

  CATEGORY_VIEW: "Kategoriyalarni ko'rish",
  CATEGORY_CREATE: "Kategoriya qo'shish",
  CATEGORY_EDIT: "Kategoriyani tahrirlash",
  CATEGORY_DELETE: "Kategoriyani o'chirish",

  CRITERIA_VIEW: "Mezonlarni ko'rish",
  CRITERIA_CREATE: "Mezon yaratish",
  CRITERIA_EDIT: "Mezonni tahrirlash",
  CRITERIA_DELETE: "Mezonni o'chirish",

  TEACHER_VIEW: "Tyutorlarni ko'rish",
  TEACHER_CREATE: "Tyutor qo'shish",
  TEACHER_EDIT: "Tyutorni tahrirlash",
  TEACHER_DELETE: "Tyutorni o'chirish",

  DOCUMENT_VIEW: "Hujjatlarni ko'rish",
  DOCUMENT_CREATE: "Hujjat qo'shish",
  DOCUMENT_EDIT: "Hujjatni tahrirlash",
  DOCUMENT_DELETE: "Hujjatni o'chirish",

  RESOURCE_VIEW: "Resurslarni ko'rish",
  RESOURCE_CREATE: "Resurs qo'shish",
  RESOURCE_EDIT: "Resursni tahrirlash",
  RESOURCE_DELETE: "Resursni o'chirish",

  PERMISSION_VIEW: "Ruxsatlarni ko'rish",
  PERMISSION_CREATE: "Ruxsat qo'shish",
  PERMISSION_EDIT: "Ruxsatni tahrirlash",
  PERMISSION_DELETE: "Ruxsatni o'chirish",

  FILE_UPLOAD: "Faylni yuklash",
}

/** @type {{ id: string, label: string }[]} */
export const PERMISSION_OPTIONS_UZ = Object.entries(PERMISSION_LABELS_UZ).map(([id, label]) => ({
  id,
  label,
}))

const KNOWN_PERMISSION_KEYS = new Set(
  Object.keys(PERMISSION_LABELS_UZ).map((k) => k.toLowerCase())
)

/** Tahrirlash/qo'shish kabi ruxsatlar ko'rishni ham talab qiladi */
const WRITE_ACTIONS = new Set(["create", "edit", "delete"])

/** @param {unknown} key */
export function normalizePermissionKey(key) {
  return String(key ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s.\-–—]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
}

/** @param {unknown} code */
export function isKnownPermissionCode(code) {
  return KNOWN_PERMISSION_KEYS.has(normalizePermissionKey(code))
}

/** @param {unknown} code @returns {string} */
export function getCanonicalPermissionId(code) {
  const key = normalizePermissionKey(code)
  if (!key) return ""
  const found = PERMISSION_OPTIONS_UZ.find((o) => normalizePermissionKey(o.id) === key)
  return found?.id ?? ""
}

/**
 * @param {unknown} code
 * @returns {string | null} masalan: faculty
 */
export function getEntityPrefixFromPermission(code) {
  const key = normalizePermissionKey(code)
  if (!isKnownPermissionCode(key)) return null
  const parts = key.split("_").filter(Boolean)
  if (parts.length < 2) return null
  const action = parts[parts.length - 1]
  if (action === "view" || WRITE_ACTIONS.has(action)) {
    return parts.slice(0, -1).join("_")
  }
  return null
}

/** @param {string} entityPrefix */
export function getViewPermissionKey(entityPrefix) {
  if (!entityPrefix) return null
  const view = `${entityPrefix}_view`
  return isKnownPermissionCode(view) ? view : null
}

/**
 * Yozish ruxsati berilganda ko'rish ham beriladi.
 * @param {unknown} code
 * @returns {string[]}
 */
export function getImpliedPermissionsWhenGranting(code) {
  const normalized = normalizePermissionKey(code)
  if (!normalized || !isKnownPermissionCode(normalized)) return []
  if (normalized.endsWith("_view")) return [normalized]

  const entity = getEntityPrefixFromPermission(normalized)
  if (!entity || !WRITE_ACTIONS.has(normalized.split("_").pop() ?? "")) {
    return [normalized]
  }

  const view = getViewPermissionKey(entity)
  if (view && view !== normalized) return [normalized, view]
  return [normalized]
}

/**
 * @param {string} normalizedKey
 * @param {{ id: string }[]} options
 */
export function resolvePermissionOptionId(normalizedKey, options) {
  const key = normalizePermissionKey(normalizedKey)
  const found = options.find((o) => normalizePermissionKey(o.id) === key)
  return found?.id ?? getCanonicalPermissionId(key) ?? key
}

/**
 * @param {Iterable<string>} permissions
 * @param {unknown} code
 */
/**
 * @param {string[]} [permissions]
 * @param {string} entityPrefix — masalan: user, faculty, department
 * @param {boolean} [isAdmin]
 */
export function getCrudPermissions(permissions, entityPrefix, isAdmin = false) {
  const prefix = normalizePermissionKey(entityPrefix)
  const permSet = new Set((permissions ?? []).map((p) => normalizePermissionKey(p)).filter(Boolean))
  const viewKey = `${prefix}_view`
  return {
    canView: isAdmin || hasEffectivePermission(permissions ?? [], viewKey),
    canAdd: isAdmin || permSet.has(`${prefix}_create`),
    canEdit: isAdmin || permSet.has(`${prefix}_edit`),
    canDelete: isAdmin || permSet.has(`${prefix}_delete`),
  }
}

export function hasEffectivePermission(permissions, code) {
  const key = normalizePermissionKey(code)
  if (!key) return false

  const set = new Set([...permissions].map((p) => normalizePermissionKey(p)).filter(isKnownPermissionCode))
  if (set.has(key)) return true

  if (!key.endsWith("_view")) return false

  const entity = key.slice(0, -"_view".length)
  if (!entity) return false

  for (const action of WRITE_ACTIONS) {
    if (set.has(`${entity}_${action}`)) return true
  }
  return false
}

/**
 * @param {string[] | undefined} permissions
 * @param {{ id: string }[]} options
 * @returns {string[]} option.id lar
 */
export function getMissingViewPermissionOptionIds(permissions, options) {
  const set = new Set((permissions ?? []).map((p) => normalizePermissionKey(p)).filter(isKnownPermissionCode))
  const missing = new Set()

  for (const perm of set) {
    for (const implied of getImpliedPermissionsWhenGranting(perm)) {
      if (!implied.endsWith("_view")) continue
      if (set.has(implied)) continue
      const id = resolvePermissionOptionId(implied, options)
      if (id) missing.add(id)
    }
  }

  return [...missing]
}

/** @param {unknown} code */
export function getPermissionLabelUz(code) {
  const key = normalizePermissionKey(code)
  if (!key) return ""
  const upper = key.toUpperCase()
  return PERMISSION_LABELS_UZ[upper] ?? ""
}

/**
 * Faqat PERMISSION_LABELS_UZ dagi ruxsatlar; serverdan kelgan qo'shimchalar qo'shilmaydi.
 * @param {{ id: string, label?: string }[]} [_catalog]
 * @returns {{ id: string, label: string }[]}
 */
export function mergePermissionOptionsFromCatalog(_catalog) {
  return PERMISSION_OPTIONS_UZ
}
