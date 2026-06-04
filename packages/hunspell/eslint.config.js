import baseConfig from '@mission-platform/eslint-config';

export default [...baseConfig, { ignores: ['src/hunspell/dictionaries', 'src/wasm'] }];
