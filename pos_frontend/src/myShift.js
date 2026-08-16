const KEY = 'pos_my_shift'
const EVENT = 'pos-shift-changed'

function notify() {
  try {
    window.dispatchEvent(new Event(EVENT))
  } catch {
    /* ignore */
  }
}

export function saveMyShift(event) {
  try {
    localStorage.setItem(KEY, JSON.stringify(event))
    notify()
  } catch {
    /* ignore */
  }
}

export function loadMyShift() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null')
  } catch {
    return null
  }
}

export function clearMyShift() {
  try {
    localStorage.removeItem(KEY)
    notify()
  } catch {
    /* ignore */
  }
}

export function clearMyShiftIf(id) {
  const shift = loadMyShift()
  if (shift && shift.id === id) clearMyShift()
}
