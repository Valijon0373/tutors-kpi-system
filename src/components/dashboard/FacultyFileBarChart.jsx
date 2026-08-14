import React, { useEffect, useState } from "react"
import { useTheme, styled } from "@mui/material/styles"
import Typography from "@mui/material/Typography"
import { BarChart } from "@mui/x-charts/BarChart"
import { useAnimate, useAnimateBar, useDrawingArea } from "@mui/x-charts/hooks"
import { PiecewiseColorLegend } from "@mui/x-charts/ChartsLegend"
import { interpolateObject } from "@mui/x-charts-vendor/d3-interpolate"
import Box from "@mui/material/Box"
import { ThemeProvider, createTheme } from "@mui/material/styles"
import { fetchFileCountByFaculty } from "../../api/teacherDocuments"

const lightTheme = createTheme({ palette: { mode: "light" } })
const darkTheme = createTheme({
  palette: {
    mode: "dark",
    text: { primary: "#e2e8f0", secondary: "#94a3b8" },
  },
})

function BarShadedBackground(props) {
  const { ownerState, skipAnimation, id, dataIndex, xOrigin, yOrigin, seriesId, ...other } = props
  const theme = useTheme()
  const animatedProps = useAnimateBar(props)
  const { width } = useDrawingArea()
  return (
    <React.Fragment>
      <rect
        {...other}
        fill={(theme.vars || theme).palette.text.primary}
        opacity={theme.palette.mode === "dark" ? 0.05 : 0.1}
        x={other.x}
        width={width}
      />
      <rect
        {...other}
        filter={ownerState.isHighlighted ? "brightness(120%)" : undefined}
        opacity={ownerState.isFaded ? 0.3 : 1}
        data-highlighted={ownerState.isHighlighted || undefined}
        data-faded={ownerState.isFaded || undefined}
        {...animatedProps}
      />
    </React.Fragment>
  )
}

const Text = styled("text")(({ theme }) => ({
  ...theme?.typography?.body2,
  stroke: "none",
  fill: (theme.vars || theme).palette.common.white,
  transition: "opacity 0.2s ease-in, fill 0.2s ease-in",
  textAnchor: "start",
  dominantBaseline: "central",
  pointerEvents: "none",
  fontWeight: 600,
}))

function BarLabelAtBase(props) {
  const {
    seriesId,
    dataIndex,
    color,
    isFaded,
    isHighlighted,
    classes,
    xOrigin,
    yOrigin,
    x,
    y,
    width,
    height,
    layout,
    skipAnimation,
    ...otherProps
  } = props

  const animatedProps = useAnimate(
    { x: xOrigin + 8, y: y + height / 2 },
    {
      initialProps: { x: xOrigin, y: y + height / 2 },
      createInterpolator: interpolateObject,
      transformProps: (p) => p,
      applyProps: (element, p) => {
        element.setAttribute("x", p.x.toString())
        element.setAttribute("y", p.y.toString())
      },
      skip: skipAnimation,
    },
  )

  return <Text {...otherProps} {...animatedProps} />
}

export default function FacultyFileBarChart({ dark = false }) {
  const [data, setData] = useState(/** @type {import("../../api/teacherDocuments").FacultyFileStats[]} */ ([]))
  const [loading, setLoading] = useState(true)
  const appliedTheme = dark ? darkTheme : lightTheme

  useEffect(() => {
    let cancelled = false
    fetchFileCountByFaculty().then((rows) => {
      if (!cancelled) {
        setData(rows)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const maxCount = data.length > 0 ? Math.max(...data.map((d) => d.count)) : 1

  const subtitle = dark ? "text-slate-400" : "text-slate-500"
  const titleClr = dark ? "text-slate-100" : "text-slate-900"
  const cardBase = dark ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white shadow-sm"

  return (
    <ThemeProvider theme={appliedTheme}>
      <article className={`rounded-xl border p-5 ${cardBase}`}>
        <h3 className={`text-lg font-semibold ${titleClr}`}>
          Fakultet tyutorlari yuklagan fayllar
        </h3>
        <p className={`mt-1 text-sm ${subtitle}`}>
          Har bir fakultet bo'yicha jami yuklangan fayllar soni
        </p>

        {loading ? (
          <p className={`mt-6 text-sm ${subtitle}`}>Yuklanmoqda...</p>
        ) : data.length === 0 ? (
          <p className={`mt-6 text-sm ${subtitle}`}>Hozircha ma'lumot yo'q.</p>
        ) : (
          <Box sx={{ width: "100%", mt: 1 }}>
            <BarChart
              height={Math.max(200, data.length * 48 + 60)}
              dataset={data.map((d) => ({
                facultyName: d.facultyName,
                count: d.count,
              }))}
              series={[
                {
                  id: "files",
                  dataKey: "count",
                  stack: "fayllar",
                  valueFormatter: (value) => `${value} ta`,
                  barLabel: (v) => `${v.value} ta`,
                },
              ]}
              layout="horizontal"
              xAxis={[
                {
                  id: "color",
                  min: 0,
                  max: Math.max(maxCount * 1.15, 5),
                  colorMap: {
                    type: "piecewise",
                    thresholds: [Math.max(1, Math.round(maxCount * 0.3)), Math.max(2, Math.round(maxCount * 0.6))],
                    colors: ["#d32f2f", "#78909c", "#1976d2"],
                  },
                  valueFormatter: (value) => `${value} ta`,
                },
              ]}
              yAxis={[
                {
                  scaleType: "band",
                  dataKey: "facultyName",
                  width: 160,
                },
              ]}
              slots={{
                legend: PiecewiseColorLegend,
                barLabel: BarLabelAtBase,
                bar: BarShadedBackground,
              }}
              slotProps={{
                legend: {
                  axisDirection: "x",
                  markType: "square",
                  labelPosition: "inline-start",
                  labelFormatter: ({ index }) => {
                    if (index === 0) return "kam"
                    if (index === 1) return "o'rtacha"
                    return "ko'p"
                  },
                },
              }}
            />
          </Box>
        )}
      </article>
    </ThemeProvider>
  )
}