import { Facebook, Instagram, Send, Youtube } from "lucide-react"

const iconSvgClass = "h-4 w-4 shrink-0"
const iconProps = {
  className: iconSvgClass,
  strokeWidth: 1.5,
  "aria-hidden": true,
}

const FOOTER_SOCIAL = [
  {
    name: "Telegram",
    href: "https://t.me/UrDPI_UZ",
    hoverClass: "hover:border-[#229ED9] hover:text-[#229ED9]",
    icon: <Send {...iconProps} />,
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/urspi.uz?igsh=b3Bwc2g0YWoxYnZh",
    hoverClass: "hover:border-[#E1306C] hover:text-[#E1306C]",
    icon: <Instagram {...iconProps} />,
  },
  {
    name: "YouTube",
    href: "https://www.youtube.com/@urspiurspi",
    hoverClass: "hover:border-[#FF0000] hover:text-[#FF0000]",
    icon: <Youtube {...iconProps} />,
  },
  {
    name: "Facebook",
    href: "https://www.facebook.com/urdpi/",
    hoverClass: "hover:border-[#1877F2] hover:text-[#1877F2]",
    icon: <Facebook {...iconProps} />,
  },
]

export default function Footer({ creditLine = "UrSPI | Tyutorlar KPI Tizimi | 2026" }) {
  return (
    <footer className="relative z-10 mt-auto w-full rounded-t-3xl border-t border-white/25 bg-white/10 py-6 shadow-[0_-8px_32px_rgba(0,0,0,0.12)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-xl flex-col items-center justify-center px-4 text-center">
        <div className="mb-3 flex flex-wrap items-center justify-center gap-4 sm:gap-5">
          {FOOTER_SOCIAL.map((item) => (
            <a
              key={item.name}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={item.name}
              className={`flex h-9 w-9 items-center justify-center rounded-full border border-white text-white drop-shadow-sm duration-200 transition-colors hover:bg-white/10 ${item.hoverClass}`}
            >
              {item.icon}
            </a>
          ))}
        </div>
        <p className="text-[0.8125rem] font-normal leading-normal tracking-[0.14em] text-white drop-shadow-sm">
          {creditLine}
        </p>
      </div>
    </footer>
  )
}
