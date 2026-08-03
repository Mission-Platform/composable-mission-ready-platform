import { describe, expect, it, vi } from 'vitest';

import {
  BLOCK_FORMAT_COMMANDS,
  commandRequiresArgument,
  isCommandActive,
  queryBlockFormat,
  resolveExecCommand,
  runCommand,
  WYSIWYG_COMMANDS,
  type WysiwygCommand,
} from './commands';

describe('resolveExecCommand', () => {
  it('maps a simple toggle command to its execCommand name with no value', () => {
    expect(resolveExecCommand('bold')).toEqual({ command: 'bold' });
    expect(resolveExecCommand('strikethrough')).toEqual({ command: 'strikeThrough' });
  });

  it('wraps a formatBlock tag in angle brackets', () => {
    expect(resolveExecCommand('blockquote')).toEqual({ command: 'formatBlock', value: '<blockquote>' });
    expect(resolveExecCommand('heading1')).toEqual({ command: 'formatBlock', value: '<h1>' });
    expect(resolveExecCommand('heading6')).toEqual({ command: 'formatBlock', value: '<h6>' });
    expect(resolveExecCommand('monospace')).toEqual({ command: 'formatBlock', value: '<pre>' });
  });

  it('passes a caller-supplied value through for url/image commands', () => {
    expect(resolveExecCommand('link', 'https://example.com')).toEqual({
      command: 'createLink',
      value: 'https://example.com',
    });
    expect(resolveExecCommand('image', 'https://example.com/a.png')).toEqual({
      command: 'insertImage',
      value: 'https://example.com/a.png',
    });
  });
});

describe('commandRequiresArgument', () => {
  it('is true only for the value-taking commands', () => {
    expect(commandRequiresArgument('link')).toBe(true);
    expect(commandRequiresArgument('image')).toBe(true);
    expect(commandRequiresArgument('bold')).toBe(false);
    expect(commandRequiresArgument('unlink')).toBe(false);
  });
});

describe('runCommand', () => {
  it('returns false and does not throw when execCommand is unavailable', () => {
    expect(runCommand(undefined, 'bold')).toBe(false);
    expect(runCommand({} as unknown as Document, 'bold')).toBe(false);
  });

  it('delegates to execCommand with the resolved name and value', () => {
    const execCommand = vi.fn().mockReturnValue(true);
    const documentReference = { execCommand } as unknown as Document;

    expect(runCommand(documentReference, 'bold')).toBe(true);
    expect(execCommand).toHaveBeenCalledWith('bold', false, undefined);

    expect(runCommand(documentReference, 'blockquote')).toBe(true);
    expect(execCommand).toHaveBeenLastCalledWith('formatBlock', false, '<blockquote>');
  });

  it('is a no-op when a value-taking command is invoked without a value', () => {
    const execCommand = vi.fn().mockReturnValue(true);
    const documentReference = { execCommand } as unknown as Document;

    expect(runCommand(documentReference, 'link')).toBe(false);
    expect(execCommand).not.toHaveBeenCalled();

    expect(runCommand(documentReference, 'link', 'https://example.com')).toBe(true);
    expect(execCommand).toHaveBeenCalledWith('createLink', false, 'https://example.com');
  });

  it('swallows execCommand exceptions and returns false', () => {
    const execCommand = vi.fn(() => {
      throw new Error('not implemented');
    });
    const documentReference = { execCommand } as unknown as Document;
    expect(runCommand(documentReference, 'italic')).toBe(false);
  });
});

describe('isCommandActive', () => {
  it('returns false when queryCommandState is unavailable', () => {
    expect(isCommandActive(undefined, 'bold')).toBe(false);
    expect(isCommandActive({} as unknown as Document, 'bold')).toBe(false);
  });

  it('queries the underlying execCommand name', () => {
    const queryCommandState = vi.fn().mockReturnValue(true);
    const documentReference = { queryCommandState } as unknown as Document;
    expect(isCommandActive(documentReference, 'strikethrough')).toBe(true);
    expect(queryCommandState).toHaveBeenCalledWith('strikeThrough');
  });
});

describe('WYSIWYG_COMMANDS table', () => {
  it('has a descriptor for every command with a non-empty execCommand name', () => {
    for (const command of Object.keys(WYSIWYG_COMMANDS) as WysiwygCommand[]) {
      expect(WYSIWYG_COMMANDS[command].execCommand.length).toBeGreaterThan(0);
    }
  });

  it('exposes every block-format command as a formatBlock descriptor', () => {
    for (const command of BLOCK_FORMAT_COMMANDS) {
      expect(WYSIWYG_COMMANDS[command].execCommand).toBe('formatBlock');
      expect(WYSIWYG_COMMANDS[command].fixedValue).toBeDefined();
    }
  });
});

describe('queryBlockFormat', () => {
  it('defaults to paragraph when queryCommandValue is unavailable', () => {
    expect(queryBlockFormat()).toBe('paragraph');
    expect(queryBlockFormat({} as unknown as Document)).toBe('paragraph');
  });

  it('maps the current block tag onto its command', () => {
    const make = (value: string): Document =>
      ({ queryCommandValue: vi.fn().mockReturnValue(value) }) as unknown as Document;
    expect(queryBlockFormat(make('h1'))).toBe('heading1');
    expect(queryBlockFormat(make('H4'))).toBe('heading4');
    expect(queryBlockFormat(make('blockquote'))).toBe('blockquote');
    expect(queryBlockFormat(make('pre'))).toBe('monospace');
    expect(queryBlockFormat(make('p'))).toBe('paragraph');
    expect(queryBlockFormat(make('unknown'))).toBe('paragraph');
  });

  it('swallows queryCommandValue exceptions and defaults to paragraph', () => {
    const documentReference = {
      queryCommandValue: vi.fn(() => {
        throw new Error('not implemented');
      }),
    } as unknown as Document;
    expect(queryBlockFormat(documentReference)).toBe('paragraph');
  });
});
