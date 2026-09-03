const INVALID_NAME_CHARACTERS = /[^\p{L}\p{N}]+/gu;

function words(value: string): string[] {
  return value.trim().replaceAll(INVALID_NAME_CHARACTERS, ' ').split(/\s+/).filter(Boolean);
}

/** Create a stable PascalCase identifier from a Figma layer or frame name. */
export function normalizeComponentName(value: string, fallback = 'GeneratedComponent'): string {
  const normalized = words(value)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLocaleLowerCase()}`)
    .join('');
  const result = normalized || fallback;
  return /^\p{N}/u.test(result) ? `Component${result}` : result;
}

/** Create a safe kebab-case file stem from a Figma layer or frame name. */
export function normalizeFileName(value: string, fallback = 'generated-component'): string {
  const normalized = words(value)
    .map((word) => word.toLocaleLowerCase())
    .join('-');
  return normalized || fallback;
}
