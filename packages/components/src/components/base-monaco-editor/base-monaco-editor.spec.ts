import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import BaseMonacoEditor from './base-monaco-editor.vue';

// Monaco is now loaded lazily via `await import('monaco-editor')` inside
// `onMounted`, so the editor is only instantiated after the dynamic-import
// microtask has settled. Wrap `mount` in a helper that flushes the pending
// promises so the rest of the suite can keep its synchronous assertions
// against the Monaco mocks below.
async function mountEditor(options?: Parameters<typeof mount>[1]): Promise<ReturnType<typeof mount>> {
  const wrapper = mount(BaseMonacoEditor, options);
  await flushPromises();
  return wrapper;
}

// ── Monaco mock ──────────────────────────────────────────────────────────────
// Monaco editor requires a real browser environment with canvas / worker
// support which is unavailable in jsdom.  We mock the ESM import so we can
// test the Vue component's props, DOM structure, and reactive behaviour.
//
// vi.mock is hoisted to the top of the file by Vitest, so all variables
// referenced inside the factory must also be hoisted via vi.hoisted().

const {
  mockDispose,
  mockSetValue,
  mockGetValue,
  mockUpdateOptions,
  mockGetModel: _mockGetModel,
  mockSetTheme,
  mockSetModelLanguage,
  mockCreate,
  mockRegisterCompletionItemProvider,
  mockCompletionDispose,
  onDidChangeModelContentListeners,
  onDidBlurEditorTextListeners,
  onDidFocusEditorTextListeners,
  mockEditorInstance,
  MarkerSeverity,
} = vi.hoisted(() => {
  const onDidChangeModelContentListeners: Array<() => void> = [];
  const onDidBlurEditorTextListeners: Array<() => void> = [];
  const onDidFocusEditorTextListeners: Array<() => void> = [];

  const mockDispose = vi.fn();
  const mockSetValue = vi.fn();
  const mockGetValue = vi.fn(() => 'mock value');
  const mockUpdateOptions = vi.fn();
  const mockGetModel = vi.fn();
  const mockSetTheme = vi.fn();
  const mockSetModelLanguage = vi.fn();
  const mockCompletionDispose = vi.fn();
  const mockRegisterCompletionItemProvider = vi.fn(() => ({ dispose: mockCompletionDispose }));

  const mockEditorInstance = {
    dispose: mockDispose,
    setValue: mockSetValue,
    getValue: mockGetValue,
    updateOptions: mockUpdateOptions,
    getModel: mockGetModel,
    onDidChangeModelContent: vi.fn((callback: () => void) => {
      onDidChangeModelContentListeners.push(callback);
      return { dispose: vi.fn() };
    }),
    onDidBlurEditorText: vi.fn((callback: () => void) => {
      onDidBlurEditorTextListeners.push(callback);
      return { dispose: vi.fn() };
    }),
    onDidFocusEditorText: vi.fn((callback: () => void) => {
      onDidFocusEditorTextListeners.push(callback);
      return { dispose: vi.fn() };
    }),
  };

  const mockCreate = vi.fn(() => mockEditorInstance);

  const MarkerSeverity = { Error: 8, Warning: 4, Info: 2, Hint: 1 };

  return {
    mockDispose,
    mockSetValue,
    mockGetValue,
    mockUpdateOptions,
    mockGetModel,
    mockSetTheme,
    mockSetModelLanguage,
    mockCreate,
    mockRegisterCompletionItemProvider,
    mockCompletionDispose,
    onDidChangeModelContentListeners,
    onDidBlurEditorTextListeners,
    onDidFocusEditorTextListeners,
    mockEditorInstance,
    MarkerSeverity,
  };
});

vi.mock('monaco-editor', () => ({
  editor: {
    create: mockCreate,
    setTheme: mockSetTheme,
    setModelLanguage: mockSetModelLanguage,
  },
  languages: {
    registerCompletionItemProvider: mockRegisterCompletionItemProvider,
  },
  MarkerSeverity,
}));

const { mockUseHunspellMonaco } = vi.hoisted(() => ({
  mockUseHunspellMonaco: vi.fn(),
}));
vi.mock('@mission-platform/hunspell', () => ({
  useHunspellMonaco: mockUseHunspellMonaco,
}));

describe('BaseMonacoEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onDidChangeModelContentListeners.length = 0;
    onDidBlurEditorTextListeners.length = 0;
    onDidFocusEditorTextListeners.length = 0;
    mockGetValue.mockReturnValue('mock value');
    mockRegisterCompletionItemProvider.mockReturnValue({ dispose: mockCompletionDispose });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('spellCheck prop', () => {
    it('defaults spellCheck to false', async () => {
      await mountEditor();
      expect(mockUseHunspellMonaco).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ value: false }),
        expect.anything(),
      );
    });

    it('passes enabled=true to useHunspellMonaco when spellCheck is true and not readonly', async () => {
      await mountEditor({ props: { spellCheck: true, readonly: false } });
      const enabledArgument = mockUseHunspellMonaco.mock.calls[0][1];
      expect(enabledArgument.value).toBe(true);
    });

    it('passes enabled=false to useHunspellMonaco when spellCheck is true but readonly is true', async () => {
      await mountEditor({ props: { spellCheck: true, readonly: true } });
      const enabledArgument = mockUseHunspellMonaco.mock.calls[0][1];
      expect(enabledArgument.value).toBe(false);
    });

    it('passes the current language to useHunspellMonaco', async () => {
      await mountEditor({ props: { language: 'markdown' } });
      const languageArgument = mockUseHunspellMonaco.mock.calls[0][2];
      expect(languageArgument.value).toBe('markdown');
    });

    it('passes plaintext as language when language prop is not provided', async () => {
      await mountEditor();
      const languageArgument = mockUseHunspellMonaco.mock.calls[0][2];
      expect(languageArgument.value).toBe('plaintext');
    });
  });

  describe('rendering', () => {
    it('renders a root div with the base-monaco-editor class', async () => {
      const wrapper = await mountEditor();
      expect(wrapper.find('div.base-monaco-editor').exists()).toBe(true);
    });

    it('sets role="region" on the container', async () => {
      const wrapper = await mountEditor();
      expect(wrapper.find('.base-monaco-editor').attributes('role')).toBe('region');
    });

    it('sets aria-label including the language', async () => {
      const wrapper = await mountEditor({ props: { language: 'typescript' } });
      expect(wrapper.find('.base-monaco-editor').attributes('aria-label')).toBe('typescript editor');
    });

    it('applies the height style prop', async () => {
      const wrapper = await mountEditor({ props: { height: '500px' } });
      expect(wrapper.find('.base-monaco-editor').attributes('style')).toContain('height: 500px');
    });

    it('defaults height to 300px', async () => {
      const wrapper = await mountEditor();
      expect(wrapper.find('.base-monaco-editor').attributes('style')).toContain('height: 300px');
    });
  });

  describe('Monaco editor initialisation', () => {
    it('calls monaco.editor.create on mount', async () => {
      await mountEditor();
      expect(mockCreate).toHaveBeenCalledOnce();
    });

    it('passes modelValue as the initial value', async () => {
      await mountEditor({ props: { modelValue: 'hello world' } });
      expect(mockCreate).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ value: 'hello world' }));
    });

    it('passes language to the editor', async () => {
      await mountEditor({ props: { language: 'json' } });
      expect(mockCreate).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ language: 'json' }));
    });

    it('passes theme to the editor', async () => {
      await mountEditor({ props: { theme: 'vs-dark' } });
      expect(mockCreate).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ theme: 'vs-dark' }));
    });

    it('passes readOnly when readonly prop is true', async () => {
      await mountEditor({ props: { readonly: true } });
      expect(mockCreate).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ readOnly: true }));
    });

    it('passes minimap enabled option', async () => {
      await mountEditor({ props: { minimap: true } });
      expect(mockCreate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ minimap: { enabled: true } }),
      );
    });

    it('passes lineNumbers as "on" when lineNumbers prop is true', async () => {
      await mountEditor({ props: { lineNumbers: true } });
      expect(mockCreate).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ lineNumbers: 'on' }));
    });

    it('passes lineNumbers as "off" when lineNumbers prop is false', async () => {
      await mountEditor({ props: { lineNumbers: false } });
      expect(mockCreate).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ lineNumbers: 'off' }));
    });

    it('passes wordWrap as "on" when wordWrap prop is true', async () => {
      await mountEditor({ props: { wordWrap: true } });
      expect(mockCreate).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ wordWrap: 'on' }));
    });

    it('passes fontSize to the editor', async () => {
      await mountEditor({ props: { fontSize: 16 } });
      expect(mockCreate).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ fontSize: 16 }));
    });

    it('passes tabSize to the editor', async () => {
      await mountEditor({ props: { tabSize: 4 } });
      expect(mockCreate).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ tabSize: 4 }));
    });
  });

  describe('prop defaults', () => {
    it('defaults language to plaintext', async () => {
      await mountEditor();
      expect(mockCreate).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ language: 'plaintext' }));
    });

    it('defaults theme to vs', async () => {
      await mountEditor();
      expect(mockCreate).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ theme: 'vs' }));
    });

    it('defaults readonly to false', async () => {
      await mountEditor();
      expect(mockCreate).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ readOnly: false }));
    });

    it('defaults minimap to disabled', async () => {
      await mountEditor();
      expect(mockCreate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ minimap: { enabled: false } }),
      );
    });

    it('defaults fontSize to 14', async () => {
      await mountEditor();
      expect(mockCreate).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ fontSize: 14 }));
    });

    it('defaults tabSize to 2', async () => {
      await mountEditor();
      expect(mockCreate).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ tabSize: 2 }));
    });
  });

  describe('events', () => {
    it('emits ready with the editor instance on mount', async () => {
      const wrapper = await mountEditor();
      expect(wrapper.emitted('ready')).toHaveLength(1);
      expect(wrapper.emitted('ready')![0][0]).toBe(mockEditorInstance);
    });

    it('emits update:modelValue and change when content changes', async () => {
      mockGetValue.mockReturnValue('updated code');
      const wrapper = await mountEditor();
      // Trigger the onDidChangeModelContent listener
      for (const callback of onDidChangeModelContentListeners) callback();
      await wrapper.vm.$nextTick();
      expect(wrapper.emitted('update:modelValue')).toHaveLength(1);
      expect(wrapper.emitted('update:modelValue')![0][0]).toBe('updated code');
      expect(wrapper.emitted('change')).toHaveLength(1);
      expect(wrapper.emitted('change')![0][0]).toBe('updated code');
    });

    it('emits blur when editor loses focus', async () => {
      const wrapper = await mountEditor();
      for (const callback of onDidBlurEditorTextListeners) callback();
      await wrapper.vm.$nextTick();
      expect(wrapper.emitted('blur')).toHaveLength(1);
    });

    it('emits focus when editor gains focus', async () => {
      const wrapper = await mountEditor();
      for (const callback of onDidFocusEditorTextListeners) callback();
      await wrapper.vm.$nextTick();
      expect(wrapper.emitted('focus')).toHaveLength(1);
    });
  });

  describe('reactive prop updates', () => {
    it('calls setTheme when theme prop changes', async () => {
      const wrapper = await mountEditor({ props: { theme: 'vs' } });
      await wrapper.setProps({ theme: 'vs-dark' });
      expect(mockSetTheme).toHaveBeenCalledWith('vs-dark');
    });

    it('calls updateOptions with readOnly when readonly prop changes', async () => {
      const wrapper = await mountEditor({ props: { readonly: false } });
      await wrapper.setProps({ readonly: true });
      expect(mockUpdateOptions).toHaveBeenCalledWith(expect.objectContaining({ readOnly: true }));
    });

    it('calls updateOptions with minimap when minimap prop changes', async () => {
      const wrapper = await mountEditor({ props: { minimap: false } });
      await wrapper.setProps({ minimap: true });
      expect(mockUpdateOptions).toHaveBeenCalledWith(expect.objectContaining({ minimap: { enabled: true } }));
    });

    it('calls updateOptions with lineNumbers when lineNumbers prop changes', async () => {
      const wrapper = await mountEditor({ props: { lineNumbers: true } });
      await wrapper.setProps({ lineNumbers: false });
      expect(mockUpdateOptions).toHaveBeenCalledWith(expect.objectContaining({ lineNumbers: 'off' }));
    });

    it('calls updateOptions with wordWrap when wordWrap prop changes', async () => {
      const wrapper = await mountEditor({ props: { wordWrap: false } });
      await wrapper.setProps({ wordWrap: true });
      expect(mockUpdateOptions).toHaveBeenCalledWith(expect.objectContaining({ wordWrap: 'on' }));
    });

    it('calls updateOptions with fontSize when fontSize prop changes', async () => {
      const wrapper = await mountEditor({ props: { fontSize: 14 } });
      await wrapper.setProps({ fontSize: 18 });
      expect(mockUpdateOptions).toHaveBeenCalledWith(expect.objectContaining({ fontSize: 18 }));
    });

    it('calls updateOptions with tabSize when tabSize prop changes', async () => {
      const wrapper = await mountEditor({ props: { tabSize: 2 } });
      await wrapper.setProps({ tabSize: 4 });
      expect(mockUpdateOptions).toHaveBeenCalledWith(expect.objectContaining({ tabSize: 4 }));
    });

    it('calls setValue when modelValue prop changes to a different value', async () => {
      mockGetValue.mockReturnValue('original');
      const wrapper = await mountEditor({ props: { modelValue: 'original' } });
      mockGetValue.mockReturnValue('original');
      await wrapper.setProps({ modelValue: 'new value' });
      expect(mockSetValue).toHaveBeenCalledWith('new value');
    });

    it('does not call setValue when modelValue is unchanged', async () => {
      mockGetValue.mockReturnValue('same value');
      const wrapper = await mountEditor({ props: { modelValue: 'same value' } });
      mockSetValue.mockClear();
      await wrapper.setProps({ modelValue: 'same value' });
      expect(mockSetValue).not.toHaveBeenCalled();
    });
  });

  describe('lifecycle', () => {
    it('disposes the editor instance on unmount', async () => {
      const wrapper = await mountEditor();
      wrapper.unmount();
      expect(mockDispose).toHaveBeenCalledOnce();
    });

    it('disposes the completion provider on unmount', async () => {
      const provider = { provideCompletionItems: vi.fn() };
      const wrapper = await mountEditor({ props: { completionProvider: provider } });
      wrapper.unmount();
      expect(mockCompletionDispose).toHaveBeenCalledOnce();
    });
  });

  describe('completionProvider', () => {
    it('does not register a provider when completionProvider prop is absent', async () => {
      await mountEditor();
      expect(mockRegisterCompletionItemProvider).not.toHaveBeenCalled();
    });

    it('registers the provider for the current language on mount', async () => {
      const provider = { provideCompletionItems: vi.fn() };
      await mountEditor({ props: { language: 'markdown', completionProvider: provider } });
      expect(mockRegisterCompletionItemProvider).toHaveBeenCalledWith('markdown', provider);
    });

    it('uses plaintext as language when language prop is not provided', async () => {
      const provider = { provideCompletionItems: vi.fn() };
      await mountEditor({ props: { completionProvider: provider } });
      expect(mockRegisterCompletionItemProvider).toHaveBeenCalledWith('plaintext', provider);
    });

    it('re-registers the provider when the language prop changes', async () => {
      const provider = { provideCompletionItems: vi.fn() };
      const wrapper = await mountEditor({
        props: { language: 'markdown', completionProvider: provider },
      });
      mockRegisterCompletionItemProvider.mockReturnValue({ dispose: mockCompletionDispose });
      await wrapper.setProps({ language: 'plaintext' });
      expect(mockCompletionDispose).toHaveBeenCalledOnce();
      expect(mockRegisterCompletionItemProvider).toHaveBeenLastCalledWith('plaintext', provider);
    });

    it('re-registers when the completionProvider prop changes', async () => {
      const providerA = { provideCompletionItems: vi.fn() };
      const providerB = { provideCompletionItems: vi.fn() };
      const wrapper = await mountEditor({
        props: { language: 'markdown', completionProvider: providerA },
      });
      mockRegisterCompletionItemProvider.mockReturnValue({ dispose: mockCompletionDispose });
      await wrapper.setProps({ completionProvider: providerB });
      expect(mockCompletionDispose).toHaveBeenCalledOnce();
      expect(mockRegisterCompletionItemProvider).toHaveBeenLastCalledWith('markdown', providerB);
    });

    it('disposes the provider registration when completionProvider is set to undefined', async () => {
      const provider = { provideCompletionItems: vi.fn() };
      const wrapper = await mountEditor({
        props: { language: 'markdown', completionProvider: provider },
      });
      await wrapper.setProps({ completionProvider: undefined });
      expect(mockCompletionDispose).toHaveBeenCalledOnce();
      expect(mockRegisterCompletionItemProvider).toHaveBeenCalledTimes(1);
    });
  });
});
