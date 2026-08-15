import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { getDevice } from '../api'
import { money } from '../format'

function orderLines(order) {
  const lines = []
  for (const course of order.courses || []) {
    for (const item of course.items || []) {
      if (item.kdsStatus !== 'cancelled') {
        lines.push({ id: `${course.id}-${item.id}`, quantity: item.quantity, itemName: item.itemName, lineTotal: item.lineTotal })
      }
    }
  }
  for (const item of order.unassignedItems || []) {
    if (item.kdsStatus !== 'cancelled') {
      lines.push({ id: `u-${item.id}`, quantity: item.quantity, itemName: item.itemName, lineTotal: item.lineTotal })
    }
  }
  return lines
}

export default function Receipt({ order, onClose }) {
  const device = getDevice()
  const open = Boolean(order)
  const lines = order ? orderLines(order) : []

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Payment complete
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {order && (
          <div className="receipt-sheet">
            <div className="receipt-head">
              <strong>{device?.name || 'Point of Sale'}</strong>
              <span>{device?.outletName || ''}</span>
              <span>{new Date(order.completedAt || order.createdAt).toLocaleString()}</span>
              <span className="receipt-order">Order {order.orderNumber}</span>
              {order.tableLabel && <span>Table {order.tableLabel}</span>}
              {order.collectionCode && <span>Code {order.collectionCode}</span>}
            </div>
            <table className="receipt-items">
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id}>
                    <td>{line.quantity}× {line.itemName}</td>
                    <td>{money(line.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="receipt-totals">
              <div><span>Subtotal</span><span>{money(order.subtotal)}</span></div>
              {order.discount > 0 && <div><span>Discount</span><span>−{money(order.discount)}</span></div>}
              {order.tip > 0 && <div><span>Tip</span><span>{money(order.tip)}</span></div>}
              <div className="receipt-grand"><span>Total</span><span>{money(order.total)}</span></div>
              {order.paymentMethod === 'cash' && (
                <>
                  <div><span>Cash</span><span>{money(order.paymentReceived)}</span></div>
                  <div><span>Change</span><span>{money(order.changeDue)}</span></div>
                </>
              )}
              <div><span>Payment</span><span>{order.paymentMethod}</span></div>
            </div>
            {order.staffName && <div className="receipt-foot">Served by {order.staffName}</div>}
          </div>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>New sale</Button>
        <Button variant="contained" onClick={() => window.print()}>
          Print receipt
        </Button>
      </DialogActions>
    </Dialog>
  )
}
