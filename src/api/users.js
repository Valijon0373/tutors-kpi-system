import {
  getImpliedPermissionsWhenGranting,
  getPermissionLabelUz,
  isKnownPermissionCode,
  normalizePermissionKey,
} from "../data/permissionLabels"
import { apiRequest, unwrapPayload } from "./client"
import { extractApiRoles, normalizeApiRoleToken } from "./roles"

/**
 * @typedef {{ id: string, fio: string, login: string, izoh: string, role: string, roles?: string[], permissions?: string[], status?: string }} UserRow
 */

const UI_ROLE_BY_API = {
  ADMIN: "Admin",
  // Teacher roli Users sahifasida alohida ajratiladi
  TEACHER: "Tyutor",
  USER: "Foydalanuvchi",
  // Ba'zi backendlarda komissiya roli MODERATOR/COMMISSION ko'rinishida keladi
  MODERATOR: "Komissiya",
  COMMISSION: "Komissiya",
  KOMISSIYA: "Komissiya",
}

const API_ROLE_BY_UI = {
  Admin: "ADMIN",
  // Backend "TEACHER"ni tanimasa, ko'pincha "USER" ishlatiladi
  "Foydalanuvchi": "USER",
  "O'qituvchi": "TEACHER",
  "Tyutor": "TEACHER",
  // Backend "MODERATOR"ni tanimasa, ko'pincha "COMMISSION" ishlatiladi
  Komissiya: "COMMISSION",
}

/** @param {unknown} role */
export function mapApiRoleToUi(role) {
  const key = normalizeApiRoleToken(role)
  return UI_ROLE_BY_API[key] ?? String(role ?? "")
}

/** @param {string} uiRole */
export function mapUiRoleToApi(uiRole) {
  return API_ROLE_BY_UI[uiRole] ?? String(uiRole ?? "").toUpperCase()
}

/**
 * Backend ba'zida ruxsatlarni string, raqam yoki { code / name / authority } obyekt sifatida yuboradi.
 * @param {unknown} raw
 * @returns {string[]}
 */
export function normalizeUserPermissions(raw) {
  if (raw == null) return []
  if (typeof raw === "string" || typeof raw === "number") {
    const s = String(raw).trim()
    return s ? [s] : []
  }
  if (!Array.isArray(raw)) return []
  const out = []
  for (const p of raw) {
    if (p == null) continue
    if (typeof p === "string" || typeof p === "number") {
      const s = String(p).trim()
      if (s) out.push(s)
      continue
    }
    if (typeof p === "object") {
      const o = /** @type {Record<string, unknown>} */ (p)
      const code =
        o.code ??
        o.name ??
        o.permission ??
        o.authority ??
        o.permissionCode ??
        o.permissionName ??
        o.slug ??
        o.id
      if (code != null && typeof code !== "object") {
        const s = String(code).trim()
        if (s) out.push(s)
      }
    }
  }
  return out
}

/** @param {Record<string, unknown>} raw @returns {string[]} */
function collectUserPermissionStrings(raw) {
  const sources = [
    raw.permissions,
    raw.authorities,
    raw.authorityList,
    raw.grantedAuthorities,
    raw.permissionList,
    raw.userPermissions,
    raw.rolePermissions,
  ]
  const merged = []
  for (const s of sources) {
    merged.push(...normalizeUserPermissions(s))
  }
  const set = new Set(
    merged.map((p) => normalizePermissionKey(p)).filter((p) => p && isKnownPermissionCode(p))
  )
  for (const p of [...set]) {
    for (const implied of getImpliedPermissionsWhenGranting(p)) {
      if (implied) set.add(implied)
    }
  }
  return [...set]
}

/**
 * @param {unknown} item
 * @returns {UserRow | null}
 */
export function mapUser(item) {
  if (!item || typeof item !== "object") return null
  const raw = /** @type {Record<string, unknown>} */ (item)
  const login = raw.username ?? raw.login
  if (login == null) return null
  const id = raw.id ?? raw.userId ?? login

  const roles = extractApiRoles(raw)
  const primaryRole = roles[0] ?? normalizeApiRoleToken(raw.roleName ?? raw.role)

  return {
    id: String(id),
    fio: String(raw.fullName ?? raw.fio ?? ""),
    login: String(login),
    izoh: String(raw.description ?? raw.izoh ?? ""),
    role: mapApiRoleToUi(primaryRole),
    roles,
    permissions: collectUserPermissionStrings(raw),
    status: raw.status != null ? String(raw.status) : undefined,
  }
}

/**
 * @param {unknown} payload
 * @returns {UserRow[]}
 */
function mapUserList(payload) {
  const data = unwrapPayload(payload)
  const list = Array.isArray(data) ? data : data && typeof data === "object" ? [data] : []
  return list.map(mapUser).filter(Boolean)
}

/** @param {string} username @returns {Promise<UserRow>} */
export async function fetchUserByUsername(username) {
  const json = await apiRequest(`/api/users/${encodeURIComponent(username)}`)
  const mapped = mapUser(unwrapPayload(json))
  if (!mapped) throw new Error("Foydalanuvchi topilmadi")
  return mapped
}

/**
 * Login javobidan foydalanuvchini o'qish (GET /api/users ishlamasa).
 * @param {unknown} raw
 * @param {string} username
 * @returns {UserRow | null}
 */
export function mapUserFromLoginBody(raw, username) {
  if (!raw || typeof raw !== "object") return null
  const data = unwrapPayload(raw)
  const root = /** @type {Record<string, unknown>} */ (data)
  const nested = root.user ?? root.userDetails ?? root.profile ?? root
  const candidate =
    nested && typeof nested === "object"
      ? {
          .../** @type {Record<string, unknown>} */ (nested),
          username:
            /** @type {Record<string, unknown>} */ (nested).username ??
            /** @type {Record<string, unknown>} */ (nested).login ??
            username,
        }
      : { ...root, username: root.username ?? root.login ?? username }

  return mapUser(candidate)
}

/** @returns {Promise<UserRow[]>} */
export async function fetchAllUsers() {
  const json = await apiRequest("/api/users/all")
  const list = mapUserList(json)
  // O'chirilgan foydalanuvchilar UI'da umuman ko'rinmasin.
  return list.filter((u) => {
    const s = String(u.status ?? "").toUpperCase()
    if (!s) return true
    return !(s.includes("DELETED") || s.includes("DELETE"))
  })
}

/**
 * @param {{ fio: string, login: string, password: string, izoh?: string, role: string }} body
 * @returns {Promise<UserRow>}
 */
export async function saveUser(body) {
  const json = await apiRequest("/api/users/save", {
    method: "POST",
    body: JSON.stringify({
      fullName: body.fio,
      username: body.login,
      password: body.password,
      description: body.izoh ?? "",
      roleName: mapUiRoleToApi(body.role),
    }),
  })
  const list = mapUserList(json)
  if (list[0]) return list[0]
  const one = mapUser(unwrapPayload(json))
  if (one) return one
  throw new Error("Foydalanuvchi saqlanmadi")
}

/**
 * @param {string} username
 * @param {{ fio: string, izoh?: string, role: string, password?: string }} body
 */
export async function updateUser(username, body) {
  await apiRequest(`/api/users/edit/${encodeURIComponent(username)}`, {
    method: "PUT",
    body: JSON.stringify({
      fullName: body.fio,
      username,
      password: body.password ?? "********",
      description: body.izoh ?? "",
      roleName: mapUiRoleToApi(body.role),
    }),
  })
}

/** @param {string} username */
export async function deleteUser(username) {
  await apiRequest(`/api/users/delete/${encodeURIComponent(username)}`, {
    method: "DELETE",
  })
}

/**
 * Serverdan ruxsatlar ro'yxati (id/kod va ixtiyoriy yozuv).
 * @returns {Promise<{ id: string, label: string }[]>}
 */
export async function fetchPermissionsCatalog() {
  const json = await apiRequest("/api/users/permissions")
  const data = unwrapPayload(json)
  const list = Array.isArray(data) ? data : []
  return list
    .map((item) => {
      if (typeof item === "string") {
        const id = normalizePermissionKey(item)
        return id ? { id, label: getPermissionLabelUz(id) } : null
      }
      if (!item || typeof item !== "object") return null
      const o = /** @type {Record<string, unknown>} */ (item)
      const rawCode = o.code ?? o.permission ?? o.authority ?? o.permissionCode ?? o.name
      const rawId = o.id
      const codeKey = normalizePermissionKey(rawCode ?? rawId)
      if (!codeKey) return null
      return { id: codeKey, label: getPermissionLabelUz(codeKey) }
    })
    .filter(Boolean)
}

/**
 * @param {string} username
 * @param {string[]} permissions — ruxsat kodlari (masalan: faculty_create)
 */
export async function setUserPermissions(username, permissions) {
  const idsRaw = Array.isArray(permissions) ? permissions : permissions?.ids ?? []
  const codesRaw = Array.isArray(permissions) ? permissions : permissions?.codes ?? permissions?.labels ?? []

  const permissionIds = idsRaw
    .map((x) => (typeof x === "number" ? x : String(x)))
    .map((x) => (typeof x === "string" && /^\d+$/.test(x) ? Number(x) : x))
    .filter((x) => typeof x === "number")

  const permissionCodes = codesRaw.map(String).filter(Boolean)

  await apiRequest("/api/users/set/permissions", {
    method: "PUT",
    body: JSON.stringify({
      username,
      // Turli backend implementatsiyalar uchun bir nechta nomlar bilan yuboramiz:
      permissions: permissionCodes,
      permissionNames: permissionCodes,
      permissionCodes: permissionCodes,
      permissionIds,
    }),
  })
}

/**
 * @param {string} username
 * @param {string[]} permissions
 */
export async function removeUserPermissions(username, permissions) {
  const idsRaw = Array.isArray(permissions) ? permissions : permissions?.ids ?? []
  const codesRaw = Array.isArray(permissions) ? permissions : permissions?.codes ?? permissions?.labels ?? []

  const permissionIds = idsRaw
    .map((x) => (typeof x === "number" ? x : String(x)))
    .map((x) => (typeof x === "string" && /^\d+$/.test(x) ? Number(x) : x))
    .filter((x) => typeof x === "number")

  const permissionCodes = codesRaw.map(String).filter(Boolean)

  await apiRequest("/api/users/remove/permissions", {
    method: "PUT",
    body: JSON.stringify({
      username,
      permissions: permissionCodes,
      permissionNames: permissionCodes,
      permissionCodes: permissionCodes,
      permissionIds,
    }),
  })
}

/** @param {string} username */
export async function disableUser(username) {
  await apiRequest(`/api/users/disabled/${encodeURIComponent(username)}`, {
    method: "PUT",
  })
}

/**
 * Login band emasligini tekshirish (backend qaytarmasidan oldin).
 * @param {string} username
 * @returns {Promise<boolean>} true bo'lsa odatda "bo'sh / ishlatish mumkin"
 */
export async function checkUsernameAvailable(username) {
  const json = await apiRequest(`/api/users/check/username/${encodeURIComponent(username)}`)
  const data = unwrapPayload(json)
  if (typeof data === "boolean") return data
  if (data && typeof data === "object") {
    const o = /** @type {Record<string, unknown>} */ (data)
    if (typeof o.available === "boolean") return o.available
    if (typeof o.free === "boolean") return o.free
    if (typeof o.exists === "boolean") return !o.exists
    if (typeof o.unique === "boolean") return o.unique
  }
  return true
}

/**
 * PUT /api/users/change/password — foydalanuvchi parolini o'zgartirish
 * @param {string} username
 * @param {string} newPassword
 */
export async function changeUserPassword(username, newPassword) {
  await apiRequest("/api/users/change/password", {
    method: "PUT",
    body: JSON.stringify({ username, newPassword }),
  })
}

