declare module '*.fws' {
  export const manifest: Readonly<Record<string, unknown>>;
  export function load(): Promise<Readonly<Record<string, (...args: never[]) => unknown>>>;
  export function loadSync(): Readonly<Record<string, (...args: never[]) => unknown>>;
}
