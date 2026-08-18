import { apiRequest, unwrapPayload } from "./client"

/**
 * @typedef {{ id: string, nameUz: string, facultyId: string, fakultet?: string }} DepartmentRow
 */

/**
 * @param {unknown} item
 * @param {Record<string, string>} [facultyNames] id -> nameUz
 * @returns {DepartmentRow | null}
 */
export function mapDepartment(item, facultyNames) {
  if (!item || typeof item !== "object") return null

  const raw = /** @type {Record<string, unknown>} */ (item)
  const id = raw.id ?? raw.departmentId ?? raw.department_id
  if (id == null) return null

  const facultyId = raw.facultyId ?? raw.faculty_id ?? raw.faculty?.id ?? raw.faculty
  if (facultyId == null) return null

  const nameUz =
    raw.nameUz ??
    raw.name_uz ??
    raw.name ??
    raw.title ??
    raw.departmentName ??
    raw.department_name ??
    ""

  const fid = String(facultyId)
  const fakultet =
    raw.facultyName ??
    raw.faculty_name ??
    (typeof raw.faculty === "object" && raw.faculty
      ? /** @type {Record<string, unknown>} */ (raw.faculty).nameUz ??
        /** @type {Record<string, unknown>} */ (raw.faculty).name
      : undefined) ??
    facultyNames?.[fid] ??
    ""

  return {
    id: String(id),
    nameUz: String(nameUz),
    facultyId: fid,
    fakultet: String(fakultet),
  }
}

/**
 * @param {unknown} payload
 * @param {Record<string, string>} [facultyNames]
 * @returns {DepartmentRow[]}
 */
function mapDepartmentList(payload, facultyNames) {
  const data = unwrapPayload(payload)
  const list = Array.isArray(data) ? data : data && typeof data === "object" ? [data] : []
  return list.map((item) => mapDepartment(item, facultyNames)).filter(Boolean)
}

/**
 * @param {unknown} payload
 * @param {Record<string, string>} [facultyNames]
 * @returns {DepartmentRow}
 */
function mapDepartmentOne(payload, facultyNames) {
  const data = unwrapPayload(payload)
  const item = Array.isArray(data) ? data[0] : data
  const mapped = mapDepartment(item, facultyNames)
  if (!mapped) throw new Error("Kafedra ma'lumotlari noto'g'ri formatda qaytdi")
  return mapped
}

/** @param {Record<string, string>} [facultyNames] @returns {Promise<DepartmentRow[]>} */
export async function fetchAllDepartments(facultyNames) {
  try {
    const json = await apiRequest("/api/departments/all")
    return mapDepartmentList(json, facultyNames)
  } catch (err) {
    console.warn("fetchAllDepartments warning:", err)
    return []
  }
}

/** @param {string | number} facultyId @param {Record<string, string>} [facultyNames] @returns {Promise<DepartmentRow[]>} */
export async function fetchDepartmentsByFaculty(facultyId, facultyNames) {
  const json = await apiRequest(`/api/departments/faculty/${encodeURIComponent(String(facultyId))}`)
  return mapDepartmentList(json, facultyNames)
}

/** @param {string | number} id @param {Record<string, string>} [facultyNames] @returns {Promise<DepartmentRow>} */
export async function fetchDepartmentById(id, facultyNames) {
  const json = await apiRequest(`/api/departments/${encodeURIComponent(String(id))}`)
  return mapDepartmentOne(json, facultyNames)
}

/** @param {unknown} payload @param {Record<string, string>} [facultyNames] @returns {DepartmentRow | null} */
function tryMapDepartment(payload, facultyNames) {
  if (payload == null) return null
  const direct = mapDepartment(payload, facultyNames)
  if (direct) return direct
  const data = unwrapPayload(payload)
  if (data !== payload) return mapDepartment(data, facultyNames)
  return null
}

/** @param {{ nameUz: string, facultyId: string }} body @param {Record<string, string>} [facultyNames] @returns {Promise<DepartmentRow>} */
export async function saveDepartment(body, facultyNames) {
  const json = await apiRequest("/api/departments/save", {
    method: "POST",
    body: JSON.stringify({ name: body.nameUz, facultyId: body.facultyId }),
  })
  const mapped = tryMapDepartment(json, facultyNames)
  if (mapped) return mapped
  return {
    id: String(Date.now()),
    nameUz: body.nameUz,
    facultyId: body.facultyId,
    fakultet: facultyNames?.[body.facultyId] ?? "",
  }
}

/** @param {string | number} id @param {{ nameUz: string, facultyId: string }} body @param {Record<string, string>} [facultyNames] @returns {Promise<DepartmentRow>} */
export async function updateDepartment(id, body, facultyNames) {
  const json = await apiRequest(`/api/departments/update/${encodeURIComponent(String(id))}`, {
    method: "PUT",
    body: JSON.stringify({ name: body.nameUz, facultyId: body.facultyId }),
  })
  const mapped = tryMapDepartment(json, facultyNames)
  if (mapped) return mapped
  return {
    id: String(id),
    nameUz: body.nameUz,
    facultyId: body.facultyId,
    fakultet: facultyNames?.[body.facultyId] ?? "",
  }
}

/** @param {string | number} id @returns {Promise<void>} */
export async function deleteDepartment(id) {
  await apiRequest(`/api/departments/delete/${encodeURIComponent(String(id))}`, {
    method: "DELETE",
  })
}
