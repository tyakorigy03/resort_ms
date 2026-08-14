import { Box, Typography } from '@mui/material'

// Vertical bar chart built from plain divs - no chart dependency, responsive.
export function BarChart({ data, valueFormat = (v) => v, height = 150 }) {
  const max = Math.max(...data.map((d) => Number(d.value) || 0), 1)
  const chartHeight = height - 34
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, pt: 1 }}>
      {data.length === 0 && (
        <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
          No data in this period.
        </Typography>
      )}
      {data.map((d) => {
        const v = Number(d.value) || 0
        const barH = v > 0 ? Math.max((v / max) * chartHeight, 3) : 0
        return (
          <Box key={d.label} sx={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
            <Typography variant="caption" sx={{ fontSize: '0.58rem', color: 'text.secondary', display: 'block', whiteSpace: 'nowrap' }}>
              {valueFormat(v)}
            </Typography>
            <Box
              sx={{
                height: barH,
                bgcolor: d.color || 'primary.main',
                width: '100%',
                maxWidth: 34,
                mx: 'auto',
                borderRadius: '4px 4px 0 0',
              }}
            />
            <Typography variant="caption" sx={{ fontSize: '0.58rem', color: 'text.secondary', display: 'block', mt: 0.25 }}>
              {d.label}
            </Typography>
          </Box>
        )
      })}
    </Box>
  )
}

// SVG line chart for timelines (e.g. price history). Renders up to two series.
export function LineChart({
  data,
  width = 480,
  height = 190,
  series = [
    { key: 'value', color: '#1976d2' },
  ],
}) {
  if (!data.length) {
    return (
      <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
        No data to chart.
      </Typography>
    )
  }
  const values = data.flatMap((d) => series.map((s) => Number(d[s.key]) || 0))
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const padX = 10
  const padTop = 10
  const padBottom = 26
  const innerW = width - padX * 2
  const innerH = height - padTop - padBottom
  const n = data.length

  function pointAt(i, v) {
    const x = padX + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW)
    const y = padTop + innerH - ((v - min) / range) * innerH
    return [x, y]
  }

  const gridY = [0, 0.5, 1].map((t) => padTop + innerH - t * innerH)
  const labels = data.map((d) => d.label)
  const labelStep = Math.ceil(n / 6)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ maxWidth: width, display: 'block' }}>
      {gridY.map((y, i) => (
        <line
          key={i}
          x1={padX}
          y1={y}
          x2={width - padX}
          y2={y}
          stroke="#e5e7eb"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
      ))}
      {series.map((s) => {
        const pts = data.map((d, i) => pointAt(i, Number(d[s.key]) || 0).join(',')).join(' ')
        return (
          <polyline key={s.key} points={pts} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" />
        )
      })}
      {data.map((d, i) => {
        const [x, y] = pointAt(i, Number(d[series[0].key]) || 0)
        return <circle key={i} cx={x} cy={y} r={2.5} fill={series[0].color} />
      })}
      {labels.map((label, i) => {
        if (i % labelStep !== 0 && i !== n - 1) return null
        const [x] = pointAt(i, 0)
        return (
          <text key={i} x={x} y={height - 8} fontSize={9} fill="#6b7280" textAnchor="middle">
            {label}
          </text>
        )
      })}
    </svg>
  )
}
