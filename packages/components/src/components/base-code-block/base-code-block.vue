<script lang="ts" setup>
  /**
   * `BaseCodeBlock` — Code block component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import hljs from 'highlight.js/lib/core';
  // Register a curated set of commonly-used languages
  import bash from 'highlight.js/lib/languages/bash';
  import css from 'highlight.js/lib/languages/css';
  import dockerfile from 'highlight.js/lib/languages/dockerfile';
  import go from 'highlight.js/lib/languages/go';
  import ini from 'highlight.js/lib/languages/ini';
  import javascript from 'highlight.js/lib/languages/javascript';
  import json from 'highlight.js/lib/languages/json';
  import markdown from 'highlight.js/lib/languages/markdown';
  import plaintext from 'highlight.js/lib/languages/plaintext';
  import python from 'highlight.js/lib/languages/python';
  import rust from 'highlight.js/lib/languages/rust';
  import scss from 'highlight.js/lib/languages/scss';
  import shell from 'highlight.js/lib/languages/shell';
  import sql from 'highlight.js/lib/languages/sql';
  import typescript from 'highlight.js/lib/languages/typescript';
  import xml from 'highlight.js/lib/languages/xml';
  import yaml from 'highlight.js/lib/languages/yaml';
  import { computed, ref } from 'vue';

  const props = withDefaults(
    defineProps<{
      code: string;
      language?: CodeBlockLanguage;
      filename?: string;
      showLineNumbers?: boolean;
      showCopyButton?: boolean;
    }>(),
    {
      language: 'plaintext',
      filename: undefined,
      showLineNumbers: false,
      showCopyButton: true,
    },
  );
  hljs.registerLanguage('bash', bash);
  hljs.registerLanguage('css', css);
  hljs.registerLanguage('dockerfile', dockerfile);
  hljs.registerLanguage('go', go);
  hljs.registerLanguage('ini', ini);
  hljs.registerLanguage('javascript', javascript);
  hljs.registerLanguage('json', json);
  hljs.registerLanguage('markdown', markdown);
  hljs.registerLanguage('plaintext', plaintext);
  hljs.registerLanguage('python', python);
  hljs.registerLanguage('rust', rust);
  hljs.registerLanguage('scss', scss);
  hljs.registerLanguage('shell', shell);
  hljs.registerLanguage('sql', sql);
  hljs.registerLanguage('typescript', typescript);
  hljs.registerLanguage('xml', xml);
  hljs.registerLanguage('yaml', yaml);

  export type CodeBlockLanguage =
    | 'bash'
    | 'css'
    | 'dockerfile'
    | 'go'
    | 'ini'
    | 'javascript'
    | 'json'
    | 'markdown'
    | 'plaintext'
    | 'python'
    | 'rust'
    | 'scss'
    | 'shell'
    | 'sql'
    | 'typescript'
    | 'xml'
    | 'yaml';

  const copied = ref(false);
  let copyTimeout: ReturnType<typeof setTimeout> | undefined;

  const highlighted = computed(() => {
    const lang = props.language ?? 'plaintext';
    if (hljs.getLanguage(lang)) {
      return hljs.highlight(props.code, { language: lang }).value;
    }
    return hljs.highlightAuto(props.code).value;
  });

  const lines = computed(() => highlighted.value.split('\n'));

  async function copyCode() {
    await navigator.clipboard.writeText(props.code);
    copied.value = true;
    clearTimeout(copyTimeout);
    copyTimeout = setTimeout(() => {
      copied.value = false;
    }, 2000);
  }
</script>

<template>
  <div class="base-code-block">
    <div
      v-if="filename || showCopyButton"
      class="base-code-block__header"
    >
      <span
        v-if="filename"
        class="base-code-block__filename"
      >
        {{ filename }}
      </span>
      <span
        v-else
        class="base-code-block__language"
      >
        {{ language }}
      </span>

      <button
        v-if="showCopyButton"
        :aria-label="copied ? 'Copied' : 'Copy code'"
        class="base-code-block__copy"
        type="button"
        @click="copyCode"
      >
        <svg
          v-if="!copied"
          aria-hidden="true"
          fill="none"
          height="14"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          viewBox="0 0 24 24"
          width="14"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            height="14"
            rx="2"
            ry="2"
            width="14"
            x="8"
            y="8"
          />
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
        <svg
          v-else
          aria-hidden="true"
          fill="none"
          height="14"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          viewBox="0 0 24 24"
          width="14"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
        {{ copied ? 'Copied' : 'Copy' }}
      </button>
    </div>

    <div
      class="base-code-block__body"
      tabindex="0"
    >
      <table
        v-if="showLineNumbers"
        aria-hidden="true"
        class="base-code-block__table"
      >
        <tbody>
          <tr
            v-for="(line, i) in lines"
            :key="i"
            class="base-code-block__line"
          >
            <td class="base-code-block__line-no">
              {{ i + 1 }}
            </td>
            <!-- eslint-disable vue/no-v-html -->
            <td
              class="base-code-block__line-code"
              v-html="line || '&nbsp;'"
            />
            <!-- eslint-enable vue/no-v-html -->
          </tr>
        </tbody>
      </table>

      <!-- eslint-disable vue/no-v-html -->
      <pre
        v-else
        class="base-code-block__pre"
      ><code
class="base-code-block__code hljs"
             v-html="highlighted"
      /></pre>
      <!-- eslint-enable vue/no-v-html -->
    </div>
  </div>
</template>

<style lang="scss">
  /* Light theme (default) */
  @import 'highlight.js/styles/github.css';

  /* Dark theme — override hljs colours when the platform dark theme is active */
  [data-theme='dark'],
  .theme-dark {
    /* stylelint-disable-next-line no-invalid-position-at-import-rule */
    @import 'highlight.js/styles/github-dark.css';
  }

  /* WCAG contrast override for 3rd-party highlight.js theme (github.css). */

  /* These colors MUST stay as hardcoded hex values — they target specific hljs */

  /* token selectors from an external library and are chosen purely for contrast */

  /* ratios against the fixed hljs background (#f2f2f5).  CSS vars cannot be */

  /* used here because hljs renders into pre-generated DOM that does not */

  /* inherit our token CSS custom properties correctly in all browsers. */

  /* stylelint-disable selector-class-pattern */

  /* Covers selectors from github.css that use #d73a49 (ratio 4.09:1, fails WCAG AA) */
  :not([data-theme='dark'], .theme-dark) .hljs-keyword,
  :not([data-theme='dark'], .theme-dark) .hljs-meta .hljs-keyword,
  :not([data-theme='dark'], .theme-dark) .hljs-template-tag,
  :not([data-theme='dark'], .theme-dark) .hljs-template-variable,
  :not([data-theme='dark'], .theme-dark) .hljs-type,
  :not([data-theme='dark'], .theme-dark) .hljs-variable.language_ {
    color: #a93226; /* 7.47:1 on #f2f2f5 */
  }

  /* Covers selectors from github.css that use #e36209 (ratio 3.12:1, fails WCAG AA) */
  :not([data-theme='dark'], .theme-dark) .hljs-built_in,
  :not([data-theme='dark'], .theme-dark) .hljs-symbol {
    color: #a05200; /* 5.89:1 on #f2f2f5 */
  }

  /* stylelint-enable selector-class-pattern */
</style>

<style lang="scss" scoped>
  .base-code-block {
    border: 1px solid var(--mp-color-border-default);
    border-radius: var(--mp-radius-md);
    background-color: var(--mp-color-bg-sunken);
    overflow: hidden;
    font-family: var(--mp-font-family-mono);
    font-size: var(--mp-font-size-sm);

    &__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--mp-spacing-2) var(--mp-spacing-4);
      border-bottom: 1px solid var(--mp-color-border-default);
      background-color: var(--mp-color-bg-muted);
      gap: var(--mp-spacing-3);
    }

    &__filename {
      font-family: var(--mp-font-family-mono);
      font-size: var(--mp-font-size-xs);
      color: var(--mp-color-text-secondary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
      min-width: 0;
    }

    &__language {
      font-family: var(--mp-font-family-mono);
      font-size: var(--mp-font-size-xs);
      color: var(--mp-color-text-tertiary);
      text-transform: lowercase;
      flex: 1;
      min-width: 0;
    }

    &__copy {
      display: inline-flex;
      align-items: center;
      gap: var(--mp-spacing-1);
      padding: var(--mp-spacing-1) var(--mp-spacing-2);
      border: 1px solid var(--mp-color-border-default);
      border-radius: var(--mp-radius-sm);
      background: transparent;
      color: var(--mp-color-text-tertiary);
      font-family: var(--mp-font-family-sans);
      font-size: var(--mp-font-size-xs);
      line-height: 1;
      cursor: pointer;
      transition:
        color 150ms ease,
        border-color 150ms ease,
        background-color 150ms ease;
      white-space: nowrap;
      flex-shrink: 0;

      &:hover {
        color: var(--mp-color-text-primary);
        border-color: var(--mp-color-border-strong);
        background-color: var(--mp-color-bg-surface);
      }

      &:focus-visible {
        outline: 2px solid var(--mp-color-border-focus);
        outline-offset: 2px;
      }
    }

    &__body {
      overflow-x: auto;
    }

    &__pre {
      margin: 0;
      padding: var(--mp-spacing-4);
      background: transparent;
      overflow: visible;
    }

    &__code {
      font-family: var(--mp-font-family-mono);
      font-size: var(--mp-font-size-sm);
      background: transparent !important;
      padding: 0 !important;
      white-space: pre;
      tab-size: 2;
      overflow-x: visible; /* Scrolling handled by parent .base-code-block__body */
    }

    &__table {
      width: 100%;
      border-collapse: collapse;
      padding: var(--mp-spacing-2) 0;
    }

    &__line {
      line-height: var(--mp-line-height-relaxed);

      &:first-child {
        padding-top: var(--mp-spacing-2);
      }

      &:last-child {
        padding-bottom: var(--mp-spacing-2);
      }
    }

    &__line-no {
      user-select: none;
      text-align: right;
      padding: 0 var(--mp-spacing-3) 0 var(--mp-spacing-4);
      color: var(--mp-color-text-disabled);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
      width: 1%;
      vertical-align: top;
    }

    &__line-code {
      padding: 0 var(--mp-spacing-4) 0 var(--mp-spacing-2);
      white-space: pre;
      tab-size: 2;
      vertical-align: top;
    }
  }
</style>
