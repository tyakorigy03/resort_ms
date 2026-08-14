const nodemailer = require('nodemailer')

let transporter = null

function getTransporter() {
  if (!process.env.SMTP_HOST) return null
  if (transporter) return transporter
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  })
  return transporter
}

// Sends an email through the configured SMTP server. If SMTP is not configured
// the send is skipped and the caller still records the PO as sent (status /
// sent_to_email) so the workflow never blocks on mail setup.
async function sendMail({ to, subject, html }) {
  const tr = getTransporter()
  if (!tr) return { sent: false, reason: 'SMTP not configured' }
  try {
    await tr.sendMail({
      from: process.env.SMTP_FROM || 'Resort Backoffice <no-reply@resort.local>',
      to,
      subject,
      html,
    })
    return { sent: true }
  } catch (error) {
    return { sent: false, reason: error.message }
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildPurchaseEmail(purchase, items) {
  const rows = items
    .map(
      (it) => `<tr>
        <td style="padding:6px 8px;border:1px solid #e2e8f0">${escapeHtml(it.itemName)}</td>
        <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:right">${it.qty}</td>
        <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:right">${it.unitCost.toFixed(2)}</td>
        <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:right">${it.value.toFixed(2)}</td>
      </tr>`,
    )
    .join('')
  const title = purchase.poNumber ? `Purchase Order ${purchase.poNumber}` : `Purchase Order #${purchase.id}`
  return `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1f2937">
    <h2 style="margin:0 0 4px">${escapeHtml(title)}</h2>
    <p style="margin:0 0 16px;color:#6b7280">Date: ${escapeHtml(purchase.date)}</p>
    <p style="margin:0 0 16px">Supplier: <b>${escapeHtml(purchase.supplierName || '-')}</b></p>
    <table style="border-collapse:collapse;width:100%;max-width:560px">
      <thead>
        <tr style="background:#f3f4f6">
          <th style="padding:6px 8px;border:1px solid #e2e8f0;text-align:left">Item</th>
          <th style="padding:6px 8px;border:1px solid #e2e8f0;text-align:right">Qty</th>
          <th style="padding:6px 8px;border:1px solid #e2e8f0;text-align:right">Unit cost</th>
          <th style="padding:6px 8px;border:1px solid #e2e8f0;text-align:right">Value</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="padding:6px 8px;border:1px solid #e2e8f0;text-align:right;font-weight:bold">Total</td>
          <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:right;font-weight:bold">${purchase.totalValue.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>
    ${purchase.notes ? `<p style="margin:16px 0 0;color:#6b7280">Notes: ${escapeHtml(purchase.notes)}</p>` : ''}
  </div>`
}

module.exports = { sendMail, buildPurchaseEmail }
