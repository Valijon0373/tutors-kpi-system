import { useEffect, useMemo, useState } from "react"
import { PieChart, pieClasses } from "@mui/x-charts/PieChart"
import Box from "@mui/material/Box"
import ToggleButton from "@mui/material/ToggleButton"
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup"
import { useDrawingArea } from "@mui/x-charts/hooks"
import { styled, ThemeProvider, createTheme } from "@mui/material/styles"
import { fetchFileTypeDistribution } from "../../api/teacherDocuments"

const COLORS = {
  file: "#3b82f6",
  video: "#ef4444",
  link: "#f59e0b",
  rasm: "#10b981",
}

const StyledText = styled("text")(({ theme }) => ({
  fill: theme.palette.text.primary,
  textAnchor: "middle",
  dominantBaseline: "central",
  fontSize: 20,
}))

function PieCenterLabel({ children }) {
  const { width, height, left, top } = useDrawingArea()
  return (
    <StyledText x={left + width / 2} y={top + height / 2}>
      {children}
    </StyledText>
  )
}

const lightTheme = createTheme({ palette: { mode: "light" } })
const darkTheme = createTheme({
  palette: {
    mode: "dark",
    text: { primary: "#e2e8f0", secondary: "#94a3b8" },
    background: { default: "#1e293b", paper: "#1e293b" },
  },
})

const CATEGORIES = [
  { key: "file", label: "File" },
  { key: "video", label: "Video" },
  { key: "link", label: "Link" },
  { key: "rasm", label: "Rasm" },
]

export default function FileTypeDistribution({ dark = false }) {
  const [distribution, setDistribution] = useState({ file: 0, video: 0, link: 0, rasm: 0 })
  const [view, setView] = useState("type")

  useEffect(() => {
    let cancelled = false
    fetchFileTypeDistribution().then((dist) => {
      if (!cancelled) setDistribution(dist)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const total =
    distribution.file + distribution.video + distribution.link + distribution.rasm

  // ----- View: "type" — asosiy kategoriyalar bo'yicha -----
  const typeData = useMemo(() => {
    if (total === 0)
      return CATEGORIES.map((c) => ({
        id: c.key,
        label: c.label,
        value: 1,
        percentage: 25,
        color: COLORS[c.key],
      }))
    return CATEGORIES.map((c) => ({
      id: c.key,
      label: c.label,
      value: distribution[c.key],
      percentage: (distribution[c.key] / total) * 100,
      color: COLORS[c.key],
    }))
  }, [distribution, total])

  // ----- View: "media" — Media (Rasm + Video) vs Hujjat (File + Link) -----
  const mediaData = useMemo(() => {
    const mediaTotal = distribution.rasm + distribution.video
    const docTotal = distribution.file + distribution.link
    const safeTotal = total || 1
    return [
      {
        id: "media",
        label: "Media",
        value: mediaTotal || 1,
        percentage: (mediaTotal / safeTotal) * 100,
        color: COLORS.rasm,
      },
      {
        id: "document",
        label: "Hujjat",
        value: docTotal || 1,
        percentage: (docTotal / safeTotal) * 100,
        color: COLORS.file,
      },
    ]
  }, [distribution, total])

  // Media ichki taqsimoti (outer ring)
  const mediaBreakdown = useMemo(() => {
    const mediaTotal = distribution.rasm + distribution.video
    const docTotal = distribution.file + distribution.link
    return [
      {
        id: "media-rasm",
        label: "Rasm",
        value: distribution.rasm || 1,
        percentage: mediaTotal > 0 ? (distribution.rasm / mediaTotal) * 100 : 50,
        color: COLORS.rasm,
      },
      {
        id: "media-video",
        label: "Video",
        value: distribution.video || 1,
        percentage: mediaTotal > 0 ? (distribution.video / mediaTotal) * 100 : 50,
        color: COLORS.video,
      },
      {
        id: "doc-file",
        label: "File",
        value: distribution.file || 1,
        percentage: docTotal > 0 ? (distribution.file / docTotal) * 100 : 50,
        color: COLORS.file,
      },
      {
        id: "doc-link",
        label: "Link",
        value: distribution.link || 1,
        percentage: docTotal > 0 ? (distribution.link / docTotal) * 100 : 50,
        color: COLORS.link,
      },
    ]
  }, [distribution])

  const innerRadius = 50
  const middleRadius = 120

  const appliedTheme = dark ? darkTheme : lightTheme
  const titleClr = dark ? "text-slate-100" : "text-slate-900"
  const subtitle = dark ? "text-slate-400" : "text-slate-500"
  const cardBase = dark
    ? "border-slate-700 bg-slate-800"
    : "border-slate-200 bg-white shadow-sm"

  return (
    <ThemeProvider theme={appliedTheme}>
      <article className={`rounded-xl border p-5 ${cardBase}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className={`text-lg font-semibold ${titleClr}`}>
              Yuklangan fayllar taqsimoti
            </h3>
            <p className={`mt-1 text-sm ${subtitle}`}>
              File • Video • Link • Rasm
              {total > 0 && (
                <span className="ml-2 font-semibold">({total} ta jami)</span>
              )}
            </p>
          </div>
          <ToggleButtonGroup
            color="primary"
            size="small"
            value={view}
            exclusive
            onChange={(_, newView) => {
              if (newView !== null) setView(newView)
            }}
          >
            <ToggleButton value="type">Turlar bo'yicha</ToggleButton>
            <ToggleButton value="media">Media/Hujjat</ToggleButton>
          </ToggleButtonGroup>
        </div>

        <Box sx={{ display: "flex", justifyContent: "center", height: 400, mt: 2 }}>
          {view === "type" ? (
            <PieChart
              series={[
                {
                  innerRadius,
                  outerRadius: middleRadius,
                  data: typeData,
                  arcLabel: (item) =>
                    `${item.label} (${item.percentage.toFixed(0)}%)`,
                  valueFormatter: ({ value }) =>
                    `${value} ta (${((value / (total || 1)) * 100).toFixed(0)}%)`,
                  highlightScope: { fade: "global", highlight: "item" },
                  highlighted: { additionalRadius: 2 },
                  cornerRadius: 3,
                },
              ]}
              sx={{
                [`& .${pieClasses.arcLabel}`]: { fontSize: "12px" },
              }}
              slotProps={{ legend: { hidden: true } }}
            >
              <PieCenterLabel>Turlar</PieCenterLabel>
            </PieChart>
          ) : (
            <PieChart
              series={[
                {
                  innerRadius,
                  outerRadius: middleRadius,
                  data: mediaData,
                  arcLabel: (item) =>
                    `${item.label} (${item.percentage.toFixed(0)}%)`,
                  valueFormatter: ({ value }) =>
                    `${value} ta (${((value / (total || 1)) * 100).toFixed(0)}%)`,
                  highlightScope: { fade: "global", highlight: "item" },
                  highlighted: { additionalRadius: 2 },
                  cornerRadius: 3,
                },
                {
                  innerRadius: middleRadius,
                  outerRadius: middleRadius + 20,
                  data: mediaBreakdown,
                  arcLabel: (item) =>
                    `${item.label} (${item.percentage.toFixed(0)}%)`,
                  arcLabelRadius: 160,
                  valueFormatter: ({ value }) => `${value} ta`,
                  highlightScope: { fade: "global", highlight: "item" },
                  highlighted: { additionalRadius: 2 },
                  cornerRadius: 3,
                },
              ]}
              sx={{
                [`& .${pieClasses.arcLabel}`]: { fontSize: "11px" },
              }}
              slotProps={{ legend: { hidden: true } }}
            >
              <PieCenterLabel>H/M</PieCenterLabel>
            </PieChart>
          )}
        </Box>

        {/* Legend */}
        <div className="mt-0 flex flex-wrap justify-center gap-4 text-xs">
          {CATEGORIES.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-1.5">
              <span
                className="h-3 w-3 rounded-sm"
                style={{ background: COLORS[key] }}
              />
              <span className={dark ? "text-slate-300" : "text-slate-600"}>
                {label} ({distribution[key]})
              </span>
            </div>
          ))}
        </div>
      </article>
    </ThemeProvider>
  )
}