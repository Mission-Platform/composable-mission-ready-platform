import markdown from '@eslint/markdown';
import baseConfig from '@mission-platform/eslint-config';

const generatedReferenceMarkdown = '**/docs/reference/generated/**/*.md';
const generatedReferenceCodeBlocks = `${generatedReferenceMarkdown}/**`;

const generatedReferenceMarkdownConfig = {
  files: [generatedReferenceMarkdown],
  rules: {
    'import-x/no-restricted-paths': 'off',
  },
};

const scopeGeneratedReferenceConfig = (config) => ({
  ...config,
  files: config.files?.map((pattern) => {
    if (pattern === '**/*.md/**') {
      return generatedReferenceCodeBlocks;
    }
    if (pattern === '**/*.md') {
      return generatedReferenceMarkdown;
    }
    return pattern;
  }) ?? [generatedReferenceMarkdown],
});

const generatedReferenceMarkdownConfigSet = [
  ...markdown.configs.recommended.map((config) => scopeGeneratedReferenceConfig(config)),
  ...markdown.configs.processor.map((config) => scopeGeneratedReferenceConfig(config)),
];

export default [...baseConfig, generatedReferenceMarkdownConfig, ...generatedReferenceMarkdownConfigSet];
