const URL_ATTRIBUTES = new Set(['href', 'src', 'action', 'formaction', 'cite', 'background', 'poster']);

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
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`Email ${attribute} must not be empty.`);
  }

  if (/^(?:javascript|vbscript|data):/i.test(normalized)) {
    throw new Error(`Email ${attribute} contains a forbidden URL scheme.`);
  }

  if (/^[a-z][a-z\d+.-]*:/i.test(normalized) && !/^(?:https?|mailto|tel):/i.test(normalized)) {
    throw new Error(`Email ${attribute} contains an unsupported URL scheme.`);
  }

  return normalized;
}

export function isUrlAttribute(attribute: string): boolean {
  return URL_ATTRIBUTES.has(attribute);
}
