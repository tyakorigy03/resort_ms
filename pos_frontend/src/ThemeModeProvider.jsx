import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { buildTheme } from './theme'

const KEY = 'pos_theme_mode'

const ModeContext = createContext({ mode: 'dark', toggleMode: () => {} })

export function useThemeMode() {
  return useContext(ModeContext)
}

export default function ThemeModeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem(KEY) || 'dark'
    } catch {
      return 'dark'
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(KEY, mode)
    } catch {
      /* ignore */
    }
  }, [mode])

  const value = useMemo(
    () => ({ mode, toggleMode: () => setMode((m) => (m === 'dark' ? 'light' : 'dark')) }),
    [mode],
  )
  const theme = useMemo(() => buildTheme(mode), [mode])

  return (
    <ModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ModeContext.Provider>
  )
}
