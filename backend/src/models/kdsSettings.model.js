const { pool } = require('../config/db')

const DEFAULTS = {
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

function mapRow(row) {
  if (!row) return { ...DEFAULTS }
  const deactivated = row.deactivated_order_statuses ? JSON.parse(row.deactivated_order_statuses) : []
  return {
    stationId: row.station_id,
    ticketView: row.ticket_view || DEFAULTS.ticketView,
    showStationFilters: row.show_station_filters ? !!Number(row.show_station_filters) : DEFAULTS.showStationFilters,
    showOrderStatusFilters: row.show_order_status_filters ? !!Number(row.show_order_status_filters) : DEFAULTS.showOrderStatusFilters,
    showOrderTypeFilters: row.show_order_type_filters ? !!Number(row.show_order_type_filters) : DEFAULTS.showOrderTypeFilters,
    colorTheme: row.color_theme || DEFAULTS.colorTheme,
    language: row.language || DEFAULTS.language,
    timezone: row.timezone,
    waitTimes: {
      new: row.wait_time_new === null ? null : Number(row.wait_time_new),
      preparing: row.wait_time_preparing === null ? null : Number(row.wait_time_preparing),
      ready: row.wait_time_ready === null ? null : Number(row.wait_time_ready),
    },
    deactivatedOrderStatuses: deactivated,
    layouts: { columns: 3, sidebar: false },
    coursingEnabled: row.coursing_enabled ? !!Number(row.coursing_enabled) : true,
    routingEnabled: row.routing_enabled ? !!Number(row.routing_enabled) : true,
  }
}

async function getByStation(stationId) {
  const [rows] = await pool.query('SELECT * FROM kds_station_settings WHERE station_id = ?', [stationId])
  return mapRow(rows[0])
}

async function upsert(stationId, settings = {}) {
  const current = await getByStation(stationId)
  const merged = { ...current, ...settings }
  const waitTimes = { ...current.waitTimes, ...(settings.waitTimes || {}) }
  await pool.query(
    `INSERT INTO kds_station_settings
       (station_id, ticket_view, show_station_filters, show_order_status_filters, show_order_type_filters,
        color_theme, language, timezone, wait_time_new, wait_time_preparing, wait_time_ready,
        deactivated_order_statuses, coursing_enabled, routing_enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       ticket_view = VALUES(ticket_view),
       show_station_filters = VALUES(show_station_filters),
       show_order_status_filters = VALUES(show_order_status_filters),
       show_order_type_filters = VALUES(show_order_type_filters),
       color_theme = VALUES(color_theme),
       language = VALUES(language),
       timezone = VALUES(timezone),
       wait_time_new = VALUES(wait_time_new),
       wait_time_preparing = VALUES(wait_time_preparing),
       wait_time_ready = VALUES(wait_time_ready),
       deactivated_order_statuses = VALUES(deactivated_order_statuses),
       coursing_enabled = VALUES(coursing_enabled),
       routing_enabled = VALUES(routing_enabled)`,
    [
      stationId,
      merged.ticketView || 'full',
      merged.showStationFilters ? 1 : 0,
      merged.showOrderStatusFilters ? 1 : 0,
      merged.showOrderTypeFilters ? 1 : 0,
      merged.colorTheme || 'light',
      merged.language || 'en',
      merged.timezone || null,
      waitTimes.new ?? null,
      waitTimes.preparing ?? null,
      waitTimes.ready ?? null,
      JSON.stringify(merged.deactivatedOrderStatuses || []),
      merged.coursingEnabled ? 1 : 0,
      merged.routingEnabled ? 1 : 0,
    ],
  )
  return getByStation(stationId)
}

module.exports = { getByStation, upsert, DEFAULTS }
