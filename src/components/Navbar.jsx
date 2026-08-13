import { useState } from "react"
import { Menu, X } from "lucide-react"

export default function Navbar({
  activePage,
  onNavigate,
  currentUser,
  logoSrc,
  logoAlt = "Logo",
  userRoleLabel,
  onLogout,
  onOpenLogin,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleNavigate = (page) => {
    setMobileMenuOpen(false)
    onNavigate(page)
  }

  return (
    <>
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-slate-700/80 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 shadow-lg shadow-slate-950/40">
        <div className="flex h-[4.25rem] w-full items-center justify-between px-5 sm:h-[4.75rem] sm:px-6 lg:px-10">
          <div className="flex items-center gap-2">
            {/* Desktop navigation buttons - hidden on mobile */}
            {currentUser ? (
              <>
                <div className="hidden sm:flex sm:items-center sm:gap-2">
                  <button
                    type="button"
                    onClick={() => onNavigate("dashboard")}
                    className={`rounded-lg px-5 py-2.5 text-sm font-semibold ${
                      activePage === "dashboard"
                        ? "bg-white text-indigo-700 shadow-md shadow-slate-900/15"
                        : "border border-white/25 bg-slate-700/50 text-white/90"
                    }`}
                  >
                    Statistika
                  </button>
                  {currentUser?.role === "expert" && (
                    <button
                      type="button"
                      onClick={() => onNavigate("oqituvchilar")}
                      className={`rounded-lg px-5 py-2.5 text-sm font-semibold ${
                        activePage === "oqituvchilar"
                          ? "bg-white text-indigo-700 shadow-md shadow-slate-900/15"
                          : "border border-white/25 bg-slate-700/50 text-white/90"
                      }`}
                    >
                      O'qituvchilar
                    </button>
                  )}
                  {currentUser?.role !== "expert" && (
                    <button
                      type="button"
                      onClick={() => onNavigate("mezonlar")}
                      className={`rounded-lg px-5 py-2.5 text-sm font-semibold ${
                        activePage === "mezonlar"
                          ? "bg-white text-indigo-700 shadow-md shadow-slate-900/15"
                          : "border border-white/25 bg-slate-700/50 text-white/90"
                      }`}
                    >
                      Mezonlar
                    </button>
                  )}
                </div>

                {/* Burger button - visible only on mobile */}
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="inline-flex items-center justify-center rounded-lg p-2 text-white/90 transition-colors hover:bg-white/10 sm:hidden"
                  aria-label="Menyuni ochish"
                >
                  <Menu className="h-6 w-6" strokeWidth={2} />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                {logoSrc ? (
                  <img
                    src={logoSrc}
                    alt={logoAlt}
                    className="h-14 w-14 rounded-xl bg-white/70 p-1 object-contain shadow-sm sm:h-16 sm:w-16"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-lg bg-white/20 shadow-inner shadow-white/10 sm:h-16 sm:w-16" />
                )}
                <div className="hidden leading-tight sm:block">
                  <p className="text-base font-bold tracking-wide text-white">URSPI</p>
                  <p className="text-[10px] font-medium tracking-wider text-indigo-200 uppercase">Tyutorlar KPI Tizimi</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {currentUser ? (
              <>
                <div className="text-right text-xs">
                  <p className="hidden font-semibold text-white drop-shadow-sm sm:block">{currentUser.fullName}</p>
                  <p className="text-white/75">{userRoleLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="rounded-lg border border-white/20 bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white"
                >
                  Chiqish
                </button>
              </>
            ) : null}
          </div>
        </div>
      </nav>

      {/* Mobile side panel overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm transition-opacity duration-300 sm:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile side panel */}
      <div
        className={`fixed left-0 top-0 z-[65] h-full w-72 transform bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950 shadow-2xl transition-transform duration-300 ease-in-out sm:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Panel header */}
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-3">
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt={logoAlt}
                  className="h-10 w-10 rounded-lg bg-white/70 p-0.5 object-contain"
                />
              ) : null}
              <div>
                <p className="text-sm font-bold text-white">URSPI</p>
                <p className="text-[10px] font-medium text-indigo-200 uppercase">Tyutorlar KPI Tizimi</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Menyuni yopish"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>

          {/* Teacher info */}
          {currentUser && (
            <div className="border-b border-white/10 px-5 py-4">
              <p className="text-xs font-medium uppercase tracking-wider text-indigo-300">
                O'qituvchi
              </p>
              <p className="mt-1 text-base font-bold text-white">
                {currentUser.fullName}
              </p>
              {userRoleLabel && (
                <p className="mt-0.5 text-sm text-white/60">{userRoleLabel}</p>
              )}
            </div>
          )}

          {/* Navigation links */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            <button
              type="button"
              onClick={() => handleNavigate("dashboard")}
              className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold transition-colors ${
                activePage === "dashboard"
                  ? "bg-white/15 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-base">
                📊
              </span>
              Statistika
            </button>

            {currentUser?.role === "expert" && (
              <button
                type="button"
                onClick={() => handleNavigate("oqituvchilar")}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold transition-colors ${
                  activePage === "oqituvchilar"
                    ? "bg-white/15 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-base">
                  👥
                </span>
                O'qituvchilar
              </button>
            )}

            {currentUser?.role !== "expert" && (
              <button
                type="button"
                onClick={() => handleNavigate("mezonlar")}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold transition-colors ${
                  activePage === "mezonlar"
                    ? "bg-white/15 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-base">
                  📋
                </span>
                Mezonlar
              </button>
            )}
          </nav>

          {/* Logout at bottom */}
          {currentUser && (
            <div className="border-t border-white/10 px-3 py-4">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false)
                  onLogout()
                }}
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold text-rose-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-base">
                  🚪
                </span>
                Chiqish
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
