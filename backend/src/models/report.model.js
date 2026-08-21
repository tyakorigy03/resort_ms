const { pool } = require('../config/db')

async function executiveDashboard() {
  const [posToday] = await pool.query(`
    SELECT
      IFNULL(SUM(total + IFNULL(tip, 0)), 0) AS revenue,
      COUNT(*) AS order_count
    FROM pos_orders
    WHERE status = 'paid' AND DATE(created_at) = CURDATE()
  `)

  const [posYesterday] = await pool.query(`
    SELECT
      IFNULL(SUM(total + IFNULL(tip, 0)), 0) AS revenue,
      COUNT(*) AS order_count
    FROM pos_orders
    WHERE status = 'paid' AND DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
  `)

  const [roomToday] = await pool.query(`
    SELECT IFNULL(SUM(fl.amount), 0) AS revenue
    FROM folio_line_items fl
    JOIN folios f ON f.id = fl.folio_id
    WHERE fl.type = 'room_charge' AND DATE(fl.created_at) = CURDATE()
  `)

  const [roomYesterday] = await pool.query(`
    SELECT IFNULL(SUM(fl.amount), 0) AS revenue
    FROM folio_line_items fl
    JOIN folios f ON f.id = fl.folio_id
    WHERE fl.type = 'room_charge' AND DATE(fl.created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
  `)

  const [occupancy] = await pool.query(`
    SELECT
      COUNT(*) AS total,
      SUM(status = 'occupied') AS occupied,
      SUM(status = 'available' AND housekeeping_status = 'dirty') AS dirty,
      SUM(status = 'available' AND housekeeping_status = 'clean') AS clean
    FROM rooms WHERE is_active = 1
  `)

  const [inHouse] = await pool.query(`
    SELECT COUNT(*) AS count
    FROM reservations WHERE status = 'checked_in'
  `)

  const [arrivals] = await pool.query(`
    SELECT COUNT(*) AS count
    FROM reservations
    WHERE check_in_date = CURDATE()
      AND status IN ('booked', 'checked_in')
  `)

  const [departures] = await pool.query(`
    SELECT COUNT(*) AS count
    FROM reservations
    WHERE check_out_date = CURDATE()
      AND status IN ('checked_in', 'checked_out')
  `)

  const [folioBalance] = await pool.query(`
    SELECT IFNULL(SUM(balance), 0) AS balance
    FROM folios WHERE status = 'open'
  `)

  const [pendingPO] = await pool.query(`
    SELECT COUNT(*) AS count
    FROM purchases WHERE status = 'sent'
  `)

  const [roomsByType] = await pool.query(`
    SELECT
      rt.name AS type_name,
      COUNT(r.id) AS total,
      SUM(r.status = 'occupied') AS occupied,
      SUM(r.status = 'available' AND r.housekeeping_status = 'dirty') AS dirty,
      SUM(r.status = 'available' AND r.housekeeping_status = 'clean') AS clean
    FROM room_types rt
    JOIN rooms r ON r.room_type_id = rt.id AND r.is_active = 1
    GROUP BY rt.id, rt.name
    ORDER BY rt.name ASC
  `)

  const totalRooms = occupancy[0].total || 1
  const occupiedRooms = occupancy[0].occupied || 0
  const dirtyRooms = occupancy[0].dirty || 0
  const cleanRooms = occupancy[0].clean || 0
  const totalPosRevenue = Number(posToday[0].revenue) || 0
  const totalRoomRevenue = Number(roomToday[0].revenue) || 0

  return {
    revenue: {
      total: totalPosRevenue + totalRoomRevenue,
      pos: totalPosRevenue,
      rooms: totalRoomRevenue,
      yesterday_total: (Number(posYesterday[0].revenue) || 0) + (Number(roomYesterday[0].revenue) || 0),
      yesterday_pos: Number(posYesterday[0].revenue) || 0,
      yesterday_rooms: Number(roomYesterday[0].revenue) || 0,
    },
    occupancy: {
      total: totalRooms,
      occupied: occupiedRooms,
      dirty: dirtyRooms,
      clean: cleanRooms,
      percentage: Math.round((occupiedRooms / totalRooms) * 100),
    },
    rooms_by_type: roomsByType.map((r) => ({
      type_name: r.type_name,
      total: r.total,
      occupied: Number(r.occupied) || 0,
      dirty: Number(r.dirty) || 0,
      clean: Number(r.clean) || 0,
    })),
    front_desk: {
      in_house: inHouse[0].count,
      arrivals_today: arrivals[0].count,
      departures_today: departures[0].count,
    },
    operations: {
      open_folio_balance: folioBalance[0].balance,
      pending_purchase_orders: pendingPO[0].count,
    },
  }
}

async function revenueTrend(days = 30) {
  const [rows] = await pool.query(`
    SELECT
      DATE(created_at) AS date,
      IFNULL(SUM(total), 0) AS revenue,
      COUNT(*) AS order_count
    FROM pos_orders
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `, [days])
  return rows
}

async function salesDaily(startDate, endDate, outletId) {
  const start = startDate || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const end = endDate || new Date().toISOString().slice(0, 10)

  let sql = `
    SELECT
      DATE(p.created_at) AS date,
      IFNULL(SUM(p.total), 0) AS revenue,
      COUNT(*) AS order_count,
      IFNULL(ROUND(AVG(p.total), 2), 0) AS avg_order_value,
      IFNULL(SUM(CASE WHEN p.order_type = 'dine_in' THEN p.total ELSE 0 END), 0) AS dine_in_revenue,
      IFNULL(SUM(CASE WHEN p.order_type = 'pickup' THEN p.total ELSE 0 END), 0) AS pickup_revenue,
      IFNULL(SUM(CASE WHEN p.order_type = 'delivery' THEN p.total ELSE 0 END), 0) AS delivery_revenue
    FROM pos_orders p
    WHERE DATE(p.created_at) BETWEEN ? AND ?
  `
  const params = [start, end]

  if (outletId) {
    sql += ' AND p.outlet_id = ?'
    params.push(outletId)
  }

  sql += ' GROUP BY DATE(p.created_at) ORDER BY date DESC'

  const [rows] = await pool.query(sql, params)
  return rows
}

async function salesByItem(startDate, endDate) {
  const start = startDate || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const end = endDate || new Date().toISOString().slice(0, 10)

  const [rows] = await pool.query(`
    SELECT
      poi.item_name,
      i.category,
      IFNULL(SUM(poi.quantity), 0) AS quantity_sold,
      IFNULL(SUM(poi.line_total), 0) AS total_revenue
    FROM pos_order_items poi
    JOIN pos_orders po ON po.id = poi.order_id
    LEFT JOIN items i ON i.id = poi.item_id
    WHERE DATE(po.created_at) BETWEEN ? AND ?
    GROUP BY poi.item_name, i.category
    ORDER BY total_revenue DESC
  `, [start, end])
  return rows
}

async function salesByOutlet(startDate, endDate) {
  const start = startDate || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const end = endDate || new Date().toISOString().slice(0, 10)

  const [rows] = await pool.query(`
    SELECT
      o.name AS outlet_name,
      o.type AS outlet_type,
      IFNULL(SUM(po.total + IFNULL(po.tip, 0)), 0) AS revenue,
      COUNT(po.id) AS order_count,
      IFNULL(ROUND(AVG(po.total + IFNULL(po.tip, 0)), 2), 0) AS avg_ticket
    FROM outlets o
    LEFT JOIN pos_orders po ON po.outlet_id = o.id
      AND po.status = 'paid' AND DATE(po.created_at) BETWEEN ? AND ?
    WHERE o.is_active = 1
    GROUP BY o.id, o.name, o.type
    ORDER BY revenue DESC
  `, [start, end])
  return rows
}

async function salesByStaff(startDate, endDate) {
  const start = startDate || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const end = endDate || new Date().toISOString().slice(0, 10)

  const [rows] = await pool.query(`
    SELECT
      CONCAT(s.first_name, ' ', s.last_name) AS staff_name,
      COUNT(*) AS orders_handled,
      IFNULL(SUM(po.total), 0) AS total_sales
    FROM pos_orders po
    JOIN staff s ON s.id = po.staff_id
    WHERE DATE(po.created_at) BETWEEN ? AND ?
    GROUP BY s.id, s.first_name, s.last_name
    ORDER BY total_sales DESC
  `, [start, end])
  return rows
}

async function salesByHour(startDate, endDate) {
  const start = startDate || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const end = endDate || new Date().toISOString().slice(0, 10)

  const [rows] = await pool.query(`
    SELECT
      HOUR(created_at) AS hour,
      IFNULL(SUM(total), 0) AS revenue,
      COUNT(*) AS order_count
    FROM pos_orders
    WHERE DATE(created_at) BETWEEN ? AND ?
    GROUP BY HOUR(created_at)
    ORDER BY hour ASC
  `, [start, end])
  return rows
}

async function stockSummary() {
  const [rows] = await pool.query(`
    SELECT
      i.name AS item_name,
      i.sku,
      i.category,
      l.name AS location_name,
      IFNULL(SUM(CASE WHEN sm.direction = 'IN' THEN sm.qty ELSE 0 END)
        - SUM(CASE WHEN sm.direction = 'OUT' THEN sm.qty ELSE 0 END), 0) AS current_qty,
      ip.cost_price AS unit_cost,
      ROUND(
        (IFNULL(SUM(CASE WHEN sm.direction = 'IN' THEN sm.qty ELSE 0 END)
          - SUM(CASE WHEN sm.direction = 'OUT' THEN sm.qty ELSE 0 END), 0)) * IFNULL(ip.cost_price, 0), 2
      ) AS total_value
    FROM items i
    JOIN stock_movements sm ON sm.item_id = i.id
    JOIN locations l ON l.id = sm.location_id
    LEFT JOIN item_prices ip ON ip.item_id = i.id
      AND ip.effective_from = (
        SELECT MAX(effective_from)
        FROM item_prices
        WHERE item_id = i.id AND effective_from <= CURDATE()
      )
    GROUP BY i.id, i.name, i.sku, i.category, l.id, l.name, ip.cost_price
    HAVING current_qty > 0
    ORDER BY i.name, l.name
  `)
  return rows
}

async function wastageSummary(startDate, endDate) {
  const start = startDate || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const end = endDate || new Date().toISOString().slice(0, 10)

  const [totals] = await pool.query(`
    SELECT
      IFNULL(SUM(wi.qty), 0) AS total_qty,
      IFNULL(SUM(wi.qty * wi.unit_cost), 0) AS total_cost
    FROM wastage_items wi
    JOIN wastage_batches wb ON wb.id = wi.wastage_batch_id
    WHERE wb.date BETWEEN ? AND ?
  `, [start, end])

  const [byReason] = await pool.query(`
    SELECT
      wi.reason,
      IFNULL(SUM(wi.qty), 0) AS total_qty,
      IFNULL(SUM(wi.qty * wi.unit_cost), 0) AS total_cost
    FROM wastage_items wi
    JOIN wastage_batches wb ON wb.id = wi.wastage_batch_id
    WHERE wb.date BETWEEN ? AND ?
    GROUP BY wi.reason
    ORDER BY total_cost DESC
  `, [start, end])

  const [byItem] = await pool.query(`
    SELECT
      i.name AS item_name,
      IFNULL(SUM(wi.qty), 0) AS total_qty,
      IFNULL(SUM(wi.qty * wi.unit_cost), 0) AS total_cost
    FROM wastage_items wi
    JOIN wastage_batches wb ON wb.id = wi.wastage_batch_id
    JOIN items i ON i.id = wi.item_id
    WHERE wb.date BETWEEN ? AND ?
    GROUP BY i.id, i.name
    ORDER BY total_cost DESC
  `, [start, end])

  return {
    total_qty: totals[0].total_qty,
    total_cost: totals[0].total_cost,
    by_reason: byReason,
    by_item: byItem,
  }
}

async function stockMovements(startDate, endDate, itemId) {
  const start = startDate || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const end = endDate || new Date().toISOString().slice(0, 10)

  let sql = `
    SELECT
      DATE(sm.moved_at) AS date,
      i.name AS item_name,
      sm.direction,
      sm.qty,
      sm.unit_cost,
      sm.type,
      sm.reference,
      sm.staff
    FROM stock_movements sm
    JOIN items i ON i.id = sm.item_id
    WHERE DATE(sm.moved_at) BETWEEN ? AND ?
  `
  const params = [start, end]

  if (itemId) {
    sql += ' AND sm.item_id = ?'
    params.push(itemId)
  }

  sql += ' ORDER BY sm.moved_at DESC'

  const [rows] = await pool.query(sql, params)
  return rows
}

async function occupancyReport(startDate, endDate) {
  const start = startDate || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const end = endDate || new Date().toISOString().slice(0, 10)

  const [rows] = await pool.query(`
    WITH RECURSIVE date_series AS (
      SELECT ? AS date
      UNION ALL
      SELECT DATE_ADD(date, INTERVAL 1 DAY)
      FROM date_series
      WHERE date < ?
    )
    SELECT
      ds.date,
      rt.name AS room_type_name,
      COUNT(DISTINCT r.id) AS total_rooms,
      COUNT(DISTINCT CASE
        WHEN res.id IS NOT NULL THEN r.id
      END) AS occupied,
      COUNT(DISTINCT r.id) - COUNT(DISTINCT CASE
        WHEN res.id IS NOT NULL THEN r.id
      END) AS available,
      ROUND(
        COUNT(DISTINCT CASE WHEN res.id IS NOT NULL THEN r.id END) * 100.0
          / NULLIF(COUNT(DISTINCT r.id), 0), 2
      ) AS occupancy_pct
    FROM date_series ds
    CROSS JOIN room_types rt
    JOIN rooms r ON r.room_type_id = rt.id AND r.is_active = 1
    LEFT JOIN reservations res
      ON res.room_id = r.id
      AND res.check_in_date <= ds.date
      AND res.check_out_date > ds.date
      AND res.status NOT IN ('cancelled', 'no_show')
    GROUP BY ds.date, rt.id, rt.name
    ORDER BY ds.date ASC, rt.name ASC
  `, [start, end])

  const [adrRev] = await pool.query(`
    SELECT
      fl.description,
      rli.amount,
      res.check_in_date,
      res.check_out_date
    FROM folio_line_items fl
    JOIN folios f ON f.id = fl.folio_id
    JOIN reservations res ON res.id = f.reservation_id
    JOIN rooms r ON r.id = res.room_id
    JOIN room_types rt ON rt.id = r.room_type_id
    WHERE fl.type = 'room_charge'
      AND res.check_in_date <= ?
      AND res.check_out_date > ?
      AND res.status NOT IN ('cancelled', 'no_show')
  `, [end, start])

  return { occupancy: rows }
}

async function roomRevenue(startDate, endDate) {
  const start = startDate || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const end = endDate || new Date().toISOString().slice(0, 10)

  const [rows] = await pool.query(`
    SELECT
      rt.name AS room_type_name,
      IFNULL(SUM(CASE WHEN fl.type = 'room_charge' THEN fl.amount ELSE 0 END), 0) AS room_revenue,
      IFNULL(SUM(CASE WHEN fl.type NOT IN ('payment', 'adjustment') THEN fl.amount ELSE 0 END), 0) AS total_folio_charges
    FROM folio_line_items fl
    JOIN folios f ON f.id = fl.folio_id
    JOIN rooms r ON r.id = f.room_id
    JOIN room_types rt ON rt.id = r.room_type_id
    WHERE DATE(fl.created_at) BETWEEN ? AND ?
    GROUP BY rt.id, rt.name
    ORDER BY room_revenue DESC
  `, [start, end])
  return rows
}

async function staffShiftSummary(startDate, endDate) {
  const start = startDate || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const end = endDate || new Date().toISOString().slice(0, 10)

  const [rows] = await pool.query(`
    SELECT
      CONCAT(s.first_name, ' ', s.last_name) AS staff_name,
      IFNULL(ROUND(
        SUM(TIMESTAMPDIFF(SECOND, sce.clocked_in_at,
          IFNULL(sce.clocked_out_at, NOW()))) / 3600, 2
      ), 0) AS total_hours,
      COUNT(DISTINCT po.id) AS orders_handled,
      IFNULL(SUM(po.total), 0) AS total_sales
    FROM staff s
    JOIN staff_clock_events sce ON sce.staff_id = s.id
      AND DATE(sce.clocked_in_at) BETWEEN ? AND ?
    LEFT JOIN pos_orders po ON po.staff_id = s.id
      AND DATE(po.created_at) BETWEEN ? AND ?
      AND po.status = 'paid'
    GROUP BY s.id, s.first_name, s.last_name
    ORDER BY total_sales DESC
  `, [start, end, start, end])
  return rows
}

async function menuPerformance(startDate, endDate) {
  const start = startDate || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const end = endDate || new Date().toISOString().slice(0, 10)

  const [rows] = await pool.query(`
    SELECT
      poi.item_name,
      i.accounting_group,
      IFNULL(SUM(poi.quantity), 0) AS times_sold,
      IFNULL(SUM(poi.line_total), 0) AS total_revenue
    FROM pos_order_items poi
    JOIN pos_orders po ON po.id = poi.order_id
    LEFT JOIN items i ON i.id = poi.item_id
    WHERE DATE(po.created_at) BETWEEN ? AND ?
    GROUP BY poi.item_name, i.accounting_group
    ORDER BY total_revenue DESC
  `, [start, end])
  return rows
}

module.exports = {
  executiveDashboard,
  revenueTrend,
  salesDaily,
  salesByItem,
  salesByOutlet,
  salesByStaff,
  salesByHour,
  stockSummary,
  wastageSummary,
  stockMovements,
  occupancyReport,
  roomRevenue,
  staffShiftSummary,
  menuPerformance,
}
