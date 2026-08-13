import { useEffect, useState } from "react"
import { Award, FileCheck, LogIn, ShieldCheck, Sparkles, TrendingUp } from "lucide-react"

const WELCOME_MESSAGES = [
  "Xush kelibsiz!",
  "Tyutorlar faoliyatini baholash va monitoring platformasi",
  "Shaffof, adolatli va zamonaviy KPI tizimi"
]

const TYPE_MS = 50
const PAUSE_AT_FULL_MS = 2500

function WelcomeTypewriter() {
  const [msgIdx, setMsgIdx] = useState(0)
  const [len, setLen] = useState(0)
  const currentMsg = WELCOME_MESSAGES[msgIdx]
  const typing = len < currentMsg.length

  useEffect(() => {
    let cancelled = false
    let tid = 0
    let pos = 0

    const schedule = (ms, fn) => {
      tid = window.setTimeout(fn, ms)
    }

    const tick = () => {
      if (cancelled) return
      if (pos < currentMsg.length) {
        pos += 1
        setLen(pos)
        schedule(TYPE_MS, tick)
      } else {
        schedule(PAUSE_AT_FULL_MS, () => {
          if (cancelled) return
          pos = 0
          setLen(0)
          setMsgIdx((prev) => (prev + 1) % WELCOME_MESSAGES.length)
        })
      }
    }

    schedule(TYPE_MS, tick)
    return () => {
      cancelled = true
      window.clearTimeout(tid)
    }
  }, [msgIdx, currentMsg])

  return (
    <div className="relative min-h-[3rem] max-w-2xl text-center">
      <p
        className="text-lg font-medium tracking-wide text-indigo-100/90 sm:text-xl md:text-2xl"
        aria-label={currentMsg}
      >
        <span>{currentMsg.slice(0, len)}</span>
        {typing && (
          <span
            className="ml-1 inline-block h-[1.1em] w-[2px] translate-y-[0.1em] animate-pulse bg-sky-400 align-middle"
            aria-hidden
          />
        )}
      </p>
    </div>
  )
}

export default function HomeHeroBrand({ onOpenLogin }) {
  return (
    <div className="relative z-10 flex w-full flex-col items-center justify-center gap-8 text-center sm:gap-10">
      {/* Decorative ambient background glows */}
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-gradient-to-tr from-indigo-500/25 via-sky-500/20 to-purple-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 right-10 h-60 w-60 rounded-full bg-blue-600/15 blur-3xl" />

      {/* Top Header Badge */}
      <div className="flex flex-col items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-4 py-1.5 text-xs font-semibold tracking-wider text-sky-200 shadow-inner backdrop-blur-md">
          <Sparkles className="h-4 w-4 animate-pulse text-sky-400" />
          <span>Urganch Davlat Pedagogika Instituti</span>
        </div>

        {/* Main Title: Tyutorlarni KPI Tizimi */}
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-white sm:text-6xl md:text-7xl">
          <span className="block drop-shadow-lg">TYUTORLARNI</span>
          <span className="mt-1 block bg-gradient-to-r from-sky-300 via-indigo-200 to-purple-300 bg-clip-text text-transparent drop-shadow-sm">
            KPI TIZIMI
          </span>
        </h1>
      </div>

      {/* Animated Typewriter Subtitle */}
      <WelcomeTypewriter />

      {/* Action Button */}
      {onOpenLogin && (
        <div className="pt-1">
          <button
            type="button"
            onClick={onOpenLogin}
            className="group relative inline-flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-indigo-600/30 transition-all duration-300 hover:scale-105 hover:from-indigo-500 hover:to-purple-500 hover:shadow-indigo-500/50 active:scale-95"
          >
            <span className="absolute inset-0 bg-white/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <LogIn className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
            <span>Tizimga kirish</span>
          </button>
        </div>
      )}

      {/* Feature Highlights Grid */}
      <div className="mt-4 grid w-full grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
        <div className="group rounded-2xl border border-white/10 bg-white/5 p-5 text-left backdrop-blur-md transition-all duration-300 hover:border-sky-400/40 hover:bg-white/10 hover:shadow-lg hover:shadow-sky-500/10">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-300 transition-transform duration-300 group-hover:scale-110">
            <Award className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-white">Shaffof KPI Baholash</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-300">
            Tyutorlar faoliyatini tasdiqlangan mezonlar bo'yicha adolatli va aniq baholash.
          </p>
        </div>

        <div className="group rounded-2xl border border-white/10 bg-white/5 p-5 text-left backdrop-blur-md transition-all duration-300 hover:border-indigo-400/40 hover:bg-white/10 hover:shadow-lg hover:shadow-indigo-500/10">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300 transition-transform duration-300 group-hover:scale-110">
            <FileCheck className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-white">Hujjatlar Monitoringi</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-300">
            Tasdiqlovchi hujjatlarni qulay biriktirish va ekspertlar tomonidan tezkor tekshirilishi.
          </p>
        </div>

        <div className="group rounded-2xl border border-white/10 bg-white/5 p-5 text-left backdrop-blur-md transition-all duration-300 hover:border-purple-400/40 hover:bg-white/10 hover:shadow-lg hover:shadow-purple-500/10">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300 transition-transform duration-300 group-hover:scale-110">
            <TrendingUp className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-white">Reyting & Statistika</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-300">
            Real-vaqt rejimida fakultet va bo'limlar kesimidagi reyting hamda umumiy ko'rsatkichlar.
          </p>
        </div>
      </div>

      {/* Footer System Badge */}
      <div className="flex items-center gap-2 text-xs text-indigo-200/60">
        <ShieldCheck className="h-4 w-4 text-emerald-400" />
        <span>UrSPI Rasmiy Avtomatlashtirilgan Axborot Tizimi</span>
      </div>
    </div>
  )
}
