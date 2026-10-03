import { describe, expect, it } from 'vitest';

import { FlintGraphEditor, ForgeFlintGraphEditor } from '../../..';
import { FlintEditorStore } from '../../../editor/editor-store';

describe('ForgeFlintGraphEditor Component', () => {
  it('exports both ForgeFlintGraphEditor and FlintGraphEditor aliases', () => {
    expect(ForgeFlintGraphEditor).toBeDefined();
    expect(FlintGraphEditor).toBe(ForgeFlintGraphEditor);
    expect(typeof ForgeFlintGraphEditor).toBe('function');
  });

  it('renders a neutral MpElement with default store', () => {
    const store = new FlintEditorStore();
    const element = ForgeFlintGraphEditor({ store });

    expect(element).toBeDefined();
    expect(typeof element).toBe('object');
  });
});
