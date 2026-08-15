import { createTheme } from '@mui/material/styles'

// Shared design tokens (spec §5.1). POS defaults to dark, KDS to light.
export const tokens = {
  dark: {
    bg: '#0b0b0c',
    surface: '#242426',
    surfaceElevated: '#2a2a2c',
    topBar: '#1c1c1e',
    primary: '#16a34a',
    primaryHover: '#15803d',
    success: '#1fa153',
    successDark: '#188a46',
    successLight: '#163021',
    fire: '#f39c2a',
    fireDark: '#e08e1f',
    red: '#e04b4b',
    amber: '#e0a83a',
    textPrimary: '#f2f2f3',
    textSecondary: '#9a9a9d',
    divider: '#3a3a3c',
  },
  light: {
    bg: '#f1f5f9',
    surface: '#ffffff',
    surfaceElevated: '#ffffff',
    topBar: '#ffffff',
    primary: '#166534',
    primaryHover: '#14532d',
    success: '#2e7d32',
    successDark: '#1b5e20',
    successLight: '#dcfce7',
    fire: '#e08e1f',
    fireDark: '#c77b16',
    red: '#dc2626',
    amber: '#b45309',
    textPrimary: '#0f172a',
    textSecondary: '#64748b',
    divider: '#e2e8f0',
  },
}

export function buildTheme(mode, opts = {}) {
  const t = tokens[mode === 'light' ? 'light' : 'dark']
  const radius = opts.radius ?? 10
  return createTheme({
    palette: {
      mode,
      background: { default: t.bg, paper: t.surface },
      primary: { main: t.primary, dark: t.primary, light: t.surfaceElevated, contrastText: '#ffffff' },
      success: { main: t.success, dark: t.successDark, light: t.successLight, contrastText: '#ffffff' },
      error: { main: t.red, contrastText: '#ffffff' },
      warning: { main: t.amber, contrastText: '#ffffff' },
      fire: { main: t.fire, dark: t.fireDark, contrastText: '#0b0b0c' },
      text: { primary: t.textPrimary, secondary: t.textSecondary },
      divider: t.divider,
      topBar: t.topBar,
    },
    typography: {
      fontFamily: "'Poppins', 'Roboto', sans-serif",
    },
    shape: { borderRadius: radius },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 600 },
        },
      },
      MuiChip: {
        styleOverrides: { root: { fontWeight: 600 } },
      },
      MuiAppBar: {
        styleOverrides: { root: { backgroundImage: 'none' } },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { borderRadius: radius },
        },
      },
      MuiPopover: {
        styleOverrides: {
          paper: { borderRadius: radius },
        },
      },
    },
  })
}
