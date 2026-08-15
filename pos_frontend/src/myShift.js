const KEY = 'pos_my_shift'

export function saveMyShift(event) {
  try {
    localStorage.setItem(KEY, JSON.stringify(event))
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
  } catch {
    /* ignore */
  }
}

export function clearMyShiftIf(id) {
  const shift = loadMyShift()
  if (shift && shift.id === id) clearMyShift()
}
