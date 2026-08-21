import { BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart as ReLineChart, Line, CartesianGrid } from 'recharts'
import { Box, Typography } from '@mui/material'

const COLORS = ['#166534', '#3730a3', '#b91c1c', '#b45309', '#6b21a8', '#0e7490', '#4b5563', '#c2410c']

export function BarChart({ data, valueFormat = (v) => v, height = 150, color }) {
  if (!data.length) {
    return (
      <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
        No data in this period.
      </Typography>
    )
  }

  const formatted = data.map((d) => ({
    name: d.label,
    value: Number(d.value) || 0,
    fill: d.color || color || COLORS[0],
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReBarChart data={formatted} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={valueFormat}
          width={50}
        />
        <Tooltip
          formatter={(val) => valueFormat(val)}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Bar
          dataKey="value"
          radius={[4, 4, 0, 0]}
          fill={color || COLORS[0]}
          maxBarSize={40}
        />
      </ReBarChart>
    </ResponsiveContainer>
  )
}

export function MultiBarChart({ data, keys, colors = COLORS, height = 150, valueFormat = (v) => v }) {
  if (!data.length) {
    return (
      <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
        No data in this period.
      </Typography>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReBarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={valueFormat}
          width={50}
        />
        <Tooltip
          formatter={(val, name) => [valueFormat(val), name]}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        {keys.map((key, i) => (
          <Bar key={key} dataKey={key} fill={colors[i % colors.length]} radius={[4, 4, 0, 0]} maxBarSize={40} />
        ))}
      </ReBarChart>
    </ResponsiveContainer>
  )
}

export function LineChart({ data, height = 190, series = [{ key: 'value', color: '#1976d2', name: 'Value' }] }) {
  if (!data.length) {
    return (
      <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
        No data to chart.
      </Typography>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReLineChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
          width={50}
        />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            name={s.name || s.key}
          />
        ))}
      </ReLineChart>
    </ResponsiveContainer>
  )
}
