import baseConfig from '@mission-platform/eslint-config';

export default [...baseConfig, { ignores: ['dist/**', 'node_modules/**'] }];
