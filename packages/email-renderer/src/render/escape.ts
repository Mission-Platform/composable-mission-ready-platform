const URL_ATTRIBUTES = new Set(['href', 'src', 'action', 'formaction', 'cite', 'background', 'poster']);
const URL_CONTROLS = /[\u0000-\u001F\u007F]/g;
const PERCENT_ENCODED_BYTE = /%([0-9a-f]{2})/gi;

/** Escape text and attribute content for HTML serialization. */
export function escapeHtml(value: string): string {
  return value.replaceAll(/[&<>"']/g, (character) => {
    switch (character) {
      case '&': {
        return '&amp;';
      }
      case '<': {
        return '&lt;';
      }
      case '>': {
        return '&gt;';
      }
      case '"': {
        return '&quot;';
      }
      case "'": {
        return '&#39;';
      }
      default: {
        return character;
      }
    }
  });
}

/** Reject schemes that can execute code or load an unexpected resource. */
export function validateUrl(value: string, attribute: string): string {
  const normalized = value.trim().replaceAll(URL_CONTROLS, '');
  if (normalized.length === 0) {
    throw new Error(`Email ${attribute} must not be empty.`);
  }

  const schemeCandidate = normalized
    .replaceAll(PERCENT_ENCODED_BYTE, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replaceAll(URL_CONTROLS, '');

  if (/^(?:javascript|vbscript|data):/i.test(schemeCandidate)) {
    throw new Error(`Email ${attribute} contains a forbidden URL scheme.`);
  }

  if (/^[a-z][a-z\d+.-]*:/i.test(schemeCandidate) && !/^(?:https?|mailto|tel):/i.test(schemeCandidate)) {
    throw new Error(`Email ${attribute} contains an unsupported URL scheme.`);
  }

  return normalized;
}

export function isUrlAttribute(attribute: string): boolean {
  return URL_ATTRIBUTES.has(attribute);
}
