import { apiRequest, unwrapPayload } from "./client"

/**
 * @typedef {{
 *   id: string,
 *   fio: string,
 *   login: string,
 *   facultyId: string,
 *   departmentId: string,
 *   positionId?: string,
 *   fakultet?: string,
 *   kafedra?: string,
 *   password?: string,
 * }} TeacherRow
 */

/**
 * @typedef {{
 *   teacherId: string,
 *   teacherName: string,
 *   resourceCount: number,
 *   fileCount: number,
 *   linkCount: number,
 *   videoCount: number,
 *   imageCount: number,
 *   scoredBall: number,
 *   totalBall: number,
 *   departmentName: string,
 *   facultyName: string,
 *   positionName: string,
 * }} TeacherResourceInfo
 */

/**
 * @param {unknown} item
 * @param {Record<string, string>} [facultyNames]
 * @param {Record<string, string>} [departmentNames]
 * @returns {TeacherRow | null}
 */
export function mapTeacher(item, facultyNames, departmentNames) {
  if (!item || typeof item !== "object") return null

  const raw = /** @type {Record<string, unknown>} */ (item)
  const id = raw.id ?? raw.teacherId ?? raw.teacher_id
  const login = raw.username ?? raw.login
  if (id == null || login == null) return null

  const facultyId = raw.facultyId ?? raw.faculty_id ?? raw.faculty?.id ?? raw.faculty ?? ""
  const departmentId =
    raw.departmentId ?? raw.department_id ?? raw.department?.id ?? raw.department ?? ""

  const positionId =
    raw.positionId ?? raw.position_id ?? raw.lavozimId ?? raw.lavozim_id ?? raw.position?.id ?? raw.position ?? ""

  const fid = String(facultyId)
  const did = String(departmentId)

  const fakultet =
    raw.facultyName ??
    raw.faculty_name ??
    (typeof raw.faculty === "object" && raw.faculty
      ? /** @type {Record<string, unknown>} */ (raw.faculty).nameUz ??
        /** @type {Record<string, unknown>} */ (raw.faculty).name
      : undefined) ??
    facultyNames?.[fid] ??
    ""

  const kafedra =
    raw.departmentName ??
    raw.department_name ??
    (typeof raw.department === "object" && raw.department
      ? /** @type {Record<string, unknown>} */ (raw.department).nameUz ??
        /** @type {Record<string, unknown>} */ (raw.department).name
      : undefined) ??
    departmentNames?.[did] ??
    ""

  return {
    id: String(id),
    fio: String(raw.fullName ?? raw.fio ?? raw.name ?? ""),
    login: String(login),
    facultyId: fid,
    departmentId: did,
    fakultet: String(fakultet),
    kafedra: String(kafedra),
    positionId: positionId === "" ? undefined : String(positionId),
  }
}

/**
 * @param {unknown} payload
 * @param {Record<string, string>} [facultyNames]
 * @param {Record<string, string>} [departmentNames]
 * @returns {TeacherRow[]}
 */
function mapTeacherList(payload, facultyNames, departmentNames) {
  const data = unwrapPayload(payload)
  const list = Array.isArray(data) ? data : data && typeof data === "object" ? [data] : []
  return list.map((item) => mapTeacher(item, facultyNames, departmentNames)).filter(Boolean)
}

/**
 * @param {unknown} payload
 * @param {Record<string, string>} [facultyNames]
 * @param {Record<string, string>} [departmentNames]
 * @returns {TeacherRow}
 */
function mapTeacherOne(payload, facultyNames, departmentNames) {
  const data = unwrapPayload(payload)
  const item = Array.isArray(data) ? data[0] : data
  const mapped = mapTeacher(item, facultyNames, departmentNames)
  if (!mapped) throw new Error("Tyutor ma'lumotlari noto'g'ri formatda qaytdi")
  return mapped
}

/** @param {unknown} payload @param {Record<string, string>} [facultyNames] @param {Record<string, string>} [departmentNames] @returns {TeacherRow | null} */
function tryMapTeacher(payload, facultyNames, departmentNames) {
  if (payload == null) return null
  const direct = mapTeacher(payload, facultyNames, departmentNames)
  if (direct) return direct
  const data = unwrapPayload(payload)
  if (data !== payload) return mapTeacher(data, facultyNames, departmentNames)
  return null
}

/** @param {Record<string, string>} [facultyNames] @param {Record<string, string>} [departmentNames] @returns {Promise<TeacherRow[]>} */
export async function fetchAllTeachers(facultyNames, departmentNames) {
  const json = await apiRequest("/api/teachers/all")
  return mapTeacherList(json, facultyNames, departmentNames)
}

/** @param {string | number} id @param {Record<string, string>} [facultyNames] @param {Record<string, string>} [departmentNames] @returns {Promise<TeacherRow>} */
export async function fetchTeacherById(id, facultyNames, departmentNames) {
  const json = await apiRequest(`/api/teachers/${encodeURIComponent(String(id))}`)
  return mapTeacherOne(json, facultyNames, departmentNames)
}

/**
 * @param {{ fio: string, login: string, password: string, facultyId: string, departmentId: string, positionId?: string }} body
 * @param {Record<string, string>} [facultyNames]
 * @param {Record<string, string>} [departmentNames]
 * @returns {Promise<TeacherRow>}
 */
export async function saveTeacher(body, facultyNames, departmentNames) {
  const json = await apiRequest("/api/teachers/save", {
    method: "POST",
    body: JSON.stringify({
      fullName: body.fio,
      fio: body.fio,
      username: body.login,
      login: body.login,
      password: body.password,
      facultyId: body.facultyId,
      departmentId: body.departmentId,
      positionId: body.positionId,
    }),
  })
  const mapped = tryMapTeacher(json, facultyNames, departmentNames)
  if (mapped) return mapped
  return {
    id: String(Date.now()),
    fio: body.fio,
    login: body.login,
    facultyId: body.facultyId,
    departmentId: body.departmentId,
    fakultet: facultyNames?.[body.facultyId] ?? "",
    kafedra: departmentNames?.[body.departmentId] ?? "",
    positionId: body.positionId ? String(body.positionId) : undefined,
  }
}

/**
 * @param {string | number} id
 * @param {{
 *   fio: string,
 *   login: string,
 *   facultyId: string,
 *   departmentId: string,
 *   positionId?: string,
 *   password?: string,
 * }} body
 * @param {Record<string, string>} [facultyNames]
 * @param {Record<string, string>} [departmentNames]
 * @returns {Promise<TeacherRow>}
 */
export async function updateTeacher(id, body, facultyNames, departmentNames) {
  const payload = {
    fullName: body.fio,
    fio: body.fio,
    username: body.login,
    login: body.login,
    facultyId: body.facultyId,
    departmentId: body.departmentId,
    positionId: body.positionId,
  }
  if (body.password) payload.password = body.password

  const json = await apiRequest(`/api/teachers/update/${encodeURIComponent(String(id))}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
  const mapped = tryMapTeacher(json, facultyNames, departmentNames)
  if (mapped) return mapped
  return {
    id: String(id),
    fio: body.fio,
    login: body.login,
    facultyId: body.facultyId,
    departmentId: body.departmentId,
    fakultet: facultyNames?.[body.facultyId] ?? "",
    kafedra: departmentNames?.[body.departmentId] ?? "",
    positionId: body.positionId ? String(body.positionId) : undefined,
  }
}

/**
 * POST /api/teachers/change/password — parolni o'zgartirish uchun maxsus endpoint.
 * @param {{ username: string, newPassword: string }} body
 * @returns {Promise<{ success: boolean, message?: string }>}
 */
export async function changeTeacherPassword(body) {
  const json = await apiRequest("/api/teachers/change/password", {
    method: "PUT",
    body: JSON.stringify({
      username: body.username,
      newPassword: body.newPassword,
    }),
  })
  const data = unwrapPayload(json) ?? json
  if (data && typeof data === "object" && "success" in data && data.success === false) {
    throw new Error(typeof data.message === "string" ? data.message : "Parol o'zgartirilmadi")
  }
  return data ?? { success: true }
}

/** @param {string | number} id @returns {Promise<void>} */
export async function deleteTeacher(id) {
  await apiRequest(`/api/teachers/delete/${encodeURIComponent(String(id))}`, {
    method: "DELETE",
  })
}

/**
 * GET /api/tutors/me — Joriy tyutorni olish
 * @returns {Promise<TeacherRow>}
 */
export async function fetchCurrentTutor() {
  const json = await apiRequest("/api/tutors/me")
  return mapTeacherOne(json)
}

/**
 * GET /api/tutors/resource/info — komissiya uchun o'qituvchilarning resurs ma'lumotlari.
 * @param {number | string} [seasonId]
 * @param {number | string} [academicYearId]
 * @returns {Promise<TeacherResourceInfo[]>}
 */
export async function fetchTeachersResourceInfo(seasonId, academicYearId) {
  const params = new URLSearchParams()
  if (seasonId) params.append("seasonId", String(seasonId))
  if (academicYearId) params.append("academicYearId", String(academicYearId))
  const qs = params.toString() ? `?${params.toString()}` : ""

  const json = await apiRequest(`/api/tutors/resource/info${qs}`)
  const data = unwrapPayload(json)
  const list = Array.isArray(data) ? data : data && typeof data === "object" ? [data] : []

  return list
    .map((item, idx) => {
      if (!item || typeof item !== "object") return null
      const raw = /** @type {Record<string, unknown>} */ (item)
      const teacherId = String(raw.teacherId ?? raw.teacher_id ?? raw.id ?? "")

      // teacher maydoni string (F.I.O) yoki object bo'lishi mumkin
      const teacherRaw = raw.teacher
      const teacherObj = teacherRaw && typeof teacherRaw === "object" && !Array.isArray(teacherRaw)
        ? /** @type {Record<string, unknown>} */ (teacherRaw)
        : null

      const teacherName = String(
        typeof teacherRaw === "string" ? teacherRaw : "",
      ) || String(
        teacherObj?.fio ?? teacherObj?.fullName ?? teacherObj?.full_name ??
        teacherObj?.teacherName ?? teacherObj?.teacher_name ??
        teacherObj?.name ?? teacherObj?.firstName ??
        "",
      ) || String(
        raw.teacherName ?? raw.teacher_name ?? raw.fio ?? raw.fullName ?? raw.full_name ??
        raw.teacherFio ?? raw.teacher_fio ?? raw.teacherFullName ?? raw.teacher_full_name ??
        raw.name ?? "",
      )

      // API struktura: { teacherId, faculty, department, position, teacher, totalBall, resourceCount }
      const facultyName = String(
        raw.faculty ?? raw.facultyName ?? raw.faculty_name ?? raw.fakultet ?? "",
      )
      const departmentName = String(
        raw.department ?? raw.departmentName ?? raw.department_name ?? raw.kafedra ?? "",
      )
      const positionName = String(
        raw.position ?? raw.positionName ?? raw.position_name ?? raw.lavozim ?? "",
      )
      const resourceCount = Number(
        raw.resourceCount ?? raw.resource_count ?? raw.resourcesCount ?? raw.resources_count ??
        raw.totalResources ?? raw.total_resources ?? 0,
      )
      // totalBall - bu scored ball (olgan bali), maxBall - maksimal ball
      const scoredBall = Number(
        raw.scoredBall ?? raw.scored_ball ?? raw.ball ?? raw.score ??
        raw.totalBall ?? raw.total_ball ?? 0,
      )
      const totalBall = Number(
        raw.maxBall ?? raw.max_ball ?? raw.totalMaxBall ?? raw.total_max_ball ??
        raw.scoredBall ?? raw.scored_ball ?? raw.totalBall ?? raw.total_ball ?? 0,
      )
      const fileCount = Number(raw.fileCount ?? raw.file_count ?? raw.files ?? 0)
      const linkCount = Number(raw.linkCount ?? raw.link_count ?? raw.links ?? 0)
      const videoCount = Number(raw.videoCount ?? raw.video_count ?? raw.videos ?? 0)
      const imageCount = Number(raw.imageCount ?? raw.image_count ?? raw.images ?? raw.rasmCount ?? raw.rasm_count ?? 0)

      return {
        teacherId,
        teacherName,
        resourceCount,
        fileCount,
        linkCount,
        videoCount,
        imageCount,
        scoredBall,
        totalBall,
        departmentName,
        facultyName,
        positionName,
      }
    })
    .filter(Boolean)
}

/**
 * GET /api/tutors/rating/info — komissiya profildagi reyting.
 * Balli yuqorisini tepadan saralab qaytaradi.
 * @param {number | string} [seasonId]
 * @param {number | string} [academicYearId]
 * @typedef {{ teacherName: string, rating: number }} TeacherRatingInfo
 * @returns {Promise<TeacherRatingInfo[]>}
 */
export async function fetchTeachersRatingInfo(seasonId, academicYearId) {
  const params = new URLSearchParams()
  if (seasonId) params.append("seasonId", String(seasonId))
  if (academicYearId) params.append("academicYearId", String(academicYearId))
  const qs = params.toString() ? `?${params.toString()}` : ""

  const json = await apiRequest(`/api/tutors/rating/info${qs}`)
  const data = unwrapPayload(json)
  const list = Array.isArray(data) ? data : data && typeof data === "object" ? [data] : []

  const mapped = list
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const raw = /** @type {Record<string, unknown>} */ (item)
      const teacherName = String(raw.teacherName ?? raw.teacher_name ?? raw.teacher ?? "")
      const rating = Number(raw.rating ?? raw.ball ?? raw.score ?? 0)
      return { teacherName, rating }
    })
    .filter(Boolean)
    // Balli yuqorisini tepadan saralash (kamayish tartibida)
    .sort((a, b) => b.rating - a.rating)

  return mapped
}

/**
 * GET /api/tutors/tutors-resource-info/excel — Excel faylni yuklab olish.
 * Brauzerda fayl sifatida saqlaydi.
 * @param {number | string} [seasonId]
 * @param {number | string} [academicYearId]
 */
export async function downloadTeachersResourceInfoExcel(seasonId, academicYearId) {
  const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "")
  const params = new URLSearchParams()
  if (seasonId) params.append("seasonId", String(seasonId))
  if (academicYearId) params.append("academicYearId", String(academicYearId))
  const qs = params.toString() ? `?${params.toString()}` : ""

  const path = `/api/tutors/tutors-resource-info/excel${qs}`
  const url = API_BASE ? `${API_BASE}${path}` : path

  const token =
    localStorage.getItem("accessToken") || localStorage.getItem("authToken") || ""
  const headers = {}
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const res = await fetch(url, { headers })

  if (!res.ok) {
    throw new Error(`Excel faylni yuklab bo'lmadi: HTTP ${res.status}`)
  }

  const blob = await res.blob()
  const disposition = res.headers.get("content-disposition") ?? ""
  const filenameMatch = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
  const filename = filenameMatch
    ? filenameMatch[1].replace(/['"]/g, "")
    : "teachers-resource-info.xlsx"

  const blobUrl = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = blobUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(blobUrl)
}

