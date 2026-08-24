import {
  classNames,
  hasSlot,
  type MpChild,
  type MpElement,
  Slot,
  useEffect,
  useId,
  useRef,
  useState,
} from '@mission-platform/forge';

import styles from './forge-command-palette.module.scss';

/** Size token controlling the command palette scale. */
export type CommandPaletteSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** A command shown in the palette. */
export interface CommandItem {
  /** Stable identifier for the command. */
  id: string;
  /** Human-readable command label. */
  label: string;
  /** Optional supporting text. */
  description?: string;
  /** Additional terms used when filtering. */
  keywords?: string[];
  /** Optional shortcut hint displayed at the end of the row. */
  shortcut?: string;
  /** Optional grouping label. */
  group?: string;
  /** Optional leading content. */
  icon?: MpChild;
  /** Prevents this command from being selected. */
  disabled?: boolean;
  /** Command-local activation callback. */
  onSelect?: () => void;
}

/** @deprecated Use `CommandItem`. */
export type CommandPaletteCommand = CommandItem;

export interface CommandPaletteProperties {
  /** Optional default-slot content. */
  children?: MpChild | readonly MpChild[];
  /** Optional custom trigger content. */
  trigger?: MpChild;
  /** Optional footer content. */
  footer?: MpChild;
  /** Commands rendered in the result list. */
  commands: CommandItem[];
  modelValue: boolean;
  /** Group headings to display, in the requested order. */
  groups?: { id: string; label: string }[];
  /** Maximum number of matching commands to display. */
  maxResults?: number;
  /** Whether command results are still being loaded. */
  loading?: boolean;
  /** Whether the palette is open. Omit for internally managed state. */
  open?: boolean;
  /** Accessible label for the dialog. Defaults to `'Command palette'`. */
  label?: string;
  /** Input placeholder. */
  placeholder?: string;
  /** Message displayed when filtering finds no commands. */
  emptyText?: string;
  /** Label for the optional built-in trigger. */
  triggerLabel?: string;
  /** Keyboard key used with `shortcutModifier`. Defaults to `'k'`. */
  shortcutKey?: string;
  /** Modifier used by the global open shortcut. Defaults to `'meta'`. */
  shortcutModifier?: 'meta' | 'ctrl' | 'alt' | 'shift';
  /** Size token. Defaults to `'md'`. */
  size?: CommandPaletteSize;
  /** Close after selecting a command. Defaults to `true`. */
  closeOnSelect?: boolean;
  /** Called when the component requests a new open state. */
  onOpenChange?: (open: boolean) => void;
  onUpdateModelValue?: (open: boolean) => void;
  /** Called when the query changes. */
  onQueryChange?: (query: string) => void;
  /** Called after a command is selected. */
  onSelect?: (command: CommandPaletteCommand) => void;
}

/**
 * A searchable, keyboard-first command palette with a modal overlay. The neutral
 * implementation keeps filtering and selection framework-independent while
 * guarding global document listeners for SSR.
 */
export function ForgeCommandPalette(properties: Readonly<CommandPaletteProperties>): MpElement {
  const {
    commands,
    groups,
    maxResults,
    loading = false,
    open,
    label = 'Command palette',
    placeholder = 'Search commands…',
    emptyText = 'No commands found',
    triggerLabel = 'Open command palette',
    shortcutKey = 'k',
    shortcutModifier = 'meta',
    size = 'md',
    closeOnSelect = true,
  } = properties;
  const [internalOpen, setInternalOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputReference = useRef<HTMLInputElement | null>(null);
  const rootReference = useRef<HTMLElement | null>(null);
  const instanceId = useId().replaceAll(/[^a-zA-Z0-9_-]/g, '') || 'instance';
  const isOpen = properties.modelValue ?? open ?? internalOpen;
  const listId = `forge-command-palette-list-${instanceId}`;

  const requestOpen = (next: boolean): void => {
    if (open === undefined) {
      setInternalOpen(next);
    }
    properties.onOpenChange?.(next);
    properties.onUpdateModelValue?.(next);
  };

  const filteredCommands = commands.filter((command) => {
    const haystack = [command.label, command.description, command.group, ...(command.keywords ?? [])]
      .filter((value): value is string => value !== undefined)
      .join(' ')
      .toLocaleLowerCase();
    return haystack.includes(query.trim().toLocaleLowerCase());
  });
  const visibleCommands =
    maxResults === undefined ? filteredCommands : filteredCommands.slice(0, Math.max(0, maxResults));
  const enabledCommands = visibleCommands.filter((command) => !command.disabled);
  const groupOrder = groups?.map((group) => group.id) ?? [
    ...new Set(visibleCommands.map((command) => command.group).filter((group): group is string => group !== undefined)),
  ];
  const groupLabels = new Map((groups ?? []).map((group) => [group.id, group.label]));
  const groupedCommands = groupOrder
    .map((group) => ({ group, commands: visibleCommands.filter((command) => command.group === group) }))
    .filter(({ commands: groupCommands }) => groupCommands.length > 0);
  const ungroupedCommands = visibleCommands.filter(
    (command) => command.group === undefined || !groupOrder.includes(command.group),
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    inputReference.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (globalThis.document === undefined) {
      return;
    }
    const onKeydown = (event: KeyboardEvent): void => {
      const modifierPressed = event.metaKey || event.ctrlKey;
      if (modifierPressed && event.key.toLocaleLowerCase() === shortcutKey.toLocaleLowerCase()) {
        event.preventDefault();
        requestOpen(true);
        return;
      }
      if (!isOpen) {
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        requestOpen(false);
      }
    };
    document.addEventListener('keydown', onKeydown);
    return () => document.removeEventListener('keydown', onKeydown);
  }, [isOpen, shortcutKey, shortcutModifier]);

  const select = (command: CommandPaletteCommand): void => {
    if (command.disabled) {
      return;
    }
    command.onSelect?.();
    properties.onSelect?.(command);
    if (closeOnSelect) {
      requestOpen(false);
    }
  };

  const onInput = (event: Event): void => {
    const nextQuery = (event.currentTarget as HTMLInputElement).value;
    setQuery(nextQuery);
    setActiveIndex(0);
    properties.onQueryChange?.(nextQuery);
  };

  const onInputKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex(enabledCommands.length === 0 ? 0 : (activeIndex + 1) % enabledCommands.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(
        enabledCommands.length === 0 ? 0 : (activeIndex - 1 + enabledCommands.length) % enabledCommands.length,
      );
    } else if (event.key === 'Enter' && enabledCommands[selectedIndex] !== undefined) {
      event.preventDefault();
      select(enabledCommands[selectedIndex]);
    }
  };

  const selectedIndex = Math.min(activeIndex, Math.max(enabledCommands.length - 1, 0));
  const activeCommand = enabledCommands[selectedIndex];
  const renderCommand = (command: CommandItem): MpChild => {
    const enabledIndex = enabledCommands.findIndex((candidate) => candidate.id === command.id);
    const commandId = `${instanceId}-command-${command.id.replaceAll(/[^a-zA-Z0-9_-]/g, '-')}`;
    const active = enabledIndex === selectedIndex;
    return (
      <button
        aria-disabled={command.disabled ? 'true' : undefined}
        aria-selected={active ? 'true' : 'false'}
        className={classNames(styles['forge-command-palette__command'], {
          [styles['forge-command-palette__command--active']]: active,
          [styles['forge-command-palette__command--disabled']]: command.disabled,
        })}
        disabled={command.disabled}
        id={commandId}
        key={command.id}
        onClick={() => select(command)}
        role="option"
        type="button"
      >
        {command.icon === undefined ? undefined : <span aria-hidden="true">{command.icon}</span>}
        <span className={styles['forge-command-palette__copy']}>
          <span>{command.label}</span>
          {command.description ? <small>{command.description}</small> : undefined}
        </span>
        {command.shortcut ? <kbd>{command.shortcut}</kbd> : undefined}
      </button>
    );
  };
  const dialog = isOpen ? (
    <div
      className={styles['forge-command-palette__overlay']}
      onClick={(event: MouseEvent) => {
        if (event.target === event.currentTarget) {
          requestOpen(false);
        }
      }}
    >
      <section
        aria-label={label}
        aria-modal="true"
        className={classNames(styles['forge-command-palette'], styles[`forge-command-palette--${size}`])}
        ref={rootReference}
        role="dialog"
      >
        <div className={styles['forge-command-palette__search']}>
          <input
            aria-activedescendant={
              activeCommand ? `${instanceId}-command-${activeCommand.id.replaceAll(/[^a-zA-Z0-9_-]/g, '-')}` : undefined
            }
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded="true"
            aria-label={label}
            aria-haspopup="listbox"
            className={styles['forge-command-palette__input']}
            onInput={onInput}
            onKeydown={onInputKeydown}
            placeholder={placeholder}
            ref={inputReference}
            role="combobox"
            type="search"
            value={query}
          />
          <kbd className={styles['forge-command-palette__key']}>⌘/Ctrl {shortcutKey.toUpperCase()}</kbd>
        </div>
        <div
          aria-label="Commands"
          className={styles['forge-command-palette__list']}
          id={listId}
          role="listbox"
        >
          {loading ? (
            <p
              aria-label="Loading commands"
              className={styles['forge-command-palette__empty']}
              role="status"
            >
              Loading commands…
            </p>
          ) : visibleCommands.length === 0 ? (
            <p className={styles['forge-command-palette__empty']}>{emptyText}</p>
          ) : (
            <>
              {groupedCommands.map(({ group, commands: groupCommands }) => (
                <div
                  key={group}
                  className={styles['forge-command-palette__group']}
                >
                  <h3>{groupLabels.get(group) ?? group}</h3>
                  {groupCommands.map((command) => renderCommand(command))}
                </div>
              ))}
              {ungroupedCommands.map((command) => renderCommand(command))}
            </>
          )}
        </div>
        {hasSlot('footer') ? (
          <footer className={styles['forge-command-palette__footer']}>
            <Slot name="footer">{properties.footer}</Slot>
          </footer>
        ) : undefined}
        {properties.children === undefined ? undefined : <Slot />}
      </section>
    </div>
  ) : undefined;

  return (
    <div className={styles['forge-command-palette-host']}>
      {hasSlot('trigger') ? (
        <Slot name="trigger">{properties.trigger}</Slot>
      ) : (
        <button
          aria-haspopup="dialog"
          aria-label={triggerLabel}
          aria-expanded={isOpen ? 'true' : 'false'}
          className={styles['forge-command-palette__trigger']}
          onClick={() => requestOpen(!isOpen)}
          type="button"
        >
          {triggerLabel}
          <kbd>⌘/Ctrl {shortcutKey.toUpperCase()}</kbd>
        </button>
      )}
      {dialog}
    </div>
  );
}
