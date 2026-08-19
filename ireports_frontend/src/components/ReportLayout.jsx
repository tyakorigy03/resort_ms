import { Box, Button, Typography } from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'

export default function ReportLayout({ title, subtitle, filters, children }) {
  return (
    <>
      <Typography variant="h5" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {subtitle}
        </Typography>
      )}
      {filters && (
        <Box sx={{ mb: 3 }}>
          {filters}
        </Box>
      )}
      {children}
    </>
  )
}

export function ExportButton({ data, filename = 'report' }) {
  function handleExport() {
    if (!data || !data.length) return
    const headers = Object.keys(data[0])
    const csv = [
      headers.join(','),
      ...data.map((row) => headers.map((h) => {
        const val = row[h] ?? ''
        return typeof val === 'string' && val.includes(',') ? `"${val}"` : val
      }).join(','))
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button
      size="small"
      variant="outlined"
      startIcon={<DownloadIcon />}
      onClick={handleExport}
      disabled={!data?.length}
    >
      Export CSV
    </Button>
  )
}
