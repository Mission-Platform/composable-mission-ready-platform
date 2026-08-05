import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Regression coverage for the "code-block dialog locks the browser up when the
 * language is changed" bug.
 *
 * The freeze never reproduces through the neutral SSR adapter (there the
 * `@mission-platform/forge` hooks are single-shot no-ops), so this suite mounts
 * the **compiled Vue build** (`@mission-platform/wysiwyg/vue`) — where the
 * neutral `useState`/`useEffect`/`useMemo` become real Vue reactivity — and
 * drives the exact interaction that hangs in the browser: open the code-block
 * dialog, change the language in the picker, then type into the code field.
 *
 * The real Monaco editor cannot mount in jsdom (its lazy `import('monaco-editor')`
 * needs canvas/worker APIs, and its container template-ref never resolves), so
 * the leaf `BaseMonacoEditor` is replaced by a faithful stand-in that preserves
 * the reactive contract that matters here: it echoes external value changes back
 * as `update:modelValue` (exactly like Monaco's `setValue` firing
 * `onDidChangeModelContent`) and exposes its language via `data-language`. The
 * whole surrounding graph — `BaseWysiwygEditor` → `BaseSchemaFormDialog` →
 * `BaseSchemaForm` → `BaseSelect` — is the real compiled build, which is where a
 * language-change re-render loop would actually manifest. A hard change-event
 * budget converts any runaway into a fast, explicit failure instead of hanging.
 */

/** Guard: if the code field echoes more than this, treat it as a runaway loop. */
const MAX_ECHOES = 2000;

/** Total value-echoes emitted by the stubbed code editor across the test. */
let echoCount = 0;

vi.mock('@mission-platform/components/vue', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  const { defineComponent, h, ref, watch } = await import('vue');

  // A faithful stand-in for `BaseMonacoEditor`: a controlled textarea that (a)
  // reports edits via `update:modelValue`, and (b) mirrors external value
  // changes back out — the same round-trip Monaco performs when `setValue`
  // fires `onDidChangeModelContent`. `data-language` mirrors the `language`
  // prop so a test can assert the picker drives the editor.
  const BaseMonacoEditorStub = defineComponent({
    name: 'BaseMonacoEditorStub',
    props: {
      modelValue: { type: String, default: '' },
      language: { type: String, default: 'plaintext' },
      height: { type: String, default: '' },
      readonly: { type: Boolean, default: false },
      spellCheck: { type: Boolean, default: false },
    },
    emits: ['update:modelValue', 'change'],
    setup(props, { emit }) {
      const current = ref(props.modelValue);
      watch(
        () => props.modelValue,
        (next) => {
          if (next !== current.value) {
            current.value = next;
            // Mirror Monaco: a programmatic value change fires a content-change,
            // so the editor re-emits the (now-current) value.
            echoCount += 1;
            if (echoCount > MAX_ECHOES) {
              throw new Error(
                `Code editor echoed ${echoCount} times — the code-block dialog is stuck ` +
                  'in a value-mirror/emit loop (language-change lockup).',
              );
            }
            emit('update:modelValue', current.value);
            emit('change', current.value);
          }
        },
      );
      return () =>
        h('textarea', {
          'aria-label': 'Code editor',
          'data-language': props.language,
          value: current.value,
          onInput: (event: Event) => {
            current.value = (event.target as HTMLTextAreaElement).value;
            emit('update:modelValue', current.value);
            emit('change', current.value);
          },
        });
    },
  });

  return { ...original, BaseMonacoEditor: BaseMonacoEditorStub };
});

async function flush(times = 15): Promise<void> {
  const { nextTick } = await import('vue');
  for (let index = 0; index < times; index += 1) {
    await nextTick();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 4));
  }
}

/** Find an element by its accessible name (`aria-label`). */
function byAriaLabel(label: string): HTMLElement | undefined {
  return [...document.querySelectorAll<HTMLElement>('[aria-label]')].find(
    (element) => element.getAttribute('aria-label') === label,
  );
}

describe('BaseWysiwygEditor code-block dialog (compiled Vue build)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    echoCount = 0;
    vi.restoreAllMocks();
  });

  it('does not lock up when the code-block language is changed and code is typed', async () => {
    const { createApp, h } = await import('vue');
    const { BaseWysiwygEditor } = (await import('@mission-platform/wysiwyg/vue')) as unknown as {
      BaseWysiwygEditor: unknown;
    };

    const warnings: string[] = [];
    const errors: string[] = [];

    const host = document.createElement('div');
    document.body.append(host);

    const app = createApp({
      render: () => h(BaseWysiwygEditor as never, { modelValue: '<p>hello</p>' }),
    });
    app.config.warnHandler = (message: string) => warnings.push(message);
    app.config.errorHandler = (error: unknown) => errors.push(String(error));

    app.mount(host);
    await flush();

    // Open the code-block dialog from the toolbar.
    const codeButton = byAriaLabel('Code block');
    expect(codeButton, 'the code-block toolbar control should be present').not.toBeUndefined();
    codeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flush();

    // The code field must be present and start on the default language.
    const codeField = byAriaLabel('Code editor') as HTMLTextAreaElement | undefined;
    expect(codeField, 'the code editor field should be rendered in the dialog').not.toBeUndefined();
    expect(codeField?.dataset.language).toBe('plaintext');

    // Change the language via the language picker. `BaseSelect` keeps a hidden
    // native `<select>` in sync with its listbox, so driving it (set value +
    // `change`) is the deterministic equivalent of choosing an option.
    const nativeSelect = document.querySelector<HTMLSelectElement>('select');
    expect(nativeSelect, 'the language picker should render a native <select>').not.toBeNull();
    expect(
      [...(nativeSelect?.options ?? [])].some((option) => option.value === 'typescript'),
      'the "typescript" language option should be available',
    ).toBe(true);
    if (nativeSelect) {
      nativeSelect.value = 'typescript';
      nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
    await flush();

    // The picker must drive the embedded editor's language (the core fix).
    const editorAfterPick = byAriaLabel('Code editor');
    expect(editorAfterPick?.dataset.language).toBe('typescript');

    // Type into the code field the way a user would after picking a language.
    const field = byAriaLabel('Code editor') as HTMLTextAreaElement | undefined;
    if (field) {
      field.value = 'const answer = 42;';
      field.dispatchEvent(new Event('input', { bubbles: true }));
    }
    await flush(20);

    // No Vue recursive-update reports and no runaway value-echo loop.
    const recursion = [...warnings, ...errors].filter((message) => /recursive updates|Maximum/i.test(message));
    expect(recursion, `unexpected recursive-update reports: ${recursion.join(' | ')}`).toHaveLength(0);
    expect(errors, `unexpected runtime errors: ${errors.join(' | ')}`).toHaveLength(0);
    expect(echoCount).toBeLessThan(MAX_ECHOES);

    app.unmount();
    host.remove();
  });
});
