// AAA (Arrange–Act–Assert) unit tests for the useSnippets composable.
// Covers: addSnippet, updateSnippet, removeSnippet, resolveSlashCommand,
//         importSnippet, importAllSnippets, and markdown parsing.

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { useSnippets as UseSnippetsFunction } from './use-snippets';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Create a minimal File object from text for import tests. */
function makeFile(content: string, name = 'snippet.md'): File {
  return new File([content], name, { type: 'text/markdown' });
}

/** Build a well-formed markdown snippet string. */
function buildMarkdown(name: string, content: string): string {
  return `---\nname: ${name}\n---\n${content}`;
}

// ─── Module reset between tests ───────────────────────────────────────────────
// useSnippets stores shared module-level state (refs). We reset the module
// registry and localStorage before each test to get an isolated clean slate.

let useSnippets: typeof UseSnippetsFunction;

beforeEach(async () => {
  localStorage.clear();
  vi.resetModules();
  const module_ = await import('./use-snippets');
  useSnippets = module_.useSnippets;
});

// ─── addSnippet ───────────────────────────────────────────────────────────────

describe('addSnippet', () => {
  it('creates a snippet with the provided name and content', () => {
    // Arrange
    const { addSnippet, snippets } = useSnippets();

    // Act
    const result = addSnippet('greeting', 'Hello, world!');

    // Assert
    expect(result.name).toBe('greeting');
    expect(result.content).toBe('Hello, world!');
    expect(snippets.value).toHaveLength(1);
    expect(snippets.value[0].id).toBe(result.id);
  });

  it('assigns a unique id and timestamps', () => {
    // Arrange
    const { addSnippet } = useSnippets();

    // Act
    const s = addSnippet('ts-test', 'body');

    // Assert
    expect(s.id).toBeTruthy();
    expect(s.createdAt).toBeGreaterThan(0);
    expect(s.updatedAt).toBe(s.createdAt);
  });

  it('persists the snippet to localStorage', () => {
    // Arrange
    const { addSnippet } = useSnippets();

    // Act
    addSnippet('persisted', 'data');

    // Assert
    const stored = JSON.parse(localStorage.getItem('my-care-notes:snippets') ?? '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe('persisted');
  });

  it('appends multiple snippets independently', () => {
    // Arrange
    const { addSnippet, snippets } = useSnippets();

    // Act
    addSnippet('alpha', 'a');
    addSnippet('beta', 'b');

    // Assert
    expect(snippets.value).toHaveLength(2);
    expect(snippets.value.map((s) => s.name)).toEqual(['alpha', 'beta']);
  });
});

// ─── updateSnippet ────────────────────────────────────────────────────────────

describe('updateSnippet', () => {
  it('updates name and content of an existing snippet', () => {
    // Arrange
    const { addSnippet, updateSnippet, snippets } = useSnippets();
    const s = addSnippet('old-name', 'old-content');

    // Act
    updateSnippet(s.id, 'new-name', 'new-content');

    // Assert
    expect(snippets.value[0].name).toBe('new-name');
    expect(snippets.value[0].content).toBe('new-content');
  });

  it('advances the updatedAt timestamp', async () => {
    // Arrange
    const { addSnippet, updateSnippet, snippets } = useSnippets();
    const s = addSnippet('name', 'content');
    const originalUpdatedAt = s.updatedAt;

    await new Promise((r) => setTimeout(r, 2));

    // Act
    updateSnippet(s.id, 'name', 'updated');

    // Assert
    expect(snippets.value[0].updatedAt).toBeGreaterThan(originalUpdatedAt);
  });

  it('does not affect other snippets', () => {
    // Arrange
    const { addSnippet, updateSnippet, snippets } = useSnippets();
    addSnippet('first', 'f');
    const second = addSnippet('second', 's');

    // Act
    updateSnippet(second.id, 'second-updated', 's-updated');

    // Assert
    expect(snippets.value[0].name).toBe('first');
    expect(snippets.value[1].name).toBe('second-updated');
  });
});

// ─── removeSnippet ────────────────────────────────────────────────────────────

describe('removeSnippet', () => {
  it('removes the snippet with the given id', () => {
    // Arrange
    const { addSnippet, removeSnippet, snippets } = useSnippets();
    const s = addSnippet('to-remove', 'bye');

    // Act
    removeSnippet(s.id);

    // Assert
    expect(snippets.value).toHaveLength(0);
  });

  it('only removes the targeted snippet', () => {
    // Arrange
    const { addSnippet, removeSnippet, snippets } = useSnippets();
    addSnippet('keep', 'k');
    const target = addSnippet('remove', 'r');

    // Act
    removeSnippet(target.id);

    // Assert
    expect(snippets.value).toHaveLength(1);
    expect(snippets.value[0].name).toBe('keep');
  });

  it('persists removal to localStorage', () => {
    // Arrange
    const { addSnippet, removeSnippet } = useSnippets();
    const s = addSnippet('transient', 'data');

    // Act
    removeSnippet(s.id);

    // Assert
    const stored = JSON.parse(localStorage.getItem('my-care-notes:snippets') ?? '[]');
    expect(stored).toHaveLength(0);
  });
});

// ─── resolveSlashCommand ──────────────────────────────────────────────────────

describe('resolveSlashCommand', () => {
  it('returns today\'s date for the built-in "date" command', () => {
    // Arrange
    const { resolveSlashCommand } = useSnippets();
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const expected = `${dd}/${mm}/${yyyy}`;

    // Act
    const result = resolveSlashCommand('date');

    // Assert
    expect(result).toBe(expected);
  });

  it('returns the content of a user-defined snippet', () => {
    // Arrange
    const { addSnippet, resolveSlashCommand } = useSnippets();
    addSnippet('sig', 'Kind regards, Alice');

    // Act
    const result = resolveSlashCommand('sig');

    // Assert
    expect(result).toBe('Kind regards, Alice');
  });

  it('returns null for an unknown command', () => {
    // Arrange
    const { resolveSlashCommand } = useSnippets();

    // Act
    const result = resolveSlashCommand('nonexistent');

    // Assert
    expect(result).toBeNull();
  });
});

// ─── snippetMap ───────────────────────────────────────────────────────────────

describe('snippetMap', () => {
  it('provides a Map keyed by snippet name', () => {
    // Arrange
    const { addSnippet, snippetMap } = useSnippets();
    addSnippet('key-one', 'value-one');
    addSnippet('key-two', 'value-two');

    // Act & Assert
    expect(snippetMap.value.size).toBe(2);
    expect(snippetMap.value.get('key-one')?.content).toBe('value-one');
    expect(snippetMap.value.get('key-two')?.content).toBe('value-two');
  });
});

// ─── importSnippet ────────────────────────────────────────────────────────────

describe('importSnippet', () => {
  it('creates a new snippet from a valid markdown file', async () => {
    // Arrange
    const { importSnippet, snippets } = useSnippets();
    const file = makeFile(buildMarkdown('imported', 'imported content'));

    // Act
    const success = await importSnippet(file);

    // Assert
    expect(success).toBe(true);
    expect(snippets.value).toHaveLength(1);
    expect(snippets.value[0].name).toBe('imported');
    expect(snippets.value[0].content).toBe('imported content');
  });

  it('updates an existing snippet when names match', async () => {
    // Arrange
    const { addSnippet, importSnippet, snippets } = useSnippets();
    addSnippet('conflict', 'old');
    const file = makeFile(buildMarkdown('conflict', 'new'));

    // Act
    await importSnippet(file);

    // Assert — still only one snippet, content replaced
    expect(snippets.value).toHaveLength(1);
    expect(snippets.value[0].content).toBe('new');
  });

  it('returns false for an invalid/malformed markdown file', async () => {
    // Arrange
    const { importSnippet, snippets } = useSnippets();
    const file = makeFile('no frontmatter here');

    // Act
    const success = await importSnippet(file);

    // Assert
    expect(success).toBe(false);
    expect(snippets.value).toHaveLength(0);
  });
});

// ─── importAllSnippets ────────────────────────────────────────────────────────

describe('importAllSnippets', () => {
  it('imports multiple snippets separated by the ---snippet--- delimiter', async () => {
    // Arrange
    const { importAllSnippets, snippets } = useSnippets();
    const combined = [buildMarkdown('first', 'first content'), buildMarkdown('second', 'second content')].join(
      '\n\n---snippet---\n\n',
    );
    const file = makeFile(combined, 'snippets.md');

    // Act
    const count = await importAllSnippets(file);

    // Assert
    expect(count).toBe(2);
    expect(snippets.value).toHaveLength(2);
    expect(snippets.value.map((s) => s.name)).toEqual(['first', 'second']);
  });

  it('returns 0 and adds nothing when file contains no valid snippets', async () => {
    // Arrange
    const { importAllSnippets, snippets } = useSnippets();
    const file = makeFile('garbage data\n\n---snippet---\n\nmore garbage');

    // Act
    const count = await importAllSnippets(file);

    // Assert
    expect(count).toBe(0);
    expect(snippets.value).toHaveLength(0);
  });

  it('updates existing snippets rather than duplicating them', async () => {
    // Arrange
    const { addSnippet, importAllSnippets, snippets } = useSnippets();
    addSnippet('reuse', 'old');
    const file = makeFile(buildMarkdown('reuse', 'updated'));

    // Act
    const count = await importAllSnippets(file);

    // Assert
    expect(count).toBe(1);
    expect(snippets.value).toHaveLength(1);
    expect(snippets.value[0].content).toBe('updated');
  });
});
