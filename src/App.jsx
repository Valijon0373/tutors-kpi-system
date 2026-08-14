import { useCallback, useEffect, useMemo, useState } from "react"
import { Commet } from "react-loading-indicators"
import { ArrowLeft, Download, Eye, EyeOff, MessageSquareText, Trash2, X } from "lucide-react"
import bgVideo from "./assets/bg.mp4"
import logoImg from "./assets/logo.jpg"
import Footer from "./components/Footer.jsx"
import Rating from "./components/Rating.jsx"
import HomeHeroBrand from "./components/HomeHeroBrand.jsx"
import Navbar from "./components/Navbar.jsx"
import TeacherPage from "./components/TeachersPage.jsx"
import { fetchAllCriterionRows } from "./api/categories"
import { fetchAllSections } from "./api/criteriaApi"
import { clearAuthTokens, getAccessToken, getAuthUsername, login, setAuthTokens } from "./api/auth"
import { fetchAllDepartments } from "./api/departments"
import { fetchAllFaculties } from "./api/faculties"
import { fetchAllPositions } from "./api/positions"
import { fetchAllTeachers, fetchTeachersResourceInfo, saveTeacher } from "./api/teachers"
import { deleteTeacherResource, fetchIsDocumentsScored, fetchTeacherDocuments, saveTeacherDocument, setDocumentBall } from "./api/teacherDocuments"
import { getFileDownloadUrl } from "./api/files"
import {
  canAccessMainApp,
  isExpertApiRoles,
  parseRolesFromAccessToken,
  resolveMainAppRole,
} from "./api/roles"
import { getAuthRoles } from "./api/auth"
import { mapApiRoleToUi, mapUserFromLoginBody, fetchUserByUsername } from "./api/users"
import { CRITERIA as DEFAULT_CRITERIA } from "./data/criteria.js"
import { SESSION_EXPIRED_EVENT } from "./api/session"

const ROLE_LABELS = {
  admin: "Administrator",
  head: "Kafedra mudiri",
  dean: "Dekan",
  teacher: "Tyutor",
  expert: "Ekspert/Tekshiruvchi",
}

const POSITIONS_API_URL = "/api/positions"
const DEPARTMENTS_API_URL = "/api/departments"

function normalizePositions(payload) {
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.items)
        ? payload.items
        : []

  return list
    .map((item, index) => {
      if (typeof item === "string") {
        return { id: item, name: item, departmentId: "", order: index }
      }
      const id = String(item?.id ?? item?.positionId ?? item?.code ?? item?.name ?? index)
      const name = String(item?.name ?? item?.title ?? item?.positionName ?? item?.label ?? "").trim()
      const departmentId = String(item?.departmentId ?? item?.kafedraId ?? item?.department?.id ?? "")
      if (!name) return null
      return { id, name, departmentId, order: index }
    })
    .filter(Boolean)
}

function normalizeDepartments(payload) {
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.items)
        ? payload.items
        : []

  return list
    .map((item, index) => {
      if (typeof item === "string") {
        return { id: item, name: item, facultyId: "", order: index }
      }
      const id = String(item?.id ?? item?.departmentId ?? item?.kafedraId ?? item?.code ?? item?.name ?? index)
      const name = String(item?.name ?? item?.title ?? item?.departmentName ?? item?.kafedraNomi ?? "").trim()
      const facultyId = String(item?.facultyId ?? item?.faculty?.id ?? item?.fakultetId ?? "")
      if (!name) return null
      return { id, name, facultyId, order: index }
    })
    .filter(Boolean)
}

function formatFileSize(size) {
  if (!size) return "-"
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(2)} MB`
}

function getEvaluation(evaluations, teacherId, criterionId) {
  return evaluations[`${teacherId}_${criterionId}`] ?? { score: 0, comment: "", status: "pending", backendStatus: "", scoredBy: "" }
}

function mergeTeacherEvaluations(teacherId, evaluationsByCriterion, prev) {
  const next = { ...prev }
  for (const [criterionId, evalData] of Object.entries(evaluationsByCriterion ?? {})) {
    next[`${teacherId}_${criterionId}`] = evalData
  }
  return next
}

function mapTeachersFromApi(list) {
  return list.map((teacher) => ({
    id: teacher.id,
    fullName: teacher.fio,
    role: "teacher",
    login: teacher.login,
    password: "",
    departmentId: teacher.departmentId,
    department: teacher.kafedra || "",
    facultyName: teacher.fakultet || "",
    positionId: teacher.positionId ?? "",
  }))
}

function findTeacherByLogin(list, login) {
  const normalized = login.trim().toLowerCase()
  return list.find((item) => item.login.trim().toLowerCase() === normalized)
}

function isTeacherAccount(user) {
  if (!user) return false
  if (user.role === "O'qituvchi" || user.role === "Tyutor" || user.role === "teacher") return true
  return Array.isArray(user.roles) && user.roles.some((role) => String(role).toUpperCase() === "TEACHER")
}

function isTeacherUser(user) {
  return isTeacherAccount(user)
}

/**
 * @param {string} loginTrim
 * @param {Awaited<ReturnType<typeof login>>} tokens
 * @param {ReturnType<typeof mapTeachersFromApi>} teacherList
 */
async function resolveLoginIdentity(loginTrim, tokens, teacherList) {
  let matched = findTeacherByLogin(teacherList, loginTrim)
  let updatedTeachers = null

  if (!matched) {
    const list = await fetchAllTeachers()
    const mapped = mapTeachersFromApi(list)
    matched = findTeacherByLogin(mapped, loginTrim)
    if (matched) updatedTeachers = mapped
  }

  const tokenRoles = Array.isArray(tokens.roles) ? tokens.roles : []

  let user = null
  try {
    user = await fetchUserByUsername(loginTrim)
  } catch {
    user = mapUserFromLoginBody(tokens.raw, loginTrim)
  }

  if (!user && tokenRoles.length > 0) {
    user = {
      id: loginTrim,
      fio: loginTrim,
      login: loginTrim,
      izoh: "",
      role: isExpertApiRoles(tokenRoles) ? "Komissiya" : mapApiRoleToUi(tokenRoles[0]),
      roles: tokenRoles,
    }
  }

  return { matched, updatedTeachers, user, tokenRoles }
}

function useCountAnimation(target, duration = 800) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (target === 0) {
      setDisplay(0)
      return
    }
    let frame
    const start = performance.now()
    const animate = (now) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * target))
      if (progress < 1) {
        frame = requestAnimationFrame(animate)
      }
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])

  return display
}

function App() {
  const [activePage, setActivePage] = useState("dashboard")
  const [loginOpen, setLoginOpen] = useState(false)
  const [loginForm, setLoginForm] = useState({ login: "", password: "" })
  const [loginError, setLoginError] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginPasswordVisible, setLoginPasswordVisible] = useState(false)
  const [newTeacherPasswordVisible, setNewTeacherPasswordVisible] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [selectedTeacherId, setSelectedTeacherId] = useState("")
  const [viewingTeacher, setViewingTeacher] = useState(null)
  const [teachers, setTeachers] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [evaluations, setEvaluations] = useState({})
  const [criteriaList, setCriteriaList] = useState(DEFAULT_CRITERIA)
  const [uploadState, setUploadState] = useState({})
  const [teacherDocumentIds, setTeacherDocumentIds] = useState({})
  const [uploadError, setUploadError] = useState("")
  const [evalError, setEvalError] = useState("")
  const [evalSuccess, setEvalSuccess] = useState("")
  const [uploadingCriterionIds, setUploadingCriterionIds] = useState({})
  const [evaluatingCriterionIds, setEvaluatingCriterionIds] = useState({})
  const [pageLoading, setPageLoading] = useState(false)
  const [newTeacherForm, setNewTeacherForm] = useState({
    fullName: "",
    login: "",
    password: "",
    departmentId: "",
    positionId: "",
  })
  const [newTeacherError, setNewTeacherError] = useState("")
  const [departments, setDepartments] = useState([])
  const [departmentsLoading, setDepartmentsLoading] = useState(false)
  const [departmentsError, setDepartmentsError] = useState("")
  const [positions, setPositions] = useState([])
  const [positionsLoading, setPositionsLoading] = useState(false)
  const [positionsError, setPositionsError] = useState("")
  const [teacherLoadError, setTeacherLoadError] = useState("")
  const [teachersLoading, setTeachersLoading] = useState(false)
  const [criteriaLoadError, setCriteriaLoadError] = useState("")
  const [teacherDocsLoading, setTeacherDocsLoading] = useState(false)
  const [authSessionKey, setAuthSessionKey] = useState(0)
  const [teacherResourceInfo, setTeacherResourceInfo] = useState(/** @type {import("./api/teachers").TeacherResourceInfo[]} */ ([]))
  const [resourceInfoLoading, setResourceInfoLoading] = useState(false)
  const [resourceInfoError, setResourceInfoError] = useState("")
  const [documentsScored, setDocumentsScored] = useState(false)
  const [evalDraft, setEvalDraft] = useState({})

  const loadCriteriaFromApi = useCallback(async () => {
    if (!getAccessToken()) {
      setCriteriaLoadError("")
      return
    }
    try {
      const sections = await fetchAllSections()
      const rows = await fetchAllCriterionRows(sections)
      const sectionTitleById = Object.fromEntries(sections.map((section) => [section.id, section.title]))
      const apiCriteria = rows.map((row) => ({
        id: row.id,
        category: row.sectionId ? (sectionTitleById[row.sectionId] ?? "Bo'lim") : "Mezonlar",
        title: row.title,
        maxScore: row.maxScore,
        fileUpload: row.fileUpload !== false,
        requiredDocs: Array.isArray(row.requiredDocs) ? row.requiredDocs : [],
      }))

      if (apiCriteria.length > 0) {
        setCriteriaList(apiCriteria)
      } else if (sections.length > 0) {
        setCriteriaList(
          sections.map((section) => ({
            id: section.id,
            category: section.title,
            title: section.title,
            maxScore: section.maxScore,
            fileUpload: true,
            requiredDocs: [],
          })),
        )
      }
      setCriteriaLoadError("")
    } catch (error) {
      setCriteriaLoadError(error instanceof Error ? error.message : "Mezonlar API dan yuklanmadi")
    }
  }, [])

  const loadTeachersFromApi = useCallback(async () => {
    if (!getAccessToken()) {
      setTeacherLoadError("")
      setTeachersLoading(false)
      return
    }
    setTeachersLoading(true)
    try {
      const list = await fetchAllTeachers()
      setTeachers(mapTeachersFromApi(list))
      setSelectedTeacherId((prev) => prev || list[0]?.id || "")
      setTeacherLoadError("")
    } catch (error) {
      setTeacherLoadError(error instanceof Error ? error.message : "Tyutorlarni yuklab bo'lmadi")
    } finally {
      setTeachersLoading(false)
    }
  }, [])

  const loadDocumentsScoredStatus = useCallback(async () => {
    if (!getAccessToken()) return
    try {
      const scored = await fetchIsDocumentsScored()
      setDocumentsScored(scored)
    } catch {
      setDocumentsScored(false)
    }
  }, [])

  const loadTeacherResourceInfo = useCallback(async () => {
    if (!getAccessToken()) return
    setResourceInfoLoading(true)
    setResourceInfoError("")
    try {
      const info = await fetchTeachersResourceInfo()
      setTeacherResourceInfo(info)
    } catch (error) {
      setResourceInfoError(error instanceof Error ? error.message : "Resurs ma'lumotlarini yuklab bo'lmadi")
    } finally {
      setResourceInfoLoading(false)
    }
  }, [])

  const loadReferenceDataFromApi = useCallback(async () => {
    if (!getAccessToken()) return
    setDepartmentsLoading(true)
    setPositionsLoading(true)
    setDepartmentsError("")
    setPositionsError("")
    try {
      const faculties = await fetchAllFaculties()
      const facultyNames = Object.fromEntries(faculties.map((faculty) => [faculty.id, faculty.nameUz]))
      const departmentRows = await fetchAllDepartments(facultyNames)
      const normalizedDepartments = departmentRows.map((department) => ({
        id: department.id,
        name: department.nameUz,
        facultyId: department.facultyId,
        facultyName: department.fakultet,
        order: 0,
      }))
      if (normalizedDepartments.length > 0) {
        setDepartments(normalizedDepartments)
        setNewTeacherForm((prev) => ({
          ...prev,
          departmentId: prev.departmentId || normalizedDepartments[0].id,
        }))
      }
      const positionRows = await fetchAllPositions()
      setPositions(
        positionRows.map((position, index) => ({
          id: position.id,
          name: position.nameUz,
          departmentId: "",
          order: index,
        })),
      )
    } catch (error) {
      setDepartmentsError(error instanceof Error ? error.message : "Kafedralarni yuklashda xatolik yuz berdi.")
      setPositionsError(error instanceof Error ? error.message : "Lavozimlarni yuklashda xatolik yuz berdi.")
    } finally {
      setDepartmentsLoading(false)
      setPositionsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTeachersFromApi()
    loadReferenceDataFromApi()
  }, [loadTeachersFromApi, loadReferenceDataFromApi, authSessionKey])

  // Komissiya o'qituvchilar sahifasiga o'tganda resource info va scored status yuklanadi
  useEffect(() => {
    if (activePage === "oqituvchilar" && currentUser?.role === "expert") {
      loadTeacherResourceInfo()
      loadDocumentsScoredStatus()
    }
  }, [activePage, currentUser, loadTeacherResourceInfo, loadDocumentsScoredStatus])

  useEffect(() => {
    loadCriteriaFromApi()
  }, [loadCriteriaFromApi, authSessionKey])

  useEffect(() => {
    if (currentUser) return
    const token = getAccessToken()
    const username = getAuthUsername()
    if (!token || !username) return

    let cancelled = false
    const restoreSession = async () => {
      // Har doim API'dan o'qituvchilarni olamiz, chunki teachers state hali bo'sh bo'lishi mumkin
      let matched = null
      try {
        const list = await fetchAllTeachers()
        const mapped = mapTeachersFromApi(list)
        matched = findTeacherByLogin(mapped, username)
        if (!cancelled && mapped.length) setTeachers(mapped)
      } catch {
        // fetchAllTeachers muvaffaqiyatsiz bo'lsa ham session tiklashda davom etamiz
      }

      let tokenRoles = parseRolesFromAccessToken(getAccessToken())
      // JWT dan rollar topilmasa, localStorage'dagi oxirgi rollarni ishlatamiz
      if (tokenRoles.length === 0) {
        tokenRoles = getAuthRoles()
      }

      let user = null
      try {
        user = await fetchUserByUsername(username)
      } catch {
        user = null
      }

      if (!user && tokenRoles.length > 0) {
        user = {
          id: username,
          fio: username,
          login: username,
          izoh: "",
          role: isExpertApiRoles(tokenRoles) ? "Komissiya" : mapApiRoleToUi(tokenRoles[0]),
          roles: tokenRoles,
        }
      }

      if (!canAccessMainApp({ user, matchedTeacher: matched, tokenRoles })) {
        if (!cancelled) setCurrentUser(null)
        return
      }

      const appRole = resolveMainAppRole({ user, matchedTeacher: matched, tokenRoles })
      const restoredUser =
        matched ??
        (user
          ? {
              id: user.id,
              fullName: user.fio,
              role: appRole,
              login: user.login,
              password: "",
              departmentId: "",
              department: "",
              positionId: "",
              roles: user.roles,
            }
          : null)

      if (!restoredUser || cancelled) return

      setCurrentUser(restoredUser)
      if (appRole === "teacher") {
        setSelectedTeacherId(restoredUser.id)
        setActivePage("mezonlar")
      } else if (appRole === "expert") {
        setActivePage("oqituvchilar")
        loadTeacherResourceInfo()
      }
      setAuthSessionKey((key) => key + 1)
    }

    restoreSession()
    return () => {
      cancelled = true
    }
    // teachers dependency'siz — teachers o'zgarishi effectni qayta ishga tushirib,
    // session tiklashni bekor qilmasligi uchun.
  }, [currentUser])

  useEffect(() => {
    if (!loginOpen) setLoginPasswordVisible(false)
  }, [loginOpen])

  // Listen for session-expired events (token genuinely expired during an API call)
  useEffect(() => {
    const handleExpired = () => {
      clearAuthTokens()
      setCurrentUser(null)
      setCriteriaLoadError("")
      setCriteriaList(DEFAULT_CRITERIA)
      setAuthSessionKey((key) => key + 1)
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setPageLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [activePage])

  const handleNavigate = (page) => {
    if (page === activePage) return
    setPageLoading(true)
    setActivePage(page)
    if (page === "oqituvchilar" && currentUser?.role === "expert") {
      loadTeacherResourceInfo()
    }
  }

  const categoryMaxScore = useMemo(
    () =>
      criteriaList.reduce((acc, criterion) => {
        acc[criterion.category] = (acc[criterion.category] ?? 0) + Number(criterion.maxScore || 0)
        return acc
      }, {}),
    [criteriaList],
  )

  const allCategories = useMemo(() => Object.keys(categoryMaxScore), [categoryMaxScore])
  const totalMaxScore = useMemo(
    () => Object.values(categoryMaxScore).reduce((sum, value) => sum + Number(value || 0), 0),
    [categoryMaxScore],
  )

  const roleVisibleCategories = useMemo(
    () => ({
      admin: allCategories,
      dean: allCategories,
      expert: allCategories,
      teacher: allCategories,
      head: ["O'qituvchilik faoliyati", "Metodik ishlar", "Tarbiyaviy faoliyat"],
    }),
    [allCategories],
  )

  useEffect(() => {
    let cancelled = false
    const fetchDepartments = async () => {
      setDepartmentsLoading(true)
      setDepartmentsError("")
      try {
        const response = await fetch(DEPARTMENTS_API_URL)
        if (!response.ok) {
          throw new Error(`API xatosi: ${response.status}`)
        }
        const payload = await response.json()
        const normalized = normalizeDepartments(payload)
        if (normalized.length === 0) {
          throw new Error("Kafedralar topilmadi.")
        }
        if (!cancelled) {
          setDepartments(normalized)
          setNewTeacherForm((prev) => ({
            ...prev,
            departmentId: prev.departmentId || normalized[0].id,
          }))
        }
      } catch (error) {
        if (!cancelled) {
          setDepartments([])
          setDepartmentsError(error instanceof Error ? error.message : "Kafedralarni yuklashda xatolik yuz berdi.")
        }
      } finally {
        if (!cancelled) {
          setDepartmentsLoading(false)
        }
      }
    }
    fetchDepartments()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const selectedDepartmentId = newTeacherForm.departmentId
    if (!selectedDepartmentId) {
      setPositions([])
      setPositionsError("")
      setPositionsLoading(false)
      setNewTeacherForm((prev) => ({ ...prev, positionId: "" }))
      return
    }
    let cancelled = false
    const fetchPositions = async () => {
      setPositionsLoading(true)
      setPositionsError("")
      try {
        const response = await fetch(`${POSITIONS_API_URL}?departmentId=${encodeURIComponent(selectedDepartmentId)}`)
        if (!response.ok) {
          throw new Error(`API xatosi: ${response.status}`)
        }
        const payload = await response.json()
        const normalized = normalizePositions(payload)
        const filtered = normalized.some((item) => item.departmentId)
          ? normalized.filter((item) => item.departmentId === selectedDepartmentId)
          : normalized
        if (filtered.length === 0) {
          throw new Error("Tanlangan kafedra uchun lavozim topilmadi.")
        }
        if (!cancelled) {
          setPositions(filtered)
          setNewTeacherForm((prev) => ({
            ...prev,
            positionId: filtered.some((item) => item.id === prev.positionId) ? prev.positionId : filtered[0].id,
          }))
        }
      } catch (error) {
        if (!cancelled) {
          setPositions([])
          setNewTeacherForm((prev) => ({ ...prev, positionId: "" }))
          setPositionsError(error instanceof Error ? error.message : "Lavozimlarni yuklashda xatolik yuz berdi.")
        }
      } finally {
        if (!cancelled) {
          setPositionsLoading(false)
        }
      }
    }
    fetchPositions()
    return () => {
      cancelled = true
    }
  }, [newTeacherForm.departmentId])

  const managedTeacherId = isTeacherUser(currentUser)
    ? currentUser.id
    : viewingTeacher?.id || selectedTeacherId
  const visibleCategories = currentUser ? roleVisibleCategories[currentUser.role] ?? allCategories : allCategories

  const visibleCriteria = criteriaList.filter((c) => visibleCategories.includes(c.category))

  const categoryScoresForTeacher = (teacherId) => {
    const result = {}
    Object.keys(categoryMaxScore).forEach((cat) => {
      result[cat] = criteriaList.filter((c) => c.category === cat).reduce(
        (sum, criterion) => sum + getEvaluation(evaluations, teacherId, criterion.id).score,
        0
      )
    })
    return result
  }

  const totalScoreForTeacher = (teacherId) =>
    criteriaList.reduce((sum, criterion) => sum + getEvaluation(evaluations, teacherId, criterion.id).score, 0)

  const ranking = useMemo(() => {
    return [...teachers]
      .map((t) => ({ ...t, total: totalScoreForTeacher(t.id) }))
      .sort((a, b) => b.total - a.total)
  }, [teachers, evaluations])

  const activeTeacher =
    viewingTeacher || teachers.find((t) => t.id === managedTeacherId) || null
  const myTotalScore = managedTeacherId ? totalScoreForTeacher(managedTeacherId) : 0
  const myPercent = totalMaxScore > 0 ? Math.round((myTotalScore / totalMaxScore) * 100) : 0
  const myCategoryScores = managedTeacherId ? categoryScoresForTeacher(managedTeacherId) : {}

  const mySubmissions = submissions.filter((s) => s.teacherId === managedTeacherId)
  const recentUploads = [...mySubmissions].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))

  const totalUploadedFiles = mySubmissions.length

  const animatedFileCount = useCountAnimation(totalUploadedFiles)

  const missingDocsCount = managedTeacherId
    ? criteriaList.filter((criterion) => !mySubmissions.some((s) => s.criterionId === criterion.id)).length
    : 0

  const statuses = mySubmissions.reduce(
    (acc, submission) => {
      const status = getEvaluation(evaluations, managedTeacherId, submission.criterionId).status
      acc[status] += 1
      return acc
    },
    { pending: 0, approved: 0, rejected: 0 }
  )

  const handleLogin = async (event) => {
    event.preventDefault()
    const loginTrim = loginForm.login.trim()
    if (!loginTrim) {
      setLoginError("Loginni kiriting.")
      return
    }
    if (!loginForm.password) {
      setLoginError("Parolni kiriting.")
      return
    }

    setLoginLoading(true)
    setLoginError("")
    try {
      const tokens = await login(loginTrim, loginForm.password)
      const { matched, updatedTeachers, user, tokenRoles } = await resolveLoginIdentity(
        loginTrim,
        tokens,
        teachers,
      )

      if (updatedTeachers) setTeachers(updatedTeachers)

      if (!canAccessMainApp({ user, matchedTeacher: matched, tokenRoles })) {
        clearAuthTokens()
        setLoginError("Bu login uchun ruxsat yo'q.")
        return
      }

      setAuthTokens({
        ...tokens,
        username: loginTrim,
        roles: user?.roles ?? tokenRoles,
      })

      const appRole = resolveMainAppRole({ user, matchedTeacher: matched, tokenRoles })
      const appUser =
        matched ??
        (user
          ? {
              id: user.id,
              fullName: user.fio,
              role: appRole,
              login: user.login,
              password: "",
              departmentId: "",
              department: "",
              positionId: "",
              roles: user.roles ?? tokenRoles,
            }
          : null)

      if (!appUser) {
        clearAuthTokens()
        setLoginError("Foydalanuvchi ma'lumotlari topilmadi.")
        return
      }

      setCurrentUser(appUser)
      setAuthSessionKey((key) => key + 1)
      if (appRole === "teacher") {
        setSelectedTeacherId(appUser.id)
        setActivePage("mezonlar")
      } else if (appRole === "expert") {
        setViewingTeacher(null)
        setActivePage("oqituvchilar")
        loadTeacherResourceInfo()
      } else {
        setActivePage("dashboard")
      }
      setLoginOpen(false)
      setLoginForm({ login: "", password: "" })
    } catch (error) {
      clearAuthTokens()
      setLoginError(error instanceof Error ? error.message : "Login yoki parol noto'g'ri.")
    } finally {
      setLoginLoading(false)
    }
  }

  const canEvaluate = currentUser && ["admin", "head", "dean", "expert"].includes(currentUser.role)

  const createTeacherAccount = async (event) => {
    event.preventDefault()
    if (!currentUser || currentUser.role !== "admin") return
    const fullName = newTeacherForm.fullName.trim()
    const login = newTeacherForm.login.trim()
    const password = newTeacherForm.password
    const departmentId = newTeacherForm.departmentId.trim()
    const positionId = newTeacherForm.positionId.trim()
    const department = departments.find((item) => item.id === departmentId)
    if (!fullName || !login || !password || !departmentId || !positionId) {
      setNewTeacherError("Ism, login, parol, kafedra va lavozimni to'ldiring.")
      return
    }
    if (!department) {
      setNewTeacherError("Kafedra topilmadi. Qayta tanlang.")
      return
    }
    const loginUsed = teachers.some((u) => u.login.toLowerCase() === login.toLowerCase())
    if (loginUsed) {
      setNewTeacherError("Bu login band. Boshqa login tanlang.")
      return
    }
    try {
      const created = await saveTeacher({
        fio: fullName,
        login,
        password,
        facultyId: department.facultyId || "",
        departmentId,
        positionId,
      })
      const newTeacher = {
        id: created.id,
        fullName: created.fio,
        role: "teacher",
        login: created.login,
        password: "",
        departmentId: created.departmentId,
        department: created.kafedra || department.name,
        positionId: created.positionId ?? positionId,
      }
      setTeachers((prev) => [newTeacher, ...prev])
      setSelectedTeacherId(newTeacher.id)
      setNewTeacherForm({ fullName: "", login: "", password: "", departmentId, positionId })
      setNewTeacherError("")
    } catch (error) {
      setNewTeacherError(error instanceof Error ? error.message : "Tyutorni saqlab bo'lmadi.")
    }
  }

  const handleUploadChange = (criterionId, field, value) => {
    setUploadState((prev) => ({
      ...prev,
      [criterionId]: { ...(prev[criterionId] ?? { type: "file", link: "", comment: "" }), [field]: value },
    }))
  }

  const submitCriterionFile = async (criterionId) => {
    if (!currentUser || !isTeacherUser(currentUser)) return
    const state = uploadState[criterionId] ?? { type: "file", link: "", comment: "" }
    const evidenceType = state.type || "file"
    const teacherDocumentId = teacherDocumentIds[criterionId]
    if (!teacherDocumentId) {
      setUploadError("Ushbu mezon uchun hujjat identifikatori topilmadi. Sahifani yangilab qayta urinib ko'ring.")
      return
    }

    if (evidenceType === "file" && !state.file) return
    if (evidenceType !== "file" && !state.link?.trim()) return

    setUploadError("")
    setUploadingCriterionIds((prev) => ({ ...prev, [criterionId]: true }))
    try {
      const saved = await saveTeacherDocument({
        teacherDocumentId,
        teacherId: currentUser.id,
        criterionId,
        evidenceType,
        file: evidenceType === "file" ? state.file : undefined,
        url: evidenceType !== "file" ? state.link.trim() : undefined,
        comment: state.comment?.trim() || "",
      })
      setSubmissions((prev) => [saved, ...prev])
      setUploadState((prev) => ({ ...prev, [criterionId]: { type: "file", link: "", comment: "" } }))
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Hujjatni yuklab bo'lmadi.")
    } finally {
      setUploadingCriterionIds((prev) => ({ ...prev, [criterionId]: false }))
    }
  }

  useEffect(() => {
    if (!currentUser || !isTeacherUser(currentUser)) return
    const loadDocs = async () => {
      try {
        const { submissions: list, documentIdByCriterion, evaluationsByCriterion } =
          await fetchTeacherDocuments(currentUser.id)
        setTeacherDocumentIds(documentIdByCriterion)
        setSubmissions((prev) => [...list, ...prev.filter((p) => p.teacherId !== currentUser.id)])
        setEvaluations((prev) => mergeTeacherEvaluations(currentUser.id, evaluationsByCriterion, prev))
      } catch {
        // API xatoligida local holat saqlanadi
      }
    }
    loadDocs()
  }, [currentUser])

  // Load documents for selected teacher when expert/admin/dean/head views a teacher
  useEffect(() => {
    if (!currentUser || isTeacherUser(currentUser)) return
    const teacherId = viewingTeacher?.id || selectedTeacherId
    if (!teacherId || !getAccessToken()) return
    let cancelled = false
    const loadDocs = async () => {
      setTeacherDocsLoading(true)
      try {
        const { submissions: list, documentIdByCriterion, evaluationsByCriterion } =
          await fetchTeacherDocuments(teacherId)
        if (cancelled) return
        setTeacherDocumentIds((prev) => ({ ...prev, ...documentIdByCriterion }))
        setSubmissions((prev) => {
          const others = prev.filter((p) => p.teacherId !== teacherId)
          return [...list, ...others]
        })
        setEvaluations((prev) => mergeTeacherEvaluations(teacherId, evaluationsByCriterion, prev))
      } catch {
        if (!cancelled) {
          setSubmissions((prev) => prev.filter((p) => p.teacherId !== teacherId))
        }
      } finally {
        if (!cancelled) setTeacherDocsLoading(false)
      }
    }
    loadDocs()
    return () => {
      cancelled = true
    }
  }, [selectedTeacherId, currentUser, viewingTeacher, authSessionKey])

  const deleteSubmission = async (submissionId) => {
    try {
      await deleteTeacherResource(submissionId)
    } catch {
      // Agar API orqali o'chirishda xatolik bo'lsa ham UI dan olib tashlaymiz
    }
    setSubmissions((prev) => prev.filter((s) => s.id !== submissionId))
  }

  const updateEvalDraft = (teacherId, criterionId, field, value) => {
    const key = `${teacherId}_${criterionId}`
    setEvalDraft((prev) => {
      const saved = getEvaluation(evaluations, teacherId, criterionId)
      const base = prev[key] ?? {
        score: String(saved.score ?? ""),
        comment: saved.comment || "",
      }
      return { ...prev, [key]: { ...base, [field]: value } }
    })
  }

  const submitCriterionEvaluation = async (teacherId, criterionId) => {
    const criterion = criteriaList.find((c) => c.id === criterionId)
    if (!criterion) return
    const key = `${teacherId}_${criterionId}`
    const saved = getEvaluation(evaluations, teacherId, criterionId)
    const draft = evalDraft[key] ?? {
      score: saved.score > 0 ? String(saved.score) : "",
      comment: saved.comment || "",
    }
    const trimmed = String(draft.score).trim()
    if (trimmed === "" || Number.isNaN(Number(trimmed))) {
      setEvalError("Ball qiymatini kiriting!")
      return
    }

    const score = Math.max(0, Math.min(criterion.maxScore, Number(trimmed)))
    const comment = String(draft.comment || "").trim()
    const teacherDocumentId = teacherDocumentIds[criterionId]

    if (!teacherDocumentId) {
      setEvalError("Ushbu mezon uchun hujjat topilmadi. Sahifani yangilab qayta urinib ko'ring.")
      return
    }

    setEvalError("")
    setEvalSuccess("")
    setEvaluatingCriterionIds((prev) => ({ ...prev, [criterionId]: true }))
    try {
      const evaluatorName = currentUser?.fullName ?? currentUser?.fio ?? ""
      await setDocumentBall({
        documentId: teacherDocumentId,
        ball: score,
        comment,
        scoredBy: evaluatorName,
      })
      setEvaluations((prev) => ({
        ...prev,
        [key]: { score, comment, status: "approved", scoredBy: evaluatorName },
      }))
      setEvalDraft((prev) => ({
        ...prev,
        [key]: { score: String(score), comment },
      }))
      setEvalSuccess("✅ Muvaffaqiyatli baholandi")
      setTimeout(() => setEvalSuccess(""), 3000)
    } catch (error) {
      setEvalError(error instanceof Error ? error.message : "Ball saqlanmadi.")
    } finally {
      setEvaluatingCriterionIds((prev) => ({ ...prev, [criterionId]: false }))
    }
  }

  const renderDashboard = () => (
    <section className="space-y-6">
      <header className="rounded-3xl bg-gradient-to-r from-indigo-600 to-violet-600 p-8 text-center text-white shadow-xl">
        <p className="text-sm uppercase tracking-wider text-indigo-100">Statistika</p>
        <h1 className="mt-2 text-3xl font-bold">Nizom monitoring platformasi</h1>
        <p className="mx-auto mt-2 max-w-3xl text-indigo-50">
          Jami 110 ball bo'yicha progress, hujjatlar holati{isTeacherUser(currentUser) ? "." : " va reyting."}
        </p>
      </header>

      {isTeacherUser(currentUser) && activePage === "dashboard" && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
          Hujjat yuklash uchun yuqoridagi{" "}
          <button
            type="button"
            onClick={() => setActivePage("mezonlar")}
            className="font-semibold underline underline-offset-2"
          >
            Mezonlar
          </button>{" "}
          bo'limiga o'ting.
        </div>
      )}

      {currentUser && (
        <>
          {!isTeacherUser(currentUser) && currentUser?.role !== "expert" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <label className="text-sm font-medium text-slate-700">Tyutorni tanlang</label>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.fullName}
                  </option>
                ))}
              </select>
            </div>
          )}


          {currentUser?.role !== "expert" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-2 text-sm font-medium text-slate-600">
              Ko'rsatkich ({activeTeacher?.fullName})
            </p>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
              <div className="h-full bg-indigo-600" style={{ width: `${myPercent}%` }} />
            </div>
          </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Bo'limlar bo'yicha grafik</h3>
              <div className="mt-3 space-y-3">
                {Object.entries(categoryMaxScore).map(([category, max]) => {
                  const score = myCategoryScores[category] ?? 0
                  const percent = Math.round((score / max) * 100)
                  return (
                    <div key={category}>
                      <div className="mb-1 flex justify-between text-xs text-slate-600">
                        <span>{category}</span>
                        <span>{score}/{max}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full bg-violet-600" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </article>

            {!isTeacherUser(currentUser) ? (
              currentUser?.role === "expert" ? (
                <Rating />
              ) : (
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900">Reyting</h3>
                  <div className="mt-3 max-h-96 space-y-2 overflow-y-auto">
                    {ranking.map((item, index) => (
                      <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-sm text-slate-700">
                          {index + 1}. {item.fullName}
                        </p>
                        <p className="text-sm font-bold text-indigo-700">{item.total} ball</p>
                      </div>
                    ))}
                  </div>
                </article>
              )
            ) : (
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Oxirgi yuklangan fayllar</h3>
                <div className="mt-3 max-h-60 space-y-2 overflow-y-auto">
                  {recentUploads.map((upload) => {
                    const criterion = criteriaList.find((c) => c.id === upload.criterionId)
                    return (
                      <div key={upload.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                        <p className="font-medium text-slate-800">{upload.fileName}</p>
                        <p className="text-slate-500">{criterion?.title}</p>
                      </div>
                    )
                  })}
                  {recentUploads.length === 0 && (
                    <p className="text-sm text-slate-500">Hozircha yuklangan fayl yo'q.</p>
                  )}
                </div>
              </article>
            )}
          </div>

          {isTeacherUser(currentUser) && (
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Qo'shilgan bo'lim va mezonlar</h3>
              <div className="mt-3 space-y-4">
                {Object.entries(
                  visibleCriteria.reduce((acc, item) => {
                    if (!acc[item.category]) acc[item.category] = []
                    acc[item.category].push(item)
                    return acc
                  }, {}),
                ).map(([category, items]) => (
                  <div key={category} className="rounded-xl bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-slate-800">{category}</p>
                    <div className="mt-2 space-y-1">
                      {items.map((item, idx) => (
                        <p key={item.id} className="text-sm text-slate-600">
                          {idx + 1}. {item.title} ({item.maxScore} ball)
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
                {visibleCriteria.length === 0 && (
                  <p className="text-sm text-slate-500">Hozircha qo'shilgan bo'lim/mezon topilmadi.</p>
                )}
              </div>
            </article>
          )}

          {currentUser?.role !== "teacher" && currentUser?.role !== "expert" && (
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Oxirgi yuklangan fayllar</h3>
              <div className="mt-3 max-h-60 space-y-2 overflow-y-auto">
                {recentUploads.map((upload) => {
                  const criterion = criteriaList.find((c) => c.id === upload.criterionId)
                  return (
                    <div key={upload.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <p className="font-medium text-slate-800">{upload.fileName}</p>
                      <p className="text-slate-500">{criterion?.title}</p>
                    </div>
                  )
                })}
                {recentUploads.length === 0 && (
                  <p className="text-sm text-slate-500">Hozircha yuklangan fayl yo'q.</p>
                )}
              </div>
            </article>
          )}

          {currentUser?.role === "admin" && (
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Tyutor login/parolini berish</h3>
              <form onSubmit={createTeacherAccount} className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Kafedra</span>
                  <select
                    value={newTeacherForm.departmentId}
                    onChange={(e) =>
                      setNewTeacherForm((prev) => ({ ...prev, departmentId: e.target.value, positionId: "" }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    disabled={departmentsLoading || departments.length === 0}
                  >
                    {departmentsLoading && <option value="">Kafedralar yuklanmoqda...</option>}
                    {!departmentsLoading && departments.length === 0 && <option value="">Kafedra topilmadi</option>}
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Lavozim</span>
                  <select
                    value={newTeacherForm.positionId}
                    onChange={(e) => setNewTeacherForm((prev) => ({ ...prev, positionId: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    disabled={!newTeacherForm.departmentId || positionsLoading || positions.length === 0}
                  >
                    {!newTeacherForm.departmentId && <option value="">Avval kafedrani tanlang</option>}
                    {newTeacherForm.departmentId && positionsLoading && <option value="">Lavozimlar yuklanmoqda...</option>}
                    {newTeacherForm.departmentId && !positionsLoading && positions.length === 0 && (
                      <option value="">Lavozim topilmadi</option>
                    )}
                    {positions.map((position) => (
                      <option key={position.id} value={position.id}>
                        {position.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm md:col-span-2">
                  <span className="mb-1 block font-medium text-slate-700">F.I.O</span>
                  <input
                    value={newTeacherForm.fullName}
                    onChange={(e) => setNewTeacherForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Tyutor F.I.O"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Login</span>
                  <input
                    value={newTeacherForm.login}
                    onChange={(e) => setNewTeacherForm((prev) => ({ ...prev, login: e.target.value }))}
                    placeholder="Login"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Parol</span>
                  <div className="relative">
                    <input
                      type={newTeacherPasswordVisible ? "text" : "password"}
                      value={newTeacherForm.password}
                      onChange={(e) => setNewTeacherForm((prev) => ({ ...prev, password: e.target.value }))}
                      placeholder="Parol"
                      className="w-full rounded-lg border border-slate-300 py-2 pl-3 pr-10 text-sm"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setNewTeacherPasswordVisible((v) => !v)}
                      aria-label={newTeacherPasswordVisible ? "Parolni yashirish" : "Parolni ko'rsatish"}
                      className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    >
                      {newTeacherPasswordVisible ? <EyeOff className="h-4 w-4" strokeWidth={1.5} aria-hidden /> : <Eye className="h-4 w-4" strokeWidth={1.5} aria-hidden />}
                    </button>
                  </div>
                </label>
                <button
                  type="submit"
                  disabled={
                    departmentsLoading ||
                    departments.length === 0 ||
                    !newTeacherForm.departmentId ||
                    positionsLoading ||
                    positions.length === 0
                  }
                  className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white md:col-span-2"
                >
                  Tyutorni qo'shish
                </button>
              </form>
              {departmentsError && (
                <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700 ring-1 ring-amber-100">
                  Kafedralarni API dan olishda xatolik: {departmentsError}
                </p>
              )}
              {positionsError && (
                <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700 ring-1 ring-amber-100">
                  Lavozimlarni API dan olishda xatolik: {positionsError}
                </p>
              )}
              {newTeacherError && (
                <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-100">
                  {newTeacherError}
                </p>
              )}
              {teacherLoadError && (
                <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700 ring-1 ring-amber-100">
                  Tyutorlarni API dan olishda xatolik: {teacherLoadError}
                </p>
              )}
            </article>
          )}
        </>
      )}
    </section>
  )

  return (
    <main className="relative flex min-h-screen flex-col text-slate-800">
      <div
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        aria-hidden
      >
        <video
          className="absolute left-1/2 top-1/2 min-h-full min-w-full -translate-x-1/2 -translate-y-1/2 object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          src={bgVideo}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/80 via-slate-900/60 to-indigo-950/75" />
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <Navbar
          activePage={activePage}
          onNavigate={handleNavigate}
          currentUser={currentUser}
          logoSrc={logoImg}
          logoAlt="Urganch DPI logo"
          userRoleLabel={currentUser ? ROLE_LABELS[currentUser.role] : ""}
          onLogout={() => {
            clearAuthTokens()
            setCurrentUser(null)
            setCriteriaLoadError("")
            setCriteriaList(DEFAULT_CRITERIA)
            setAuthSessionKey((key) => key + 1)
          }}
          onOpenLogin={() => setLoginOpen(true)}
        />
        <div
          className={`mx-auto flex w-full flex-1 flex-col pb-6 pt-[calc(4.25rem+1rem)] sm:pt-[calc(4.75rem+1rem)] ${
            activePage === "oqituvchilar" ? "px-0" : "max-w-7xl px-4 sm:px-6 lg:px-8"
          }`}
        >
        {!currentUser ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-4 sm:py-8">
            <section className="relative mx-auto flex w-full max-w-5xl flex-col items-center justify-center overflow-hidden rounded-3xl border border-white/20 bg-slate-900/60 p-6 shadow-2xl shadow-indigo-950/50 backdrop-blur-xl sm:p-10 md:p-12">
              <HomeHeroBrand onOpenLogin={() => setLoginOpen(true)} />
            </section>
          </div>
        ) : activePage === "dashboard" ? (
          renderDashboard()
        ) : activePage === "oqituvchilar" ? (
          <TeacherPage
            teachers={teachers}
            ranking={ranking}
            positions={positions}
            departments={departments}
            submissions={submissions}
            loading={teachersLoading}
            loadError={teacherLoadError}
            teacherResourceInfo={teacherResourceInfo}
            resourceInfoLoading={resourceInfoLoading}
            resourceInfoError={resourceInfoError}
            documentsScored={documentsScored}
            onSelectTeacher={(teacher) => {
              setViewingTeacher(teacher)
              setSelectedTeacherId(teacher.id)
              setActivePage("mezonlar")
            }}
          />
        ) : (
          <section className="space-y-6">
            <header className="rounded-3xl bg-gradient-to-r from-indigo-600 to-violet-600 p-8 text-center text-white shadow-xl">
              <h1 className="text-3xl font-bold">Mezonlar bo'limi</h1>
              <p className="mx-auto mt-2 max-w-3xl text-indigo-100">
                Har bir mezon uchun tavsif, maksimal ball, kerakli hujjatlar, yuklash va ekspert izohi.
              </p>
            </header>
            {criteriaLoadError && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Mezonlarni API dan olishda xatolik: {criteriaLoadError}
              </p>
            )}
            {teacherLoadError && currentUser.role !== "teacher" && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                {teacherLoadError}
              </p>
            )}
            {teacherDocsLoading && !isTeacherUser(currentUser) && activeTeacher && (
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {activeTeacher.fullName} uchun yuklangan hujjatlar yuklanmoqda...
              </p>
            )}

            {visibleCriteria.length === 0 && !criteriaLoadError && (
              <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                {getAccessToken()
                  ? "Hozircha mezon ko'rinmayapti. Admin panelda (/admin) avval bo'lim va mezon qo'shing."
                  : "Mezonlarni ko'rish uchun tizimga kiring (admin panelda yaratilgan login va parol)."}
              </p>
            )}

            {!isTeacherUser(currentUser) && activeTeacher && (
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                  Baholanayotgan tyutor
                </p>
                <p className="mt-1 text-lg font-bold text-slate-900">{activeTeacher.fullName}</p>
                <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-slate-600">
                  {(activeTeacher.faculty || activeTeacher.facultyName) && (
                    <span>Fakultet: {activeTeacher.faculty || activeTeacher.facultyName}</span>
                  )}
                  {(activeTeacher.department ||
                    departments.find((d) => d.id === activeTeacher.departmentId)?.name) && (
                    <span>
                      Kafedra:{" "}
                      {activeTeacher.department ||
                        departments.find((d) => d.id === activeTeacher.departmentId)?.name}
                    </span>
                  )}
                  {(activeTeacher.positionName ||
                    positions.find((p) => p.id === activeTeacher.positionId)?.name) && (
                    <span>
                      Lavozim:{" "}
                      {activeTeacher.positionName ||
                        positions.find((p) => p.id === activeTeacher.positionId)?.name}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setViewingTeacher(null)
                    setActivePage("oqituvchilar")
                  }}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg border border-indigo-300 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-50"
                >
                  <ArrowLeft className="h-4 w-4" strokeWidth={2} />
                  Tyutorlar ro'yxatiga qaytish
                </button>
              </div>
            )}

            {uploadError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {uploadError}
              </div>
            ) : null}
            {evalSuccess ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {evalSuccess}
              </div>
            ) : null}
            {evalError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {evalError}
              </div>
            ) : null}

            {visibleCriteria.map((criterion) => {
              const evalData = getEvaluation(evaluations, managedTeacherId, criterion.id)
              const evalDraftKey = `${managedTeacherId}_${criterion.id}`
              const evalForm = evalDraft[evalDraftKey] ?? {
                score: evalData.score > 0 ? String(evalData.score) : "",
                comment: evalData.comment || "",
              }
              const criterionSubmissions = submissions.filter(
                (s) => s.teacherId === managedTeacherId && s.criterionId === criterion.id
              )
              const uploadModel = uploadState[criterion.id] ?? { type: "file", link: "", comment: "" }
              return (
                <article key={criterion.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                      {criterion.category}
                    </p>
                    <p className="text-sm font-semibold text-slate-700">
                      Maksimal ball: {criterion.maxScore}
                    </p>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-slate-900">{criterion.title}</h3>

                  <div className="mt-3 rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase text-slate-500">Kerakli hujjatlar</p>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      {criterion.requiredDocs.map((doc) => (
                        <span key={doc} className="rounded-full bg-white px-3 py-1 text-xs text-slate-700">
                          {doc}
                        </span>
                      ))}
                    </div>
                  </div>

                  {isTeacherUser(currentUser) && evalData.backendStatus === "SCORED" && (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
                      <p className="text-sm font-medium text-emerald-700">
                        ✅ Bu mezon baxolangan — hujjat <span className="text-red-600 font-semibold">Yuklash</span> va <span className="text-red-600 font-semibold">O'chirish</span> mumkin emas! 
                      </p>
                    </div>
                  )}

                  {isTeacherUser(currentUser) && evalData.backendStatus !== "SCORED" && (
                    <div className="mt-4 rounded-xl border border-slate-200 p-3">
                      <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-4">
                        <div>
                          <p className="mb-1 text-center text-xs font-semibold text-slate-700">Hujjat turi</p>
                          <select
                            value={uploadModel.type}
                            onChange={(e) => handleUploadChange(criterion.id, "type", e.target.value)}
                            className="min-h-12 min-w-0 w-full rounded-lg border border-slate-300 px-2 py-3 text-center text-xs"
                          >
                            <option value="file">PDF/DOCX/JPG/PNG</option>
                            <option value="link">Link</option>
                            <option value="video">Video link</option>
                          </select>
                        </div>

                        <div>
                          <p className="mb-1 text-center text-xs font-semibold text-slate-700">Hujjat yuklash</p>
                          {uploadModel.type === "file" ? (
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                              onChange={(e) => handleUploadChange(criterion.id, "file", e.target.files?.[0])}
                              className="min-h-12 min-w-0 w-full rounded-lg border border-slate-300 px-2 py-2.5 text-center text-xs file:mx-auto file:rounded file:border-0 file:bg-indigo-100 file:px-2 file:py-1.5 file:text-[11px] file:text-indigo-700"
                            />
                          ) : (
                            <input
                              value={uploadModel.link || ""}
                              onChange={(e) => handleUploadChange(criterion.id, "link", e.target.value)}
                              placeholder={uploadModel.type === "video" ? "Video URL" : "URL"}
                              className="min-h-12 min-w-0 w-full rounded-lg border border-slate-300 px-2 py-3 text-center text-xs"
                            />
                          )}
                        </div>

                        <div>
                          <p className="mb-1 text-center text-xs font-semibold text-slate-700">Hujjat izohi</p>
                          <input
                            value={uploadModel.comment || ""}
                            onChange={(e) => handleUploadChange(criterion.id, "comment", e.target.value)}
                            placeholder="Izoh yozing..."
                            className="min-h-12 min-w-0 w-full rounded-lg border border-slate-300 px-2 py-3 text-center text-xs"
                          />
                        </div>

                        <div>
                          <p className="mb-1 text-center text-xs font-semibold text-transparent">.</p>
                          <button
                            onClick={() => submitCriterionFile(criterion.id)}
                            disabled={uploadingCriterionIds[criterion.id]}
                            className="min-h-12 min-w-0 w-full cursor-pointer rounded-lg bg-indigo-600 px-2 py-3 text-center text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {uploadingCriterionIds[criterion.id]
                              ? "Kuting..."
                              : uploadModel.type === "file"
                                ? "Yuklash"
                                : "Yuborish"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {!isTeacherUser(currentUser) && criterionSubmissions.length > 0 && (
                    <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Yuklangan hujjatlar ({criterionSubmissions.length})
                    </p>
                  )}

                  <div className="mt-4 space-y-2">
                    {criterionSubmissions.map((submission) => (
                      <div key={submission.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="min-w-0 break-all font-medium text-slate-800">{submission.fileName}</p>
                          <p className="shrink-0 text-xs text-slate-500">{formatFileSize(submission.fileSize)}</p>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {(submission.fileDataUrl || (submission.evidenceType === "file" && submission.fileName)) ? (
                            <>
                              <a
                                className="inline-flex items-center rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
                                href={
                                  submission.fileDataUrl ||
                                  submission.url ||
                                  getFileDownloadUrl(submission.fileName)
                                }
                                target="_blank"
                                rel="noreferrer"
                              >
                                <Eye className="mr-1 h-3.5 w-3.5" />
                                Ochish
                              </a>
                              <a
                                className="inline-flex items-center rounded-md border border-indigo-300 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-50"
                                href={
                                  submission.fileDataUrl ||
                                  submission.url ||
                                  getFileDownloadUrl(submission.fileName)
                                }
                                download={submission.fileName}
                              >
                                <Download className="mr-1 h-3.5 w-3.5" />
                                Yuklab olish
                              </a>
                            </>
                          ) : null}
                          {submission.url && submission.evidenceType !== "file" && (
                            <a
                              className="inline-flex items-center rounded-md border border-indigo-300 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-50"
                              href={submission.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Havola
                            </a>
                          )}
                          {isTeacherUser(currentUser) && (
                            <button
                              onClick={() => deleteSubmission(submission.id)}
                              className="inline-flex items-center rounded-md border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                            >
                              <Trash2 className="mr-1 h-3.5 w-3.5" />
                              O'chirish
                            </button>
                          )}
                        </div>
                        {submission.comment && (
                          <p className="mt-3 break-words text-base text-slate-600">
                            <MessageSquareText className="mr-1.5 inline h-4 w-4 text-slate-500" />
                            <span className="font-semibold text-slate-700">Izoh:</span> {submission.comment}
                          </p>
                        )}
                      </div>
                    ))}
                    {criterionSubmissions.length === 0 && (
                      <p className="text-sm text-slate-500">Bu mezon uchun yuklangan hujjat yo'q.</p>
                    )}
                  </div>

                  <div className="mt-4 rounded-xl bg-emerald-50 p-3">
                    <p className="text-sm font-semibold text-emerald-900">
                      Ekspert izohi
                      {evalData.scoredBy ? ` (${evalData.scoredBy})` : ""}
                    </p>
                    {canEvaluate ? (
                      <div className="mt-2 space-y-2">
                        <div className="flex flex-wrap items-end gap-2">
                          <label className="min-w-[7rem] flex-1 sm:max-w-[10rem]">
                            <span className="mb-1 block text-xs font-medium text-emerald-800">
                              Ball (max {criterion.maxScore})
                            </span>
                            <input
                              type="number"
                              min="0"
                              max={criterion.maxScore}
                              step="1"
                              value={evalForm.score}
                              onChange={(e) => {
                                const raw = e.target.value
                                if (raw === "") {
                                  updateEvalDraft(managedTeacherId, criterion.id, "score", "")
                                  return
                                }
                                const num = Number(raw)
                                if (!Number.isNaN(num)) {
                                  updateEvalDraft(managedTeacherId, criterion.id, "score", String(Math.min(num, criterion.maxScore)))
                                }
                              }}
                              placeholder="0"
                              className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => submitCriterionEvaluation(managedTeacherId, criterion.id)}
                            disabled={evaluatingCriterionIds[criterion.id]}
                            className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {evaluatingCriterionIds[criterion.id] ? "Saqlanmoqda..." : "Baxolash"}
                          </button>
                        </div>
                        <input
                          value={evalForm.comment}
                          onChange={(e) =>
                            updateEvalDraft(managedTeacherId, criterion.id, "comment", e.target.value)
                          }
                          placeholder="Izoh yozing..."
                          className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                    ) : (
                      <div className="mt-2 space-y-1 text-sm text-emerald-800">
                        <p>
                          <span className="font-semibold">Ball:</span> {evalData.score}
                        </p>
                        <p>{evalData.comment || "Hozircha izoh yo'q."}</p>
                      </div>
                    )}
                  </div>
                </article>
              )
            })}
          </section>
        )}
        </div>

        <Footer />
      </div>

      {loginOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto overscroll-contain bg-transparent p-4"
          role="presentation"
          onClick={() => setLoginOpen(false)}
        >
          <div
            className="relative w-full max-w-[420px] rounded-2xl bg-white px-8 pb-8 pt-10 shadow-xl shadow-black/20 ring-1 ring-slate-200/90"
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-dialog-title"  
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLoginOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              aria-label="Yopish"
            >
              <X className="h-5 w-5" strokeWidth={1.5} aria-hidden />
            </button>

            <div className="flex flex-col items-center text-center">
              <img
                src={logoImg}
                alt=""
                className="h-[88px] w-[88px] rounded-full border border-slate-200 object-cover shadow-sm"
              />
              <h2 id="login-dialog-title" className="mt-5 text-2xl font-bold tracking-tight text-slate-900">
                Tizimga Kirish
              </h2>
            </div>

            <form className="mt-8 space-y-5" onSubmit={handleLogin}>
              <div className="space-y-1.5 text-left">
                <label htmlFor="login-field" className="block text-sm font-bold text-slate-900">
                  Login
                </label>
                <input
                  id="login-field"
                  autoComplete="username"
                  value={loginForm.login}
                  onChange={(e) => setLoginForm((prev) => ({ ...prev, login: e.target.value }))}
                  placeholder="Loginni kiriting"
                  className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none ring-blue-500/0 transition-shadow focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="space-y-1.5 text-left">
                <label htmlFor="password-field" className="block text-sm font-bold text-slate-900">
                  Parol
                </label>
                <div className="relative">
                  <input
                    id="password-field"
                    autoComplete="current-password"
                    type={loginPasswordVisible ? "text" : "password"}
                    value={loginForm.password}
                    onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder="Parolni kiriting"
                    className="w-full rounded-md border border-slate-300 py-2.5 pl-3 pr-11 text-sm text-slate-900 placeholder:text-slate-400 outline-none ring-blue-500/0 transition-shadow focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setLoginPasswordVisible((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    aria-label={loginPasswordVisible ? "Parolni yashirish" : "Parolni ko'rsatish"}
                  >
                    {loginPasswordVisible ? (
                      <EyeOff className="h-5 w-5" strokeWidth={1.5} aria-hidden />
                    ) : (
                      <Eye className="h-5 w-5" strokeWidth={1.5} aria-hidden />
                    )}
                  </button>
                </div>
              </div>
              {loginError && (
                <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-100">{loginError}</p>
              )}
              <button
                type="submit"
                disabled={loginLoading}
                className="mt-2 w-full rounded-md bg-blue-600 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loginLoading ? "Tekshirilmoqda..." : "Kirish"}
              </button>
            </form>
          </div>
        </div>
      )}
        {(pageLoading || resourceInfoLoading) && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-10 py-8 shadow-2xl">
              <Commet color="#4f46e5" size="medium" text="Kuting..." textColor="#0a4ff2" />
            </div>
          </div>
        )}
    </main>
  )
}

export default App