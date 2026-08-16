import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import CssBaseline from '@mui/material/CssBaseline'
import AuthProvider from './AuthProvider'
import ThemeModeProvider from './ThemeModeProvider'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeModeProvider>
        <AuthProvider>
          <CssBaseline />
          <App />
        </AuthProvider>
      </ThemeModeProvider>
    </BrowserRouter>
  </StrictMode>,
)
