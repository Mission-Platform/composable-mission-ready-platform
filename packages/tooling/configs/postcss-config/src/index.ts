import autoprefixer from 'autoprefixer';

import type { AcceptedPlugin } from 'postcss';

const config: { plugins: AcceptedPlugin[] } = {
  plugins: [autoprefixer({ cascade: true, add: true, remove: true, supports: true, flexbox: 'no-2009', grid: false })],
};

export default config;
