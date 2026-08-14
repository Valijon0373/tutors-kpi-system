/**
 * Backend rollarini (ROLE_MODERATOR, { authority: "..." } va h.k.) bir xil formatga keltiradi.
 */

/** @param {unknown} value */
export function normalizeApiRoleToken(value) {
  if (value == null || value === "") return ""
  if (typeof value === "object") {
    const raw = /** @type {Record<string, unknown>} */ (value)
    const inner = raw.name ?? raw.role ?? raw.authority ?? raw.roleName ?? raw.code ?? ""
    return normalizeApiRoleToken(inner)
  }

  let token = String(value).trim().toUpperCase()
  if (token.startsWith("ROLE_")) token = token.slice(5)
  return token
}

/** @param {unknown} raw */
export function extractApiRoles(raw) {
  if (!raw || typeof raw !== "object") return []

  const obj = /** @type {Record<string, unknown>} */ (raw)
  /** @type {string[]} */
  const found = []
  const sources = [obj.roles, obj.authorities, obj.authorityList, obj.grantedAuthorities]

  for (const source of sources) {
    if (!Array.isArray(source)) continue
    for (const item of source) {
      const token = normalizeApiRoleToken(item)
      if (token) found.push(token)
    }
  }

  for (const field of [obj.roleName, obj.role, obj.primaryRole]) {
    const token = normalizeApiRoleToken(field)
    if (token) found.push(token)
  }

  return [...new Set(found)]
}

/** @param {string} token */
export function parseRolesFromAccessToken(token) {
  if (!token || typeof token !== "string") return []
  try {
    const base64 = token.split(".")[1]
    if (!base64) return []
    const payload = JSON.parse(atob(base64.replace(/-/g, "+").replace(/_/g, "/")))
    return extractApiRoles(payload)
  } catch {
    return []
  }
}

/** @param {string[]} roles */
export function isExpertApiRoles(roles) {
  return roles.some((role) =>
    ["MODERATOR", "COMMISSION", "KOMISSIYA", "EXPERT"].includes(normalizeApiRoleToken(role)),
  )
}

/** @param {string[]} roles */
export function isTeacherApiRoles(roles) {
  return roles.some((role) => normalizeApiRoleToken(role) === "TEACHER")
}

/** @param {string[]} roles */
export function isStaffApiRoles(roles) {
  return roles.some((role) => {
    const token = normalizeApiRoleToken(role)
    return [
      "ADMIN",
      "MODERATOR",
      "COMMISSION",
      "KOMISSIYA",
      "EXPERT",
      "HEAD",
      "DEAN",
      "USER",
      "TEACHER",
    ].includes(token)
  })
}

/**
 * @param {{
 *   user?: { role?: string, roles?: string[] } | null,
 *   matchedTeacher?: unknown,
 *   tokenRoles?: string[],
 * }} input
 */
export function resolveMainAppRole({ user, matchedTeacher, tokenRoles = [] }) {
  if (matchedTeacher) return "teacher"
  if (!user) {
    if (isExpertApiRoles(tokenRoles)) return "expert"
    if (tokenRoles.some((role) => normalizeApiRoleToken(role) === "ADMIN")) return "admin"
    return "teacher"
  }

  const uiRole = String(user.role ?? "")
  if (uiRole === "Admin") return "admin"
  if (uiRole === "Komissiya") return "expert"

  const roles = [
    ...extractApiRoles(user),
    ...(user.roles ?? []).map(normalizeApiRoleToken),
    ...tokenRoles.map(normalizeApiRoleToken),
  ].filter(Boolean)
  const unique = [...new Set(roles)]

  if (unique.includes("ADMIN")) return "admin"
  if (isExpertApiRoles(unique)) return "expert"
  if (unique.includes("HEAD")) return "head"
  if (unique.includes("DEAN")) return "dean"
  if (isTeacherApiRoles(unique) || uiRole === "O'qituvchi" || uiRole === "Tyutor") return "teacher"
  return "expert"
}

/**
 * @param {{
 *   user?: { role?: string, roles?: string[] } | null,
 *   matchedTeacher?: unknown,
 *   tokenRoles?: string[],
 * }} input
 */
export function canAccessMainApp({ user, matchedTeacher, tokenRoles = [] }) {
  if (matchedTeacher) return true
  if (user?.role === "Komissiya" || user?.role === "Admin") return true
  if (user && isStaffApiRoles([...extractApiRoles(user), ...(user.roles ?? [])])) return true
  if (isStaffApiRoles(tokenRoles) || isExpertApiRoles(tokenRoles)) return true
  return false
}
