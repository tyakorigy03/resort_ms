import { createContext, useContext, useMemo, useState } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import { buildTheme } from './theme'

const MODE_KEY = 'fd_theme_mode'
const DEFAULT_MODE = 'light'

const ThemeModeContext = createContext(null)

export function useThemeMode() {
  return useContext(ThemeModeContext)
}

function loadMode() {
  try {
    return localStorage.getItem(MODE_KEY) || DEFAULT_MODE
  } catch {
    return DEFAULT_MODE
  }
}

export default function ThemeModeProvider({ children }) {
  const [mode, setMode] = useState(loadMode)
  const theme = useMemo(() => buildTheme(mode), [mode])

  function toggleMode() {
    setMode((m) => {
      const next = m === 'dark' ? 'light' : 'dark'
      localStorage.setItem(MODE_KEY, next)
      return next
    })
  }

  const value = useMemo(() => ({ mode, toggleMode, setModeTo: toggleMode }), [mode])

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </ThemeModeContext.Provider>
  )
}
