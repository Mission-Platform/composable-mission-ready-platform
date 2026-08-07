import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {frameworkResolveConditions} from '@mission-platform/vite-config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Select the React build of Mission Platform packages
    conditions: frameworkResolveConditions('react'),
  },
});
