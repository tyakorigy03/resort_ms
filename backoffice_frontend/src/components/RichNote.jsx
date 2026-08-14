import { Box } from '@mui/material'
import { sanitizeHtml } from '../utils/sanitizeHtml'

// Renders a stored note (sanitized HTML) with formatting preserved.
function RichNote({ html, sx }) {
  return (
    <Box
      sx={{
        fontSize: '0.75rem',
        '& ul, & ol': { m: 0, pl: 3, my: 0.5 },
        '& p': { m: '0 0 4px' },
        ...sx,
      }}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html || '') }}
    />
  )
}

export default RichNote
