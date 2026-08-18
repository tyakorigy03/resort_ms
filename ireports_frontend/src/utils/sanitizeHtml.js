const ALLOWED = new Set(['P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'UL', 'OL', 'LI', 'SPAN', 'DIV', 'H3'])

// Keeps only simple formatting tags (paragraphs, line breaks, bold, italic,
// underline, lists) and strips every attribute, so stored note HTML is safe
// to render.
export function sanitizeHtml(input) {
  if (!input) return ''
  const doc = new DOMParser().parseFromString(String(input), 'text/html')

  function clean(node) {
    for (let i = node.children.length - 1; i >= 0; i--) {
      const child = node.children[i]
      clean(child)
      const tag = child.tagName
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'LINK' || tag === 'META') {
        node.removeChild(child)
        continue
      }
      if (!ALLOWED.has(tag)) {
        while (child.firstChild) node.insertBefore(child.firstChild, child)
        node.removeChild(child)
        continue
      }
      for (const attr of [...child.attributes]) child.removeAttribute(attr.name)
    }
  }

  clean(doc.body)
  return doc.body.innerHTML.trim()
}
