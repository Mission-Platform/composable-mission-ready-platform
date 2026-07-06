# @mission-platform/workers/api-proxy

## Description
A Cloudflare Worker that proxies requests to another service (example.com).

## Usage
This worker acts as a proxy, forwarding incoming requests to `https://api.example.com` and returning the response.

## Configuration
1. Update the target hostname in the code:
   ```javascript
   url.hostname = 'api.example.com';
   ```

2. Configure your `wrangler.jsonc` file:
   ```jsonc
   {
     "name": "api-proxy",
     "main": "src/index.js",
     "compatibility_date": "2026-01-01",
     "triggers": {
       "http": {
         "path": "/api/*"
       }
     }
   }
   ```

## Deployment
1. Build the worker:
   ```bash
   wrangler build
   ```

2. Deploy to Cloudflare:
   ```bash
   wrangler deploy
   ```

## Example Request
```bash
curl https://your-worker.cloudflare.com/api/users/123
# This will proxy to https://api.example.com/users/123
```

## Customization
- Change the target domain by modifying `url.hostname`
- Add authentication headers if needed
- Implement rate limiting or caching as required