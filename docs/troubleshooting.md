# Troubleshooting Guide

This guide provides solutions for common issues encountered during development, build, and deployment within the Mission
Platform monorepo. It is structured as a **How-to guide** for diagnosing and resolving technical problems.

## Performance Issues

### Slow LCP (Largest Contentful Paint)

**Problem**: LCP is above the 2.5s threshold for a "Good" rating.

**Diagnosis**:

1. Run a Lighthouse audit in Chrome DevTools.
2. Identify the LCP element in the "Performance" panel.
3. Check the "Network" tab for resource load delays.

**Solutions**:

- **Inline Critical CSS**: Ensure styles required for above-the-fold content are inlined.
- **Image Optimization**: Use WebP/AVIF formats and provide `srcset` for responsive images.
- **Resource Preloading**: Use `<link rel="preload">` for the LCP image or critical fonts.
- **Minimize Main Thread Work**: Defer non-essential JavaScript using `async` or `defer`.

### Memory Leaks

**Problem**: The application consumes increasing amounts of memory over time, eventually leading to crashes.

**Diagnosis**:

1. Take multiple "Heap Snapshots" in the Chrome DevTools Memory tab.
2. Compare snapshots to identify objects that are growing in number or size.
3. Look for "Detached DOM Elements".

**Solutions**:

- **Cleanup in Composables**: Always clear timers and remove event listeners in `onUnmounted`.
- **Store Management**: Ensure reactive state in Pinia or other stores is cleared when no longer needed.
- **Dispose of Observables**: If using RxJS, ensure all subscriptions are unsubscribed.

## Build and Workspace Issues

### Turborepo Caching Errors

**Problem**: Changes are not being reflected in the build, or the build fails with stale artifacts.

**Solution**: Force a fresh build by bypassing the cache or manually clearing it.

```bash
# Force a build without cache
pnpm build:force

# Manually clear the turbo cache
rm -rf .turbo
```

### Module Not Found / Workspace Resolution

**Problem**: TypeScript or Vite cannot find a package that is defined in the workspace.

**Solutions**:

1. Verify the package is listed in the consuming workspace's `package.json`.
2. Ensure the version matches (`workspace:*` is recommended).
3. Run `pnpm install` to refresh symlinks.
4. If issues persist, try a deep clean:
   ```bash
   pnpm -r exec rm -rf node_modules
   pnpm install
   ```

### Type Errors in CI but not Local

**Problem**: Build fails in CI with TypeScript errors that don't appear in your IDE.

**Solution**: Run the type checker locally across the entire workspace.

```bash
pnpm exec turbo run build:check
```

This ensures that all package boundaries are correctly respected and that types validate cleanly.

## MCP Server Troubleshooting

### Failed to Connect

**Problem**: Your AI client or IDE cannot connect to the Mission Platform MCP server.

**Diagnosis**:

1. Verify the MCP server is built: `pnpm exec turbo run build --filter @mission-platform/mcp-*`.
2. Check if the server starts manually: `node mcp/developer/dist/index.js`.

**Solutions**:

- Ensure you are using the absolute path to the node binary and the script in your client configuration.
- Check the MCP server logs for specific error messages (e.g., missing environment variables).

## Common Error Patterns

### "Cannot read property of undefined"

**Cause**: Accessing properties on a null or undefined object, often before data has finished loading. **Fix**: Use
optional chaining (`?.`) or provide default values.

```typescript
// Instead of:
const name = user.profile.name;

// Use:
const name = user?.profile?.name ?? 'Guest';
```

### "Unhandled Promise Rejection"

**Cause**: An async function threw an error that wasn't caught. **Fix**: Always wrap async calls in `try/catch` blocks.

```typescript
try {
  await fetchData();
} catch (error) {
  handleError(error);
}
```

## Related Resources

- [Best Practices](best-practices.md)
- [Development Setup](development-setup.md)
- [Testing Guide](testing.md)
