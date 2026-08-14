// Pluggable cash-drawer driver.
//
// Physical integration: the drawer's kick pulse is sent over the receipt
// printer's RJ11/RJ12 "drawer kick" port using ESC/POS commands (e.g. ESC p
// 0 25 250). Until a printer/port is configured this honestly reports that the
// drawer is not opened - no fake success.
async function open() {
  return { opened: false, reason: 'No cash drawer is configured on this device yet' }
}

module.exports = { open }
