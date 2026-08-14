import { useEffect, useRef } from 'react'
import { Box, IconButton } from '@mui/material'
import FormatBoldIcon from '@mui/icons-material/FormatBold'
import FormatItalicIcon from '@mui/icons-material/FormatItalic'
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted'
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered'
import { sanitizeHtml } from '../utils/sanitizeHtml'

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Pasted plain text -> HTML. Numbered ("1. ", "1) ") and bullet ("- ", "* ",
// "• ") multi-line text is converted into a real ordered/unordered list;
// anything else becomes lines joined with <br>.
function pastedToHtml(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (!lines.length) return ''
  const ordered = lines.every((line) => /^\d+[.)]\s+/.test(line))
  const bullets = lines.every((line) => /^[-*•]\s+/.test(line))
  if (ordered) {
    return `<ol>${lines
      .map((line) => `<li>${escapeHtml(line.replace(/^\d+[.)]\s+/, ''))}</li>`)
      .join('')}</ol>`
  }
  if (bullets) {
    return `<ul>${lines
      .map((line) => `<li>${escapeHtml(line.replace(/^[-*•]\s+/, ''))}</li>`)
      .join('')}</ul>`
  }
  return lines.map((line) => escapeHtml(line)).join('<br>')
}

function insertHtmlAtCaret(html) {
  const el = document.activeElement
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) {
    el?.insertAdjacentHTML?.('beforeend', html)
    return
  }
  const range = sel.getRangeAt(0)
  range.deleteContents()
  const fragment = range.createContextualFragment(html)
  const lastNode = fragment.lastChild
  range.insertNode(fragment)
  if (lastNode) {
    range.setStartAfter(lastNode)
    range.collapse(true)
  }
  sel.removeAllRanges()
  sel.addRange(range)
}

// Simple contentEditable note editor that preserves line breaks, bold,
// italic and lists. The stored value is sanitized HTML.
function RichTextEditor({ value = '', onChange, minHeight = 80 }) {
  const ref = useRef(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const focusedRef = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const clean = sanitizeHtml(value || '')
    if (!focusedRef.current && el.innerHTML !== clean) {
      el.innerHTML = clean
    }
  }, [value])

  function emit() {
    if (ref.current) onChangeRef.current?.(sanitizeHtml(ref.current.innerHTML))
  }

  function run(command) {
    ref.current?.focus()
    document.execCommand(command, false, null)
    emit()
  }

  function handlePaste(event) {
    event.preventDefault()
    const text = event.clipboardData?.getData('text/plain') ?? ''
    ref.current?.focus()
    insertHtmlAtCaret(pastedToHtml(text))
    emit()
  }

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
      <Box
        sx={{
          display: 'flex',
          gap: 0.25,
          px: 0.5,
          py: 0.25,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: '#fafafa',
        }}
      >
        <IconButton size="small" title="Bold" onClick={() => run('bold')} sx={{ p: 0.4 }}>
          <FormatBoldIcon sx={{ fontSize: 15 }} />
        </IconButton>
        <IconButton size="small" title="Italic" onClick={() => run('italic')} sx={{ p: 0.4 }}>
          <FormatItalicIcon sx={{ fontSize: 15 }} />
        </IconButton>
        <IconButton size="small" title="Bullet list" onClick={() => run('insertUnorderedList')} sx={{ p: 0.4 }}>
          <FormatListBulletedIcon sx={{ fontSize: 15 }} />
        </IconButton>
        <IconButton size="small" title="Numbered list" onClick={() => run('insertOrderedList')} sx={{ p: 0.4 }}>
          <FormatListNumberedIcon sx={{ fontSize: 15 }} />
        </IconButton>
      </Box>
      <Box
        component="div"
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onPaste={handlePaste}
        onFocus={() => {
          focusedRef.current = true
        }}
        onBlur={emit}
        sx={{
          minHeight,
          px: 1,
          py: 0.75,
          fontSize: '0.78rem',
          outline: 'none',
          overflowY: 'auto',
          '& ul, & ol': { m: 0, pl: 3, my: 0.5 },
          '& p': { m: '0 0 4px' },
        }}
      />
    </Box>
  )
}

export default RichTextEditor
