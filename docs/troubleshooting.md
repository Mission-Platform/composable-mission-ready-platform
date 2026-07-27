# Troubleshooting Guide

## Common Issues

### LCP Performance Issues
**Problem**: Largest Contentful Paint (LCP) is slow (>2.5s)
**Diagnosis**:
1. Run Lighthouse audit via Chrome DevTools > Lighthouse tab
2. Check "Speed Index" and "First Contentful Paint" metrics
3. Identify the LCP element in Performance trace

**Solutions**:
1. Eliminate resource load delay (target: <10% of page load time)
   - Inline critical CSS
   - Defer non-critical JavaScript
   - Preload key resources with `<link rel="preload">
2. Eliminate element render delay (target: <10%)
   - Optimize server-side rendering
   - Reduce main-thread work before LCP
3. Reduce resource load duration (target: ~40%)
   - Compress assets with Brotli/Gzip
   - Use efficient image formats (WebP, AVIF)
   - Implement code splitting

### Memory Leaks
**Problem**: Gradual memory increase over time
**Diagnosis**:
1. Take heap snapshots in Chrome DevTools > Memory tab
2. Compare snapshots to identify retained objects
3. Look for detached DOM elements

**Solutions**:
1. Clear caches properly in components:
   ```ts
   // Before unmount
   cleanup();
   // In Vue composables
   onUnmounted(() => clearInterval(timer));
   ```
2. Avoid global state mutations:
   - Use reactive stores with proper cleanup
   - Clear interval/timeout references
3. Monitor D3 bindings:
   - Always call `select(container).selectAll('*').remove()`

### Build Errors
**Problem**: TypeScript errors during Vite build
**Common causes**:
1. Missing type definitions for external libraries
   ```ts
   // Add to globals.d.ts
   declare module 'some-library';
   ```
2. Incorrect path mappings
   ```json
   // In tsconfig.json
   "paths": {
     "@/*": ["./*"]
   }
   ```
3. Missing peer dependencies
   ```bash
   pnpm add react react-dom -D
   ```

## Debugging Tools

### MCP Server Setup
1. Build the MCP server using `pnpm exec turbo run build --filter @mission-platform/mcp`
2. Start the MCP server using `node mcp/dist/index.js` or configure your AI client / IDE to run it.
3. Refer to [mcp/README.md](../mcp/README.md) for full usage and capability details.

### Network Analysis
**Problem**: Slow API responses
**Diagnosis**:
1. Check waterfall chart in Network tab
2. Verify TTFB (Time to First Byte)
3. Analyze request/response sizes

**Optimizations**:
- Enable compression (Brotli preferred)
- Implement caching strategies:
  ```ts
  // In Vite config
  cache: {
    html: true,
    css: true,
    js: true,
    img: true
  }
  ```
- Use CDN for static assets

## Error Patterns

### "Cannot read property 'x' of undefined"
**Cause**: Accessing properties before data loads
**Fix**:
```ts
// Instead of:
console.log(user.profile.name);

// Use:
console.log(user?.profile?.name);
```

### "Unhandled promise rejection"
**Cause**: Unawaited async operations
**Fix**:
```ts
// Always handle promises:
try {
  await riskyOperation();
} catch (error) {
  console.error('Operation failed:', error);
}
```

### "Module not found"
**Cause**: Incorrect import paths or missing dependencies
**Fix**:
1. Verify package is in `package.json` as dependency
2. Check workspace resolution:
   ```bash
   pnpm add @mission-platform/components --workspace
   ```
3. Clear caches:
   ```bash
   pnpm store prune
   pnpm install --force
   ```

## Performance Benchmarks

| Metric | Target | Measurement Tool |
|--------|--------|------------------|
| LCP | <2.5s | Lighthouse |
| FID | <100ms | Chrome DevTools |
| CLS | <0.1 | Chrome DevTools |
| TBT | <200ms | Web Perf Plugin |
| TTFB | <400ms | Network Tab |

*Note: Targets are based on Core Web Vitals thresholds for "Good" rating.*