import { apiRequest, unwrapPayload } from "./client"

/**
 * @typedef {{
 *   id: number,
 *   academicYearId: number,
 *   academicYearName?: string,
 *   quarter: "FIRST" | "SECOND" | "THIRD" | "FOURTH",
 *   number: number,
 *   name: string,
 *   months?: string,
 *   uploadFrom?: string,
 *   uploadTo?: string,
 *   scoringFrom?: string,
 *   scoringTo?: string,
 *   uploadOpen?: boolean,
 *   scoringOpen?: boolean,
 *   status?: "ACTIVE" | "DISABLED" | "DELETED",
 * }} SeasonResponse
 */

/**
 * @typedef {{
 *   id: number,
 *   name: string,
 *   startYear: number,
 *   endYear: number,
 *   active: boolean,
 *   uploadFrom?: string,
 *   uploadTo?: string,
 *   scoringFrom?: string,
 *   scoringTo?: string,
 *   uploadOpen?: boolean,
 *   scoringOpen?: boolean,
 *   status?: "ACTIVE" | "DISABLED" | "DELETED",
 *   createdAt?: string,
 *   updatedAt?: string,
 *   createdUser?: string,
 *   seasons?: SeasonResponse[],
 * }} AcademicYearResponse
 */

/**
 * GET /api/academic-years — barcha o'quv yillari
 * @returns {Promise<AcademicYearResponse[]>}
 */
export async function fetchAllAcademicYears() {
  const json = await apiRequest("/api/academic-years")
  const data = unwrapPayload(json)
  return Array.isArray(data) ? data : []
}

/**
 * GET /api/academic-years/current — faol o'quv yili
 * @returns {Promise<AcademicYearResponse | null>}
 */
export async function getActiveAcademicYear() {
  try {
    const json = await apiRequest("/api/academic-years/current")
    const data = unwrapPayload(json)
    return data && typeof data === "object" ? /** @type {AcademicYearResponse} */ (data) : null
  } catch {
    return null
  }
}

/**
 * GET /api/academic-years/{id} — ID bo'yicha o'quv yilini topish
 * @param {number | string} id
 * @returns {Promise<AcademicYearResponse>}
 */
export async function fetchAcademicYearById(id) {
  const json = await apiRequest(`/api/academic-years/${encodeURIComponent(String(id))}`)
  const data = unwrapPayload(json)
  return /** @type {AcademicYearResponse} */ (data)
}

/**
 * POST /api/academic-years — 4 ta mavsum bilan yangi o'quv yili yaratish
 * @param {{ name?: string, startYear: number, endYear: number, active?: boolean }} dto
 * @returns {Promise<AcademicYearResponse>}
 */
export async function createAcademicYear(dto) {
  const json = await apiRequest("/api/academic-years", {
    method: "POST",
    body: JSON.stringify({
      name: dto.name || `${dto.startYear}-${dto.endYear}`,
      startYear: Number(dto.startYear),
      endYear: Number(dto.endYear),
      active: Boolean(dto.active),
    }),
  })
  const data = unwrapPayload(json)
  return /** @type {AcademicYearResponse} */ (data)
}

/**
 * PUT /api/academic-years/{id} — O'quv yilini yangilash
 * @param {number | string} id
 * @param {{ name?: string, startYear: number, endYear: number, active?: boolean }} dto
 * @returns {Promise<AcademicYearResponse>}
 */
export async function updateAcademicYear(id, dto) {
  const json = await apiRequest(`/api/academic-years/${encodeURIComponent(String(id))}`, {
    method: "PUT",
    body: JSON.stringify({
      name: dto.name || `${dto.startYear}-${dto.endYear}`,
      startYear: Number(dto.startYear),
      endYear: Number(dto.endYear),
      active: Boolean(dto.active),
    }),
  })
  const data = unwrapPayload(json)
  return /** @type {AcademicYearResponse} */ (data)
}

/**
 * DELETE /api/academic-years/{id} — O'quv yilini o'chirish
 * @param {number | string} id
 * @returns {Promise<void>}
 */
export async function deleteAcademicYear(id) {
  await apiRequest(`/api/academic-years/${encodeURIComponent(String(id))}`, {
    method: "DELETE",
  })
}

/**
 * PUT /api/academic-years/{id}/activate — O'quv yilini faol deb belgilash
 * @param {number | string} id
 * @returns {Promise<AcademicYearResponse>}
 */
export async function activateAcademicYear(id) {
  const json = await apiRequest(`/api/academic-years/${encodeURIComponent(String(id))}/activate`, {
    method: "PUT",
  })
  const data = unwrapPayload(json)
  return /** @type {AcademicYearResponse} */ (data)
}

/**
 * PUT /api/academic-years/{id}/windows — Yillik yuklash va baholash muddatlarini o'rnatish
 * @param {number | string} id
 * @param {{ uploadFrom: string, uploadTo: string, scoringFrom: string, scoringTo: string }} windows
 * @returns {Promise<AcademicYearResponse>}
 */
export async function setAcademicYearWindows(id, windows) {
  const json = await apiRequest(`/api/academic-years/${encodeURIComponent(String(id))}/windows`, {
    method: "PUT",
    body: JSON.stringify({
      uploadFrom: windows.uploadFrom,
      uploadTo: windows.uploadTo,
      scoringFrom: windows.scoringFrom,
      scoringTo: windows.scoringTo,
    }),
  })
  const data = unwrapPayload(json)
  return /** @type {AcademicYearResponse} */ (data)
}

/**
 * POST /api/academic-years/{id}/copy-criteria — Boshqa o'quv yilidan mezon va kategoriyalarni ko'chirish
 * @param {number | string} id
 * @param {number | string} sourceAcademicYearId
 * @returns {Promise<{ message?: string, sourceAcademicYearId: number, targetAcademicYearId: number, copiedCriteria: number, copiedCategories: number, skippedCriteria: number }>}
 */
export async function copyAcademicYearCriteria(id, sourceAcademicYearId) {
  const json = await apiRequest(`/api/academic-years/${encodeURIComponent(String(id))}/copy-criteria`, {
    method: "POST",
    body: JSON.stringify({
      sourceAcademicYearId: Number(sourceAcademicYearId),
    }),
  })
  const data = unwrapPayload(json)
  return data
}

/**
 * GET /api/academic-years/{id}/seasons — O'quv yili mavsumlarini ko'rish
 * @param {number | string} id
 * @returns {Promise<SeasonResponse[]>}
 */
export async function fetchAcademicYearSeasons(id) {
  const json = await apiRequest(`/api/academic-years/${encodeURIComponent(String(id))}/seasons`)
  const data = unwrapPayload(json)
  return Array.isArray(data) ? data : []
}

/**
 * GET /api/academic-years/{id}/report — Yillik hisobot
 * @param {number | string} id
 * @returns {Promise<any>}
 */
export async function fetchAcademicYearReport(id) {
  const json = await apiRequest(`/api/academic-years/${encodeURIComponent(String(id))}/report`)
  return unwrapPayload(json)
}

/**
 * GET /api/academic-years/{id}/rating — Yillik tyutorlar reytingi
 * @param {number | string} id
 * @returns {Promise<any[]>}
 */
export async function fetchAcademicYearRating(id) {
  const json = await apiRequest(`/api/academic-years/${encodeURIComponent(String(id))}/rating`)
  const data = unwrapPayload(json)
  return Array.isArray(data) ? data : []
}

/**
 * GET /api/academic-years/seasons/{seasonId} — Mavsumni ID bo'yicha olish
 * @param {number | string} seasonId
 * @returns {Promise<SeasonResponse>}
 */
export async function fetchSeasonById(seasonId) {
  const json = await apiRequest(`/api/academic-years/seasons/${encodeURIComponent(String(seasonId))}`)
  const data = unwrapPayload(json)
  return /** @type {SeasonResponse} */ (data)
}

/**
 * PUT /api/academic-years/seasons/{seasonId}/windows — Mavsum uchun yuklash va baholash muddatlarini o'rnatish
 * @param {number | string} seasonId
 * @param {{ uploadFrom: string, uploadTo: string, scoringFrom: string, scoringTo: string }} windows
 * @returns {Promise<SeasonResponse>}
 */
export async function setSeasonWindows(seasonId, windows) {
  const json = await apiRequest(`/api/academic-years/seasons/${encodeURIComponent(String(seasonId))}/windows`, {
    method: "PUT",
    body: JSON.stringify({
      uploadFrom: windows.uploadFrom,
      uploadTo: windows.uploadTo,
      scoringFrom: windows.scoringFrom,
      scoringTo: windows.scoringTo,
    }),
  })
  const data = unwrapPayload(json)
  return /** @type {SeasonResponse} */ (data)
}

/**
 * GET /api/academic-years/seasons/{seasonId}/report — Mavsumiy hisobot
 * @param {number | string} seasonId
 * @returns {Promise<any>}
 */
export async function fetchSeasonReport(seasonId) {
  const json = await apiRequest(`/api/academic-years/seasons/${encodeURIComponent(String(seasonId))}/report`)
  return unwrapPayload(json)
}

/**
 * GET /api/academic-years/seasons/{seasonId}/rating — Mavsumiy tyutorlar reytingi
 * @param {number | string} seasonId
 * @returns {Promise<any[]>}
 */
export async function fetchSeasonRating(seasonId) {
  const json = await apiRequest(`/api/academic-years/seasons/${encodeURIComponent(String(seasonId))}/rating`)
  const data = unwrapPayload(json)
  return Array.isArray(data) ? data : []
}
