import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createApp, createSSRApp, h as vueH, nextTick } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeKanbanBoard } from './forge-kanban-board';

const ReactBoard = toReactComponent(ForgeKanbanBoard, 'KanbanBoard');
const VueBoard = toVueComponent(ForgeKanbanBoard, 'KanbanBoard');
const columns = [
  { id: 'todo', title: 'To do', items: [{ id: 'one', title: 'First task' }] },
  { id: 'done', title: 'Done', items: [] },
];

describe('ForgeKanbanBoard', () => {
  it('renders columns and cards with an accessible board on both frameworks', async () => {
    const properties = { columns, draggable: true, columnAddable: true, ariaLabel: 'Project board' };
    const react = renderToStaticMarkup(createElement(ReactBoard, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueBoard, properties) }));
    for (const html of [react, vue]) {
      expect(html).toContain('aria-label="Project board"');
      expect(html).toContain('To do');
      expect(html).toContain('First task');
      expect(html).toContain('Add column');
      expect(html).toContain('Add item');
    }
  });

  it('emits item and board actions and moves an item within the limits', async () => {
    const onMove = vi.fn();
    const onItemClick = vi.fn();
    const onColumnAdd = vi.fn();
    const onItemAdd = vi.fn();
    const host = document.createElement('div');
    document.body.append(host);
    const app = createApp({
      render: () => vueH(VueBoard, { columns, columnAddable: true, onMove, onItemClick, onColumnAdd, onItemAdd }),
    });
    app.mount(host);
    const buttons = [...host.querySelectorAll('button')];
    buttons.find((button) => button.textContent === 'Add column')?.click();
    buttons.find((button) => button.textContent === 'First task')?.click();
    for (const button of buttons.filter((candidate) => candidate.textContent === 'Add item')) button.click();
    const select = host.querySelector('select');
    if (select) {
      select.value = 'done';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    await nextTick();
    expect(onColumnAdd).toHaveBeenCalledOnce();
    expect(onItemClick).toHaveBeenCalledOnce();
    expect(onMove).toHaveBeenCalledWith('one', 'todo', 'done');
    expect(onItemAdd).toHaveBeenCalledTimes(2);
    app.unmount();
    host.remove();
  });
});
