import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { useMemo, useState } from 'react'
import { buildTheme } from './theme'
import App from './App.jsx'
import './index.css'

function Root() {
  const [mode, setMode] = useState('light')
  const theme = useMemo(() => buildTheme(mode), [mode])

  function toggleMode() {
    setMode((m) => (m === 'dark' ? 'light' : 'dark'))
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App mode={mode} onToggleMode={toggleMode} />
    </ThemeProvider>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  </StrictMode>,
)
