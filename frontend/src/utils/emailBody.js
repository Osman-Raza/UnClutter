/**
 * Convert HTML email body to plain text for display (no raw tags or long URLs in markup).
 */
const ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
  '&#x27;': "'",
}

function decodeEntities(text) {
  let out = text
  for (const [entity, char] of Object.entries(ENTITIES)) {
    out = out.split(entity).join(char)
  }
  return out.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
}

export function htmlToPlainText(html) {
  if (!html || typeof html !== 'string') return ''
  let text = html
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
  text = text.replace(/<br\s*\/?>/gi, '\n')
  text = text.replace(/<\/p>/gi, '\n')
  text = text.replace(/<\/div>/gi, '\n')
  text = text.replace(/<\/tr>/gi, '\n')
  text = text.replace(/<[^>]+>/g, ' ')
  text = decodeEntities(text)
  // Hide raw URLs (http/https) so only readable content is shown
  text = text.replace(/https?:\/\/[^\s)\]]+/g, '')
  text = text.replace(/\s*\(\s*\)\s*/g, ' ')
  text = text.replace(/\s+/g, ' ').replace(/\n\s+/g, '\n').trim()
  return text
}
