import { cloudflare } from '@cloudflare/vite-plugin';
import { redwood } from 'rwsdk/vite';
import { defineConfig } from 'vite';

// RedwoodSDK server/client app.
// - `cloudflare()` wires the Worker runtime (Durable Objects, bindings) into Vite.
// - `redwood()` adds SSR, React Server Components and Server Functions.
// React is handled by the redwood plugin, so no separate React plugin is required.
export default defineConfig({
  plugins: [
    cloudflare({
      viteEnvironment: { name: 'worker' },
    }),
    redwood(),
  ],
});
