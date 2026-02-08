/**
 * Decode HTML entities and strip tags for safe plain-text email display.
 * Also handles URL-encoded sequences and common email artifacts.
 */
const ENTITY_MAP = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#x27;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
  '&rsquo;': '\u2019',
  '&lsquo;': '\u2018',
  '&rdquo;': '\u201D',
  '&ldquo;': '\u201C',
  '&mdash;': '\u2014',
  '&ndash;': '\u2013',
  '&hellip;': '\u2026',
}

function decodeHtmlEntities(str) {
  if (!str || typeof str !== 'string') return str
  let s = str
  for (const [ent, ch] of Object.entries(ENTITY_MAP)) {
    s = s.replace(new RegExp(ent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ch)
  }
  s = s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
  s = s.replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
  return s
}

/** Decode percent-encoded sequences (e.g. %3D -> =) that sometimes appear in email bodies. */
function decodePercentEncoded(str) {
  if (!str || typeof str !== 'string') return str
  try {
    return str.replace(/%([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
  } catch {
    return str
  }
}

/** Remove common email artifacts: separator lines of = or -, and soft line breaks (= at EOL). */
function removeEmailArtifacts(str) {
  if (!str || typeof str !== 'string') return str
  return str
    .replace(/=\r?\n/g, '') // quoted-printable soft line break
    .replace(/^(?:=+|-+)\s*$/gm, '') // lines of only = or -
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function stripHtml(html) {
  if (!html) return ''
  const doc = typeof document !== 'undefined' && document.createElement
    ? (() => {
        const d = document.createElement('div')
        d.innerHTML = html
        return d
      })()
    : null
  if (doc) {
    return decodeHtmlEntities(doc.textContent || doc.innerText || '').replace(/\s+/g, ' ').trim()
  }
  return decodeHtmlEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .trim()
  )
}

/**
 * Get clean plain text body from email, removing subject duplication and artifacts.
 */
export function getDisplayBody(email) {
  if (!email) return ''

  // Prefer body_plain (already cleaned by backend), fall back to body, then snippet
  let raw = email.body_plain || email.body || email.snippet || ''
  if (!raw) return ''

  // Decode URL-style percent encoding that sometimes appears in forwarded/HTML emails
  raw = decodePercentEncoded(raw)

  let text = raw
  // If it looks like HTML, strip it
  if (text.includes('<') && text.includes('>') && /<[a-z][\s\S]*>/i.test(text)) {
    text = stripHtml(text)
  } else {
    text = decodeHtmlEntities(text)
  }

  // Remove quoted-printable and separator line artifacts
  text = removeEmailArtifacts(text)

  // Remove subject if duplicated at start of body
  if (email.subject) {
    const subj = email.subject.trim()
    if (subj && text.startsWith(subj)) {
      text = text.slice(subj.length).replace(/^\s*\n*/, '')
    }
  }

  // Clean asterisk bold markers: *text* -> text
  text = text.replace(/\*([^*\n]+)\*/g, '$1')

  // Collapse excessive whitespace
  text = text.replace(/\n{3,}/g, '\n\n').trim()

  return text
}

/**
 * Split body text into paragraphs for rendering.
 */
export function splitIntoParagraphs(text) {
  if (!text) return []
  return text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
}
