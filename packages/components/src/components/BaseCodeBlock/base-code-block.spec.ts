import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import BaseCodeBlock from './BaseCodeBlock.vue';

const TS_CODE = `const x: number = 42`;
const JSON_CODE = `{"key": "value"}`;

describe('BaseCodeBlock', () => {
  describe('rendering', () => {
    it('renders a root element with the correct class', () => {
      const wrapper = mount(BaseCodeBlock, { props: { code: TS_CODE } });
      expect(wrapper.classes()).toContain('base-code-block');
    });

    it('renders highlighted code inside a <pre><code> by default', () => {
      const wrapper = mount(BaseCodeBlock, { props: { code: TS_CODE, language: 'typescript' } });
      expect(wrapper.find('pre.base-code-block__pre').exists()).toBe(true);
      expect(wrapper.find('code.base-code-block__code').exists()).toBe(true);
    });

    it('renders a table when showLineNumbers is true', () => {
      const wrapper = mount(BaseCodeBlock, {
        props: { code: TS_CODE, language: 'typescript', showLineNumbers: true },
      });
      expect(wrapper.find('table.base-code-block__table').exists()).toBe(true);
      expect(wrapper.find('pre').exists()).toBe(false);
    });

    it('renders one table row per line of code when showLineNumbers is true', () => {
      const multiline = 'line one\nline two\nline three';
      const wrapper = mount(BaseCodeBlock, {
        props: { code: multiline, language: 'plaintext', showLineNumbers: true },
      });
      const rows = wrapper.findAll('tr.base-code-block__line');
      expect(rows).toHaveLength(3);
    });

    it('renders line numbers starting from 1', () => {
      const wrapper = mount(BaseCodeBlock, {
        props: { code: 'a\nb\nc', language: 'plaintext', showLineNumbers: true },
      });
      const lineNos = wrapper.findAll('td.base-code-block__line-no');
      expect(lineNos[0].text()).toBe('1');
      expect(lineNos[1].text()).toBe('2');
      expect(lineNos[2].text()).toBe('3');
    });
  });

  describe('header', () => {
    it('renders the header when showCopyButton is true (default)', () => {
      const wrapper = mount(BaseCodeBlock, { props: { code: TS_CODE } });
      expect(wrapper.find('.base-code-block__header').exists()).toBe(true);
    });

    it('hides the header when showCopyButton is false and no filename is provided', () => {
      const wrapper = mount(BaseCodeBlock, {
        props: { code: TS_CODE, showCopyButton: false },
      });
      expect(wrapper.find('.base-code-block__header').exists()).toBe(false);
    });

    it('shows the filename when provided', () => {
      const wrapper = mount(BaseCodeBlock, {
        props: { code: TS_CODE, filename: 'src/main.ts' },
      });
      expect(wrapper.find('.base-code-block__filename').text()).toBe('src/main.ts');
      expect(wrapper.find('.base-code-block__language').exists()).toBe(false);
    });

    it('shows the language label when no filename is provided', () => {
      const wrapper = mount(BaseCodeBlock, {
        props: { code: TS_CODE, language: 'typescript' },
      });
      expect(wrapper.find('.base-code-block__language').text()).toBe('typescript');
    });

    it('shows the copy button by default', () => {
      const wrapper = mount(BaseCodeBlock, { props: { code: TS_CODE } });
      expect(wrapper.find('button.base-code-block__copy').exists()).toBe(true);
    });

    it('hides the copy button when showCopyButton is false', () => {
      const wrapper = mount(BaseCodeBlock, {
        props: { code: TS_CODE, showCopyButton: false },
      });
      expect(wrapper.find('button.base-code-block__copy').exists()).toBe(false);
    });

    it('shows the header when filename is provided even if showCopyButton is false', () => {
      const wrapper = mount(BaseCodeBlock, {
        props: { code: TS_CODE, filename: 'index.ts', showCopyButton: false },
      });
      expect(wrapper.find('.base-code-block__header').exists()).toBe(true);
    });
  });

  describe('syntax highlighting', () => {
    it('produces highlighted HTML for a known language', () => {
      const wrapper = mount(BaseCodeBlock, {
        props: { code: JSON_CODE, language: 'json' },
      });
      const code = wrapper.find('code.base-code-block__code');
      // highlight.js wraps tokens in <span> elements
      expect(code.html()).toContain('<span');
    });

    it('renders plaintext code without span wrappers', () => {
      const wrapper = mount(BaseCodeBlock, {
        props: { code: 'hello world', language: 'plaintext' },
      });
      const code = wrapper.find('code.base-code-block__code');
      expect(code.text()).toContain('hello world');
    });
  });

  describe('prop defaults', () => {
    it('defaults language to plaintext', () => {
      const wrapper = mount(BaseCodeBlock, { props: { code: 'text' } });
      expect(wrapper.find('.base-code-block__language').text()).toBe('plaintext');
    });

    it('defaults showLineNumbers to false', () => {
      const wrapper = mount(BaseCodeBlock, { props: { code: 'text' } });
      expect(wrapper.find('table').exists()).toBe(false);
      expect(wrapper.find('pre').exists()).toBe(true);
    });

    it('defaults showCopyButton to true', () => {
      const wrapper = mount(BaseCodeBlock, { props: { code: 'text' } });
      expect(wrapper.find('button.base-code-block__copy').exists()).toBe(true);
    });
  });
});
