import { nanoid } from 'nanoid';
import { computed, ref } from 'vue';

import type { Snippet } from '../types';

const STORAGE_KEY = 'my-care-notes:snippets';

function parseMarkdownSnippet(markdown: string): Omit<Snippet, 'id' | 'createdAt' | 'updatedAt'> | undefined {
  const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!frontmatterMatch) return undefined;

  const frontmatter = frontmatterMatch[1];
  const content = frontmatterMatch[2].trim();

  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
  if (!nameMatch) return undefined;

  return {
    name: nameMatch[1].trim(),
    content,
  };
}

function snippetToMarkdown(snippet: Snippet): string {
  return `---\nname: ${snippet.name}\n---\n${snippet.content}`;
}

function loadFromStorage(): Snippet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Snippet[];
  } catch {
    return [];
  }
}

function saveToStorage(snippets: Snippet[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snippets));
}

const snippets = ref<Snippet[]>(loadFromStorage());

export function useSnippets() {
  const snippetMap = computed<Map<string, Snippet>>(() => {
    return new Map(snippets.value.map((s) => [s.name, s]));
  });

  function addSnippet(name: string, content: string): Snippet {
    const now = Date.now();
    const snippet: Snippet = { id: nanoid(), name, content, createdAt: now, updatedAt: now };
    snippets.value = [...snippets.value, snippet];
    saveToStorage(snippets.value);
    return snippet;
  }

  function updateSnippet(id: string, name: string, content: string): void {
    snippets.value = snippets.value.map((s) => (s.id === id ? { ...s, name, content, updatedAt: Date.now() } : s));
    saveToStorage(snippets.value);
  }

  function removeSnippet(id: string): void {
    snippets.value = snippets.value.filter((s) => s.id !== id);
    saveToStorage(snippets.value);
  }

  function resolveSlashCommand(command: string): string | undefined {
    // Built-in snippets
    if (command === 'date') {
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }

    // User-defined snippets
    const snippet = snippetMap.value.get(command);
    return snippet ? snippet.content : undefined;
  }

  function exportSnippet(id: string): void {
    const snippet = snippets.value.find((s) => s.id === id);
    if (!snippet) return;

    const markdown = snippetToMarkdown(snippet);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${snippet.name}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportAllSnippets(): void {
    const lines = snippets.value.map((s) => snippetToMarkdown(s)).join('\n\n---snippet---\n\n');
    const blob = new Blob([lines], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'snippets.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function importSnippet(file: File): Promise<boolean> {
    const text = await file.text();
    const parsed = parseMarkdownSnippet(text);
    if (!parsed) return false;

    const existing = snippets.value.find((s) => s.name === parsed.name);
    if (existing) {
      updateSnippet(existing.id, parsed.name, parsed.content);
    } else {
      addSnippet(parsed.name, parsed.content);
    }
    return true;
  }

  async function importAllSnippets(file: File): Promise<number> {
    const text = await file.text();
    const parts = text.split('\n\n---snippet---\n\n');
    let count = 0;
    for (const part of parts) {
      const parsed = parseMarkdownSnippet(part.trim());
      if (parsed) {
        const existing = snippets.value.find((s) => s.name === parsed.name);
        if (existing) {
          updateSnippet(existing.id, parsed.name, parsed.content);
        } else {
          addSnippet(parsed.name, parsed.content);
        }
        count++;
      }
    }
    return count;
  }

  return {
    snippets,
    snippetMap,
    addSnippet,
    updateSnippet,
    removeSnippet,
    resolveSlashCommand,
    exportSnippet,
    exportAllSnippets,
    importSnippet,
    importAllSnippets,
  };
}
