// Type shim for YAML locale files imported as plain objects.
declare module '*.yaml' {
  const value: Record<string, string>
  export default value
}

declare module '*.yml' {
  const value: Record<string, string>
  export default value
}
