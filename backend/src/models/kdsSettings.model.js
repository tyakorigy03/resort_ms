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
  return {
    stationId: row.production_center_id,
    ticketView: row.ticket_view || DEFAULTS.ticketView,
    showStationFilters: !!Number(row.show_station_filter),
    showOrderStatusFilters: !!Number(row.show_status_filter),
    showOrderTypeFilters: !!Number(row.show_type_filter),
    colorTheme: row.color_theme || DEFAULTS.colorTheme,
    language: row.language || DEFAULTS.language,
    timezone: row.timezone,
    waitTimes: {
      new: row.wait_time_new === null ? null : Number(row.wait_time_new),
      preparing: row.wait_time_preparing === null ? null : Number(row.wait_time_preparing),
      ready: row.wait_time_ready === null ? null : Number(row.wait_time_ready),
    },
    deactivatedOrderStatuses: row.deactivated_statuses ? JSON.parse(row.deactivated_statuses) : [],
    layouts: {
      columns: row.layouts_columns === null ? 3 : Number(row.layouts_columns),
      sidebar: !!Number(row.layouts_sidebar),
    },
    coursingEnabled: !!Number(row.coursing_enabled),
    routingEnabled: !!Number(row.routing_enabled),
  }
}

async function getByStation(stationId) {
  const [rows] = await pool.query('SELECT * FROM kds_station_settings WHERE production_center_id = ?', [stationId])
  return mapRow(rows[0])
}

async function upsert(stationId, settings = {}) {
  const current = await getByStation(stationId)
  const merged = { ...current, ...settings }
  const waitTimes = { ...current.waitTimes, ...(settings.waitTimes || {}) }
  const layouts = { ...current.layouts, ...(settings.layouts || {}) }
  await pool.query(
    `INSERT INTO kds_station_settings
       (production_center_id, ticket_view, show_station_filter, show_status_filter, show_type_filter,
        color_theme, language, timezone, wait_time_new, wait_time_preparing, wait_time_ready,
        deactivated_statuses, layouts_columns, layouts_sidebar, coursing_enabled, routing_enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       ticket_view = VALUES(ticket_view),
       show_station_filter = VALUES(show_station_filter),
       show_status_filter = VALUES(show_status_filter),
       show_type_filter = VALUES(show_type_filter),
       color_theme = VALUES(color_theme),
       language = VALUES(language),
       timezone = VALUES(timezone),
       wait_time_new = VALUES(wait_time_new),
       wait_time_preparing = VALUES(wait_time_preparing),
       wait_time_ready = VALUES(wait_time_ready),
       deactivated_statuses = VALUES(deactivated_statuses),
       layouts_columns = VALUES(layouts_columns),
       layouts_sidebar = VALUES(layouts_sidebar),
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
      Math.min(Math.max(Number(layouts.columns) || 3, 1), 6),
      layouts.sidebar ? 1 : 0,
      merged.coursingEnabled ? 1 : 0,
      merged.routingEnabled ? 1 : 0,
    ],
  )
  return getByStation(stationId)
}

module.exports = { getByStation, upsert, DEFAULTS }
