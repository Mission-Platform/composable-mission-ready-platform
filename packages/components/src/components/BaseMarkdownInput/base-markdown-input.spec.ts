import { describe, expect, it } from 'vitest';

import { mountWithI18n as mount } from '../../test-utils/mount-with-i18n';

import MarkdownInput from './BaseMarkdownInput.vue';

describe('MarkdownInput', () => {
  it('renders a <textarea> element', () => {
    const wrapper = mount(MarkdownInput);
    expect(wrapper.find('textarea').exists()).toBe(true);
  });

  it('applies default size class (md)', () => {
    const wrapper = mount(MarkdownInput);
    expect(wrapper.classes()).toContain('markdown-input--md');
  });

  it('applies custom size class', () => {
    const wrapper = mount(MarkdownInput, { props: { size: 'lg' } });
    expect(wrapper.classes()).toContain('markdown-input--lg');
  });

  it('sets rows attribute on textarea', () => {
    const wrapper = mount(MarkdownInput, { props: { rows: 8 } });
    expect(wrapper.find('textarea').attributes('rows')).toBe('8');
  });

  it('binds modelValue to textarea value', () => {
    const wrapper = mount(MarkdownInput, { props: { modelValue: 'hello **world**' } });
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('hello **world**');
  });

  it('emits update:modelValue on input', async () => {
    const wrapper = mount(MarkdownInput);
    await wrapper.find('textarea').setValue('typed text');
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['typed text']);
  });

  it('renders label when label prop is provided', () => {
    const wrapper = mount(MarkdownInput, { props: { label: 'Body', id: 'body' } });
    expect(wrapper.find('label').text()).toContain('Body');
  });

  it('renders hint text', () => {
    const wrapper = mount(MarkdownInput, { props: { hint: 'Supports markdown' } });
    expect(wrapper.find('.markdown-input__hint').text()).toBe('Supports markdown');
  });

  it('renders error message and adds error class', () => {
    const wrapper = mount(MarkdownInput, { props: { error: 'Required' } });
    expect(wrapper.find('.markdown-input__error').text()).toBe('Required');
    expect(wrapper.classes()).toContain('markdown-input--error');
  });

  it('does not render hint when error is present', () => {
    const wrapper = mount(MarkdownInput, { props: { error: 'Err', hint: 'Hint' } });
    expect(wrapper.find('.markdown-input__hint').exists()).toBe(false);
  });

  it('is disabled when disabled prop is true', () => {
    const wrapper = mount(MarkdownInput, { props: { disabled: true } });
    expect(wrapper.find('textarea').attributes('disabled')).toBeDefined();
    expect(wrapper.classes()).toContain('markdown-input--disabled');
  });

  it('shows required asterisk when required prop is true', () => {
    const wrapper = mount(MarkdownInput, { props: { label: 'Notes', required: true } });
    expect(wrapper.find('.markdown-input__required').exists()).toBe(true);
  });

  it('renders Write and Preview tab buttons', () => {
    const wrapper = mount(MarkdownInput);
    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs).toHaveLength(2);
    expect(tabs[0].text()).toBe('Write');
    expect(tabs[1].text()).toBe('Preview');
  });

  it('Write tab is active by default', () => {
    const wrapper = mount(MarkdownInput);
    const writTab = wrapper.findAll('[role="tab"]')[0];
    expect(writTab.classes()).toContain('markdown-input__tab--active');
  });

  it('switches to preview tab on click', async () => {
    const wrapper = mount(MarkdownInput);
    const previewTab = wrapper.findAll('[role="tab"]')[1];
    await previewTab.trigger('click');
    expect(previewTab.classes()).toContain('markdown-input__tab--active');
  });

  it('shows empty preview message when modelValue is empty', async () => {
    const wrapper = mount(MarkdownInput, { props: { modelValue: '' } });
    await wrapper.findAll('[role="tab"]')[1].trigger('click');
    expect(wrapper.find('.markdown-input__preview-empty').exists()).toBe(true);
  });

  it('renders markdown as HTML in preview panel', async () => {
    const wrapper = mount(MarkdownInput, { props: { modelValue: '**bold**' } });
    await wrapper.findAll('[role="tab"]')[1].trigger('click');
    expect(wrapper.find('.markdown-input__preview-content').html()).toContain('<strong>');
  });

  it('renders toolbar buttons in write mode', () => {
    const wrapper = mount(MarkdownInput);
    const tools = wrapper.findAll('.markdown-input__tool');
    expect(tools.length).toBeGreaterThan(0);
  });

  it('hides toolbar when preview tab is active', async () => {
    const wrapper = mount(MarkdownInput);
    await wrapper.findAll('[role="tab"]')[1].trigger('click');
    expect(wrapper.find('.markdown-input__toolbar').exists()).toBe(false);
  });

  it('toolbar emits update:modelValue with formatted text', async () => {
    const wrapper = mount(MarkdownInput, { props: { modelValue: '' } });
    const boldButton = wrapper.findAll('.markdown-input__tool')[0];
    await boldButton.trigger('click');
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')![0][0] as string).toContain('**');
  });

  it('shows preview panel automatically when disabled', () => {
    const wrapper = mount(MarkdownInput, { props: { disabled: true, modelValue: '**bold**' } });
    expect(wrapper.find('.markdown-input__preview-content').isVisible()).toBe(true);
    expect(wrapper.find('.markdown-input__preview').isVisible()).toBe(true);
  });

  it('hides tab bar when disabled', () => {
    const wrapper = mount(MarkdownInput, { props: { disabled: true } });
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false);
  });

  it('shows preview panel automatically when readonly', () => {
    const wrapper = mount(MarkdownInput, { props: { readonly: true, modelValue: '**bold**' } });
    expect(wrapper.find('.markdown-input__preview-content').isVisible()).toBe(true);
  });

  it('hides tab bar when readonly', () => {
    const wrapper = mount(MarkdownInput, { props: { readonly: true } });
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false);
  });

  it('adds readonly class when readonly prop is true', () => {
    const wrapper = mount(MarkdownInput, { props: { readonly: true } });
    expect(wrapper.classes()).toContain('markdown-input--readonly');
  });

  it('sets readonly attribute on textarea when readonly prop is true', () => {
    const wrapper = mount(MarkdownInput, { props: { readonly: true } });
    expect(wrapper.find('textarea').attributes('readonly')).toBeDefined();
  });

  it('renders label visually hidden when labelHidden is true', () => {
    const wrapper = mount(MarkdownInput, { props: { label: 'Hidden Label', labelHidden: true } });
    expect(wrapper.find('label').exists()).toBe(true);
    expect(wrapper.find('.markdown-input__label--hidden').exists()).toBe(true);
  });

  it('renders label visible by default when labelHidden is false', () => {
    const wrapper = mount(MarkdownInput, { props: { label: 'Visible Label' } });
    expect(wrapper.find('.markdown-input__label--hidden').exists()).toBe(false);
  });
});
