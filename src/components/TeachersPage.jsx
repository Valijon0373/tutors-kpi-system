import { useEffect, useMemo, useState } from "react"
import { Download, Eye, Search, SlidersHorizontal, TrendingUp } from "lucide-react"
import { Commet } from "react-loading-indicators"
import { downloadTeachersResourceInfoExcel } from "../api/teachers"

function useCountUp(from, to, duration = 800) {
  const [value, setValue] = useState(from)

  useEffect(() => {
    if (to === 0) {
      setValue(0)
      return
    }
    let frame
    const start = performance.now()
    const animate = (now) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * to))
      if (progress < 1) {
        frame = requestAnimationFrame(animate)
      }
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [to, duration])

  return value
}

export default function TeacherPage({
  teachers,
  ranking,
  positions,
  departments,
  submissions = [],
  loading = false,
  loadError = "",
  onSelectTeacher,
  /** @type {import("../api/teachers").TeacherResourceInfo[]} */
  teacherResourceInfo = [],
  resourceInfoLoading = false,
  resourceInfoError = "",
  documentsScored = false,
}) {
  const [searchDraft, setSearchDraft] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [facultyFilter, setFacultyFilter] = useState("all")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [openActionsFor, setOpenActionsFor] = useState(null)
  const [excelLoading, setExcelLoading] = useState(false)

  // teacherId bo'yicha teacher obyektini topish (amallar uchun)
  const teacherById = useMemo(() => {
    const map = {}
    for (const t of teachers) {
      map[t.id] = t
    }
    return map
  }, [teachers])

  // teacherResourceInfo asosiy ma'lumot manbai
  const hasResourceInfo = teacherResourceInfo.length > 0

  // Agar resource info mavjud bo'lsa, undan jadval qatorlarini yasaymiz
  // Aks holda eski teachers/ranking dan foydalanamiz
  const rows = useMemo(() => {
    if (hasResourceInfo) {
      return teacherResourceInfo.map((info, idx) => ({
        key: info.teacherId || `resource-${idx}`,
        teacherId: info.teacherId,
        facultyName: info.facultyName || "-",
        departmentName: info.departmentName || "-",
        positionName: info.positionName || "-",
        fullName: info.teacherName || "-",
        scoredBall: info.scoredBall,
        totalBall: info.totalBall,
        resourceCount: info.resourceCount,
        teacher: teacherById[info.teacherId] || null,
      }))
    }
    // fallback: eski teachers ro'yxati
    return ranking.map((teacher) => ({
      key: teacher.id,
      teacherId: teacher.id,
      facultyName: getTeacherFaculty(teacher, departments),
      departmentName: getTeacherDepartment(teacher, departments),
      positionName: getTeacherPosition(teacher, positions),
      fullName: teacher.fullName,
      scoredBall: 0,
      totalBall: 0,
      resourceCount: submissions.filter((s) => s.teacherId === teacher.id).length,
      teacher,
      total: teacher.total,
    }))
  }, [hasResourceInfo, teacherResourceInfo, ranking, teachers, departments, positions, submissions])

  // resource info mavjud bo'lsa, umumiy o'qituvchilar soni resource info uzunligi
  const totalTeachers = hasResourceInfo ? teacherResourceInfo.length : teachers.length
  const animatedTeacherCount = useCountUp(0, totalTeachers)

  const facultyOptions = useMemo(() => {
    if (hasResourceInfo) {
      const names = new Set(teacherResourceInfo.map((info) => info.facultyName).filter(Boolean))
      return [...names].sort((a, b) => a.localeCompare(b, "uz"))
    }
    const names = new Set(
      ranking.map((teacher) => getTeacherFaculty(teacher, departments)).filter(Boolean),
    )
    return [...names].sort((a, b) => a.localeCompare(b, "uz"))
  }, [hasResourceInfo, teacherResourceInfo, ranking, departments])

  const departmentOptions = useMemo(() => {
    if (hasResourceInfo) {
      const names = new Set(
        teacherResourceInfo
          .filter((info) => facultyFilter === "all" || info.facultyName === facultyFilter)
          .map((info) => info.departmentName)
          .filter(Boolean),
      )
      return [...names].sort((a, b) => a.localeCompare(b, "uz"))
    }
    const names = new Set(
      ranking
        .filter((teacher) => {
          if (facultyFilter === "all") return true
          return getTeacherFaculty(teacher, departments) === facultyFilter
        })
        .map((teacher) => getTeacherDepartment(teacher, departments))
        .filter(Boolean),
    )
    return [...names].sort((a, b) => a.localeCompare(b, "uz"))
  }, [hasResourceInfo, teacherResourceInfo, ranking, departments, facultyFilter])

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (facultyFilter !== "all" && row.facultyName !== facultyFilter) return false
      if (departmentFilter !== "all" && row.departmentName !== departmentFilter) return false

      const q = searchQuery.trim().toLowerCase()
      if (!q) return true
      return [row.fullName, row.departmentName, row.positionName, row.facultyName].some((v) =>
        String(v).toLowerCase().includes(q),
      )
    })
  }, [rows, facultyFilter, departmentFilter, searchQuery])

  // Faqat teachers yuklanayotganda jadval ichida loader chiqsin,
  // resourceInfoLoading bo'lsa App.jsx dagi to'liq ekranli loader ishlaydi
  const isLoading = loading && !resourceInfoLoading

  const handleSelectTeacher = (row) => {
    setOpenActionsFor(null)
    if (row.teacher) {
      onSelectTeacher(row.teacher)
    } else if (row.teacherId) {
      // Agar teacher topilmasa, resource info'dan teacher obyekti yasaymiz
      onSelectTeacher({
        id: row.teacherId,
        fullName: row.fullName,
        role: "teacher",
        login: "",
        password: "",
        departmentId: "",
        department: row.departmentName,
        facultyName: row.facultyName,
        positionId: "",
        positionName: row.positionName,
      })
    }
  }

  return (
    <section className="min-h-screen w-full bg-white">
      <div className="w-full px-4 py-8 sm:px-6 lg:px-10">
        <div className="space-y-6">
          <div className="p-5 sm:p-6">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  Tyutorlar{" "}
                  <span className="inline-flex items-center justify-center rounded-full bg-indigo-100 px-3 py-0.5 text-lg font-bold text-indigo-700 align-baseline">
                    {animatedTeacherCount}
                  </span>
                </h2>
                {excelLoading && (
                  <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-10 py-8 shadow-2xl">
                      <Commet color="#4f46e5" size="medium" text="Kuting..." textColor="#0a4ff2" />
                    </div>
                  </div>
                )}
                {!documentsScored && (
                  <button
                    type="button"
                    disabled={excelLoading}
                    onClick={async () => {
                      setExcelLoading(true)
                      try {
                        await downloadTeachersResourceInfoExcel()
                      } catch (err) {
                        console.error("Excel yuklashda xatolik:", err)
                      } finally {
                        setExcelLoading(false)
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-emerald-600 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Download className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                    {excelLoading ? "Yuklanmoqda..." : "Excelga Yuklash"}
                  </button>
                )}
              </div>

              {loadError && (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  Tyutorlarni API dan yuklashda xatolik: {loadError}
                </p>
              )}

              {resourceInfoError && (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  Resurs ma'lumotlarini yuklashda xatolik: {resourceInfoError}
                </p>
              )}

              {/* Filters */}
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  value={facultyFilter}
                  onChange={(e) => {
                    setFacultyFilter(e.target.value)
                    setDepartmentFilter("all")
                  }}
                  className="w-full min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-shadow focus:border-slate-400 focus:ring-2 focus:ring-slate-200/60 sm:min-w-[12rem]"
                >
                  <option value="all">Barcha fakultetlar</option>
                  {facultyOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="w-full min-w-0 flex-1 rounded-lg border border-teal-500 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-shadow focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 sm:min-w-[12rem]"
                >
                  <option value="all">Barcha kafedralar</option>
                  {departmentOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <input
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setSearchQuery(searchDraft)
                  }}
                  placeholder="Tyutorni izlash"
                  className="w-full min-w-0 flex-[1.5] rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-shadow focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 sm:min-w-[12rem]"
                />
                <button
                  type="button"
                  onClick={() => setSearchQuery(searchDraft)}
                  className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-teal-600 px-4 py-2.5 text-sm font-semibold text-teal-700 transition-colors hover:bg-teal-50 sm:w-auto"
                >
                  <Search className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                  Qidirish
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="border border-slate-200 px-4 py-3 text-center text-sm font-bold text-slate-900">
                        №
                      </th>
                      <th className="border border-slate-200 px-4 py-3 text-left text-sm font-bold text-slate-900">
                        Fakultet
                      </th>
                      <th className="border border-slate-200 px-4 py-3 text-left text-sm font-bold text-slate-900">
                        F.I.O
                      </th>
                      <th className="border border-slate-200 px-4 py-3 text-left text-sm font-bold text-slate-900">
                        Ball
                      </th>
                      <th className="border border-slate-200 px-4 py-3 text-center text-sm font-bold text-slate-900">
                        Resurs soni
                      </th>
                      <th className="border border-slate-200 px-4 py-3 text-right text-sm font-bold text-slate-900">
                        Amallar
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading && (
                      <tr>
                        <td
                          colSpan={6}
                          className="border border-slate-200 px-4 py-12 text-center"
                        >
                          <div className="flex flex-col items-center justify-center gap-3">
                            <Commet color="#4f46e5" size="medium" text="" textColor="" />
                            <p className="text-sm text-slate-500">Tyutorlar yuklanmoqda...</p>
                          </div>
                        </td>
                      </tr>
                    )}
                    {!isLoading &&
                      filteredRows.map((row, index) => {
                        const ballDisplay =
                          hasResourceInfo
                            ? `${row.scoredBall} ball`
                            : row.total != null
                              ? `${row.total} ball`
                              : "0 ball"

                        return (
                          <tr key={row.key}>
                            <td className="border border-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-900">
                              {index + 1}
                            </td>
                            <td className="border border-slate-200 px-4 py-3 text-sm text-slate-500">
                              {row.facultyName}
                            </td>
                            <td className="border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">
                              {row.fullName}
                            </td>
                            <td className="border border-slate-200 px-4 py-3">
                              <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                                {ballDisplay}
                              </span>
                            </td>
                            <td className="border border-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-700">
                              {row.resourceCount}
                            </td>
                            <td className="border border-slate-200 px-4 py-3 text-center">
                              <div className="relative inline-flex">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenActionsFor((prev) =>
                                      prev === row.key ? null : row.key,
                                    )
                                  }
                                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 p-2.5 text-slate-700 transition-colors hover:bg-slate-100"
                                  aria-label="Amallar menyusi"
                                  aria-expanded={openActionsFor === row.key}
                                >
                                  <SlidersHorizontal
                                    className="h-5 w-5"
                                    strokeWidth={1.9}
                                    aria-hidden
                                  />
                                </button>

                                {openActionsFor === row.key && (
                                  <div className="absolute right-0 top-full z-20 mt-2 min-w-52 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                                    <button
                                      type="button"
                                      onClick={() => handleSelectTeacher(row)}
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50"
                                    >
                                      <Eye
                                        className="h-4 w-4 shrink-0"
                                        strokeWidth={1.75}
                                        aria-hidden
                                      />
                                      Ko'rish
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSelectTeacher(row)}
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-50"
                                    >
                                      <TrendingUp
                                        className="h-4 w-4 shrink-0"
                                        strokeWidth={1.75}
                                        aria-hidden
                                      />
                                      Reyting
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    {!isLoading && filteredRows.length === 0 && (
                      <tr>
                        <td
                          colSpan={8}
                          className="border border-slate-200 px-4 py-8 text-center text-sm text-slate-500"
                        >
                          {searchQuery || facultyFilter !== "all" || departmentFilter !== "all"
                            ? "Qidiruv bo'yicha natija topilmadi."
                            : totalTeachers === 0
                              ? "API dan tyutorlar topilmadi. Tizimga API orqali kiring."
                              : "Hozircha tyutorlar ro'yxati bo'sh."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {(searchQuery || facultyFilter !== "all" || departmentFilter !== "all") &&
                !isLoading &&
                filteredRows.length === 0 && (
                <p className="text-center text-sm text-slate-500">
                  Qidiruv bo'yicha natija topilmadi.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/** @param {{ facultyName?: string, departmentId?: string }} teacher */
function getTeacherFaculty(teacher, departments) {
  if (teacher.facultyName) return teacher.facultyName
  const dept = departments.find((d) => d.id === teacher.departmentId)
  return dept?.facultyName || ""
}

/** @param {{ department?: string, departmentId?: string }} teacher */
function getTeacherDepartment(teacher, departments) {
  return (
    departments.find((d) => d.id === teacher.departmentId)?.name ||
    teacher.department ||
    ""
  )
}

/** @param {{ positionId?: string }} teacher */
function getTeacherPosition(teacher, positions) {
  return (
    (teacher.positionId
      ? positions.find((p) => p.id === teacher.positionId)?.name
      : null) || "-"
  )
}