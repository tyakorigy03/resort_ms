import { Box, Chip, Divider, FormControlLabel, Slider, Switch, TextField, Typography } from '@mui/material'

export const DEFAULTS = {
  ticketView: 'full',
  showStationFilters: true,
  showOrderStatusFilters: true,
  showOrderTypeFilters: true,
  colorTheme: 'light',
  language: 'en',
  timezone: null,
  waitTimes: { new: null, preparing: null, ready: null },
  deactivatedOrderStatuses: [],
  layouts: { columns: 3, sidebar: false },
  coursingEnabled: true,
  routingEnabled: true,
}

// Spec 4: the KDS settings (quick slide-over and the full settings page) share
// the same sections. Settings are stored per station and applied to every
// display on the production center.
export default function SettingsContent({ settings, onChange }) {
  const s = settings || DEFAULTS
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Section title="Layout">
        <Typography variant="caption" color="text.secondary">
          Ticket columns
        </Typography>
        <Slider
          value={s.layouts.columns}
          min={1}
          max={6}
          step={1}
          marks
          valueLabelDisplay="auto"
          onChange={(_, v) => onChange({ layouts: { columns: v } })}
        />
        <FormControlLabel
          control={
            <Switch
              checked={Boolean(s.layouts.sidebar)}
              onChange={(e) => onChange({ layouts: { sidebar: e.target.checked } })}
            />
          }
          label="Sidebar layout"
        />
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {['full', 'condensed'].map((v) => (
            <Chip
              key={v}
              label={v === 'full' ? 'Full tickets' : 'Condensed lines'}
              color={s.ticketView === v ? 'primary' : 'default'}
              variant={s.ticketView === v ? 'filled' : 'outlined'}
              size="small"
              onClick={() => onChange({ ticketView: v })}
              sx={{ textTransform: 'capitalize' }}
            />
          ))}
        </Box>
      </Section>

      <Section title="Filters">
        <FormControlLabel
          control={
            <Switch
              checked={Boolean(s.showStationFilters)}
              onChange={(e) => onChange({ showStationFilters: e.target.checked })}
            />
          }
          label="Show station"
        />
        <FormControlLabel
          control={
            <Switch
              checked={Boolean(s.showOrderStatusFilters)}
              onChange={(e) => onChange({ showOrderStatusFilters: e.target.checked })}
            />
          }
          label="Show order status filter"
        />
        <FormControlLabel
          control={
            <Switch
              checked={Boolean(s.showOrderTypeFilters)}
              onChange={(e) => onChange({ showOrderTypeFilters: e.target.checked })}
            />
          }
          label="Show order type filter"
        />
      </Section>

      <Section title="Kitchen flow">
        <FormControlLabel
          control={
            <Switch
              checked={Boolean(s.coursingEnabled)}
              onChange={(e) => onChange({ coursingEnabled: e.target.checked })}
            />
          }
          label="Coursing"
        />
        <FormControlLabel
          control={
            <Switch
              checked={Boolean(s.routingEnabled)}
              onChange={(e) => onChange({ routingEnabled: e.target.checked })}
            />
          }
          label="Station routing"
        />
      </Section>

      <Section title="Appearance">
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {['light', 'dark'].map((v) => (
            <Chip
              key={v}
              label={v}
              color={s.colorTheme === v ? 'primary' : 'default'}
              variant={s.colorTheme === v ? 'filled' : 'outlined'}
              size="small"
              onClick={() => onChange({ colorTheme: v })}
              sx={{ textTransform: 'capitalize' }}
            />
          ))}
        </Box>
      </Section>

      <Section title="Wait time targets (seconds)">
        {['new', 'preparing', 'ready'].map((k) => (
          <TextField
            key={k}
            label={k}
            size="small"
            type="number"
            placeholder="—"
            value={s.waitTimes?.[k] ?? ''}
            onChange={(e) =>
              onChange({
                waitTimes: {
                  [k]: e.target.value === '' ? null : Math.max(Number(e.target.value) || 0, 0),
                },
              })
            }
          />
        ))}
      </Section>

      <Divider />

      <Typography variant="caption" color="text.secondary">
        Settings are stored per station and applied to every display on this production center.
      </Typography>
    </Box>
  )
}

export function Section({ title, children }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
        {title}
      </Typography>
      {children}
    </Box>
  )
}
