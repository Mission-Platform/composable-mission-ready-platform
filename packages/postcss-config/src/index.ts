import autoprefixer from 'autoprefixer'

import type { AcceptedPlugin } from 'postcss'


const config: { plugins: AcceptedPlugin[] } = {
  plugins: [autoprefixer()],
}

export default config
