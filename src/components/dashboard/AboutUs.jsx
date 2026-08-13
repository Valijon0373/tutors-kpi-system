import { Github, Instagram, Send } from "lucide-react"

const TEAM_MEMBERS = [
  {
    id: "dv",
    initials: "DV",
    name: "Davlatmuratov Valijon",
    role: "FRONTEND VA UI/UX DASTURCHI",
    bio: "Talabalar uchun qulay va zamonaviy interfeys yaratib, barcha sahifalarda yagona dizayn uslubini joriy qiladi.",
    socials: {
      telegram: "https://t.me/Val1jon_0373",
      instagram: "#",
      github: "#",
    },
  },
  {
    id: "oa",
    initials: "OA",
    name: "Otaboyev Akbar",
    role: "JAVA BACKEND DASTURCHISI",
    bio: "Ushbu platformaning server qismi, ma'lumotlar bilan ishlash va API larni xavfsiz boshqarish vazifalarini bajaradi.",
    socials: {
      telegram: "https://t.me/AkbarOtaboev",
      instagram: "#",
      github: "#",
    },
  },
]

function TeamMemberCard({ dark, member }) {
  return (
    <article className={`rounded-2xl border p-5 shadow-sm ${dark ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white"}`}>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-fuchsia-600 text-sm font-semibold text-white">
          {member.initials}
        </span>
        <div>
          <h3 className={`text-base font-bold ${dark ? "text-slate-100" : "text-slate-900"}`}>{member.name}</h3>
          <p className={`text-xs font-semibold ${dark ? "text-slate-400" : "text-slate-500"}`}>{member.role}</p>
        </div>
      </div>
      <p className={`mt-4 text-sm leading-6 ${dark ? "text-slate-300" : "text-slate-600"}`}>{member.bio}</p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="inline-flex rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600">Har doim aloqada</p>
        <div className="flex items-center gap-2">
          <a
            href={member.socials.telegram}
            target="_blank"
            rel="noreferrer"
            aria-label={`${member.name} Telegram`}
            className={`rounded-full border p-2 text-sky-500 transition-colors ${dark ? "border-slate-600 hover:bg-slate-700" : "border-slate-200 hover:bg-slate-100"}`}
          >
            <Send className="h-4 w-4" strokeWidth={1.9} aria-hidden />
          </a>
          <a
            href={member.socials.instagram}
            target="_blank"
            rel="noreferrer"
            aria-label={`${member.name} Instagram`}
            className={`rounded-full border p-2 text-rose-500 transition-colors ${dark ? "border-slate-600 hover:bg-slate-700" : "border-slate-200 hover:bg-slate-100"}`}
          >
            <Instagram className="h-4 w-4" strokeWidth={1.9} aria-hidden />
          </a>
          <a
            href={member.socials.github}
            target="_blank"
            rel="noreferrer"
            aria-label={`${member.name} GitHub`}
            className={`rounded-full border p-2 transition-colors ${dark ? "border-slate-600 text-slate-300 hover:bg-slate-700" : "border-slate-200 text-slate-600 hover:bg-slate-100"}`}
          >
            <Github className="h-4 w-4" strokeWidth={1.9} aria-hidden />
          </a>
        </div>
      </div>
    </article>
  )
}

export default function AboutUs({ dark }) {
  return (
    <section className="space-y-5">
      <article className={`rounded-2xl border px-6 py-7 text-center shadow-sm ${dark ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white"}`}>
        <p className={`text-xs font-semibold tracking-[0.45em] ${dark ? "text-slate-400" : "text-slate-500"}`}>URSPI TYUTORLARNI KPI TIZIMI</p>
        <h2 className={`mt-3 text-3xl font-extrabold ${dark ? "text-slate-100" : "text-slate-900"}`}>Biz haqimizda</h2>
        <p className={`mx-auto mt-3 max-w-3xl text-sm leading-6 ${dark ? "text-slate-300" : "text-slate-600"}`}>
          Ushbu platforma Komissiya tomonidan tyutorlar faoliyatini KPI baholash tizimi asosida adolatli va qulay tarzda baholash,
         natijalarni tahlil qilish hamda ta’lim sifatini oshirish maqsadida ishlab chiqilgan. 
        </p>
      </article>

      <div className="grid gap-4 lg:grid-cols-2">
        {TEAM_MEMBERS.map((member) => (
          <TeamMemberCard key={member.id} dark={dark} member={member} />
        ))}
      </div>
    </section>
  )
}
