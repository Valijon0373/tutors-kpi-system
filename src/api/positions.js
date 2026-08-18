import { apiRequest, unwrapPayload } from "./client"

/**
 * @typedef {{ id: string, nameUz: string }} PositionRow
 */

/**
 * @param {unknown} item
 * @returns {PositionRow | null}
 */
export function mapPosition(item) {
  if (!item || typeof item !== "object") return null

  const raw = /** @type {Record<string, unknown>} */ (item)
  const id = raw.id ?? raw.positionId ?? raw.position_id
  if (id == null) return null

  const nameUz =
    raw.nameUz ??
    raw.name_uz ??
    raw.name ??
    raw.title ??
    raw.positionName ??
    raw.position_name ??
    ""

  return {
    id: String(id),
    nameUz: String(nameUz),
  }
}

/**
 * @param {unknown} payload
 * @returns {PositionRow[]}
 */
function mapPositionList(payload) {
  const data = unwrapPayload(payload)
  const list = Array.isArray(data) ? data : data && typeof data === "object" ? [data] : []
  return list.map(mapPosition).filter(Boolean)
}

/**
 * @param {unknown} payload
 * @returns {PositionRow}
 */
function mapPositionOne(payload) {
  const data = unwrapPayload(payload)
  const item = Array.isArray(data) ? data[0] : data
  const mapped = mapPosition(item)
  if (!mapped) throw new Error("Lavozim ma'lumotlari noto'g'ri formatda qaytdi")
  return mapped
}

/** @returns {Promise<PositionRow[]>} */
export async function fetchAllPositions() {
  try {
    const json = await apiRequest("/api/positions/all")
    return mapPositionList(json)
  } catch (err) {
    console.warn("fetchAllPositions warning:", err)
    return []
  }
}

/** @param {string | number} id @returns {Promise<PositionRow>} */
export async function fetchPositionById(id) {
  const json = await apiRequest(`/api/positions/${encodeURIComponent(String(id))}`)
  return mapPositionOne(json)
}

/** @param {unknown} payload @returns {PositionRow | null} */
function tryMapPosition(payload) {
  if (payload == null) return null
  const direct = mapPosition(payload)
  if (direct) return direct
  const data = unwrapPayload(payload)
  if (data !== payload) return mapPosition(data)
  return null
}

/** @param {{ nameUz: string }} body @returns {Promise<PositionRow>} */
export async function savePosition(body) {
  const json = await apiRequest("/api/positions/save", {
    method: "POST",
    body: JSON.stringify({ name: body.nameUz }),
  })
  const mapped = tryMapPosition(json)
  if (mapped) return mapped
  // POST muvaffaqiyatli — javobda id bo'lmasa ham xato ko'rsatmaymiz
  return { id: String(Date.now()), nameUz: body.nameUz }
}

/** @param {string | number} id @param {{ nameUz: string }} body @returns {Promise<PositionRow>} */
export async function updatePosition(id, body) {
  const json = await apiRequest(`/api/positions/update/${encodeURIComponent(String(id))}`, {
    method: "PUT",
    body: JSON.stringify({ name: body.nameUz }),
  })
  const mapped = tryMapPosition(json)
  if (mapped) return mapped
  return { id: String(id), nameUz: body.nameUz }
}

/** @param {string | number} id @returns {Promise<void>} */
export async function deletePosition(id) {
  await apiRequest(`/api/positions/delete/${encodeURIComponent(String(id))}`, {
    method: "DELETE",
  })
}
