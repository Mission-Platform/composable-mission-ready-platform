# Workers Configuration

This document explains the project's worker configuration and usage guidelines.

## Current Status

The `workers/` directory contains several Cloudflare Worker implementations, including:
- `base-spa`: Base SPA worker for serving static assets with an SPA-style fallback.
- `api-proxy`: Worker for proxying requests to external services.

## When to Add Workers

You should add a worker to the `workers/` directory when:

1. **Cloudflare Worker Required**: Your application requires running code on Cloudflare's edge network
2. **Stateless Operations**: You need to perform stateless operations (e.g., API proxying, scheduled tasks) that benefit from edge computing
3. **Event-Driven Processing**: You need to respond to events (e.g., HTTP requests, cron schedules, storage changes) at the edge

## Worker Structure

When adding a worker, follow this structure:

```
workers/
├── api-proxy/
│   ├── index.js
│   └── README.md
└── scheduled-tasks/
    ├── index.js
    └── schedule.json
```

## Documentation Requirements

For each worker you add, you must:

1. **Create a `README.md` file** in the worker's directory explaining:
   - Purpose of the worker
   - Configuration requirements
   - Deployment instructions
   - Usage examples

2. **Document API endpoints or schedules** (if applicable)

3. **Provide environment variable documentation** for any configuration needed

## Example Worker Documentation

### API Proxy Worker

This worker proxies requests to external services:

**File Structure:**
```
workers/api-proxy/
├── index.js
└── README.md
```

**index.js:**
```javascript
export default {
  async fetch(request, env, ctx) {
    // Proxy logic here
  },
};
```

**README.md:**
```markdown
# API Proxy Worker

This worker proxies requests to external services and adds authentication headers.

## Configuration

- `EXTERNAL_API_URL`: The base URL of the external API
- `API_KEY`: Authentication key for the external API

## Usage

Proxy a request to `/api/data` as:
```
curl https://api.example.com/api/data \
  -H "Authorization: Bearer $API_KEY"
```

## Deployment

Deploy using Wrangler:
```bash
wrangler deploy workers/api-proxy
```
```

## Best Practices

- **Keep workers small**: Each worker should have a single, well-defined purpose
- **Use environment variables**: Never hardcode secrets in worker code
- **Test locally**: Use `wrangler dev` for local testing
- **Monitor usage**: Set up analytics to track worker performance
- **Follow security best practices**: Validate all input and use least-privilege principles

## Troubleshooting

Common issues and solutions:

- **Worker not deploying**: Check Wrangler configuration and authentication
- **Timeouts**: Increase the `timeout` setting in your worker configuration
- **Memory issues**: Optimize code and reduce memory usage

## See Also

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)