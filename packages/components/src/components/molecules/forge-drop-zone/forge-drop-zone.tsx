import {
  classNames,
  Slot,
  useId,
  useRef,
  useState,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge';

import styles from './forge-drop-zone.module.scss';

export type DropZoneSize = 'sm' | 'md' | 'lg';
export type DropZoneValue = File | File[];

export interface DropZoneScope {
  isDragover: boolean;
  isUploading: boolean;
  files: readonly File[];
}

export interface DropZoneReject {
  file: File;
  reason: string;
}

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface DropZoneStyleProperties {
  readonly 'border-width-heavy'?: string;
  readonly 'border-width-thick'?: string;
  readonly 'color-bg-sunken'?: string;
  readonly 'color-border-default'?: string;
  readonly 'color-border-focus'?: string;
  readonly 'color-danger-default'?: string;
  readonly 'color-danger-text'?: string;
  readonly 'color-primary-subtle'?: string;
  readonly 'color-text-link'?: string;
  readonly 'color-text-primary'?: string;
  readonly 'color-text-secondary'?: string;
  readonly 'font-size-lg'?: string;
  readonly 'font-size-sm'?: string;
  readonly 'font-weight-medium'?: string;
  readonly 'font-weight-semibold'?: string;
  readonly 'opacity-disabled'?: string;
  readonly 'radius-md'?: string;
  readonly 'spacing-1'?: string;
  readonly 'spacing-2'?: string;
  readonly 'spacing-3'?: string;
  readonly 'spacing-5'?: string;
  readonly 'spacing-6'?: string;
}

export type DropZoneStyle = CSSStyleProperties & {
  readonly '--forge-drop-zone-border-width-heavy'?: string | undefined;
  readonly '--forge-drop-zone-border-width-thick'?: string | undefined;
  readonly '--forge-drop-zone-color-bg-sunken'?: string | undefined;
  readonly '--forge-drop-zone-color-border-default'?: string | undefined;
  readonly '--forge-drop-zone-color-border-focus'?: string | undefined;
  readonly '--forge-drop-zone-color-danger-default'?: string | undefined;
  readonly '--forge-drop-zone-color-danger-text'?: string | undefined;
  readonly '--forge-drop-zone-color-primary-subtle'?: string | undefined;
  readonly '--forge-drop-zone-color-text-link'?: string | undefined;
  readonly '--forge-drop-zone-color-text-primary'?: string | undefined;
  readonly '--forge-drop-zone-color-text-secondary'?: string | undefined;
  readonly '--forge-drop-zone-font-size-lg'?: string | undefined;
  readonly '--forge-drop-zone-font-size-sm'?: string | undefined;
  readonly '--forge-drop-zone-font-weight-medium'?: string | undefined;
  readonly '--forge-drop-zone-font-weight-semibold'?: string | undefined;
  readonly '--forge-drop-zone-opacity-disabled'?: string | undefined;
  readonly '--forge-drop-zone-radius-md'?: string | undefined;
  readonly '--forge-drop-zone-spacing-1'?: string | undefined;
  readonly '--forge-drop-zone-spacing-2'?: string | undefined;
  readonly '--forge-drop-zone-spacing-3'?: string | undefined;
  readonly '--forge-drop-zone-spacing-5'?: string | undefined;
  readonly '--forge-drop-zone-spacing-6'?: string | undefined;
};

function createDropZoneStyle(properties: Readonly<DropZoneStyleProperties> | undefined): DropZoneStyle | undefined {
  return createForgeStyle({
    '--forge-drop-zone-border-width-heavy': properties?.['border-width-heavy'],
    '--forge-drop-zone-border-width-thick': properties?.['border-width-thick'],
    '--forge-drop-zone-color-bg-sunken': properties?.['color-bg-sunken'],
    '--forge-drop-zone-color-border-default': properties?.['color-border-default'],
    '--forge-drop-zone-color-border-focus': properties?.['color-border-focus'],
    '--forge-drop-zone-color-danger-default': properties?.['color-danger-default'],
    '--forge-drop-zone-color-danger-text': properties?.['color-danger-text'],
    '--forge-drop-zone-color-primary-subtle': properties?.['color-primary-subtle'],
    '--forge-drop-zone-color-text-link': properties?.['color-text-link'],
    '--forge-drop-zone-color-text-primary': properties?.['color-text-primary'],
    '--forge-drop-zone-color-text-secondary': properties?.['color-text-secondary'],
    '--forge-drop-zone-font-size-lg': properties?.['font-size-lg'],
    '--forge-drop-zone-font-size-sm': properties?.['font-size-sm'],
    '--forge-drop-zone-font-weight-medium': properties?.['font-weight-medium'],
    '--forge-drop-zone-font-weight-semibold': properties?.['font-weight-semibold'],
    '--forge-drop-zone-opacity-disabled': properties?.['opacity-disabled'],
    '--forge-drop-zone-radius-md': properties?.['radius-md'],
    '--forge-drop-zone-spacing-1': properties?.['spacing-1'],
    '--forge-drop-zone-spacing-2': properties?.['spacing-2'],
    '--forge-drop-zone-spacing-3': properties?.['spacing-3'],
    '--forge-drop-zone-spacing-5': properties?.['spacing-5'],
    '--forge-drop-zone-spacing-6': properties?.['spacing-6'],
  }) as DropZoneStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface DropZoneProperties {
  children?: MpChild | readonly MpChild[];
  id?: string;
  label?: string;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSize?: number;
  disabled?: boolean;
  onDrop?: (files: File[]) => void;
  onReject?: (errors: DropZoneReject[]) => void;
  onDragEnter?: () => void;
  onDragLeave?: () => void;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<DropZoneStyleProperties>;
}

function matchesAccept(file: File, accept: string): boolean {
  return accept
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean)
    .some((token) => {
      if (token.startsWith('.')) return file.name.toLowerCase().endsWith(token);
      if (token.endsWith('/*')) return file.type.toLowerCase().startsWith(token.slice(0, -1));
      return file.type.toLowerCase() === token;
    });
}

/** A keyboard-accessible drag-and-drop file target with client-side validation. */
export function ForgeDropZone(properties: Readonly<DropZoneProperties>): MpElement {
  const style = createDropZoneStyle(properties.properties);

  const generatedId = useId();
  const resolvedId = properties.id ?? generatedId;
  const inputReference = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<readonly File[]>([]);
  const [errors, setErrors] = useState<DropZoneReject[]>([]);
  const { accept, multiple = true, maxFiles = Number.POSITIVE_INFINITY, maxSize, disabled = false } = properties;

  const reportFiles = (incomingFiles: File[]): void => {
    if (incomingFiles.length === 0) return;
    const rejected: DropZoneReject[] = [];
    if (!multiple && incomingFiles.length > 1) {
      rejected.push(...incomingFiles.slice(1).map((file) => ({ file, reason: 'Only one file is allowed.' })));
    }
    if (incomingFiles.length > maxFiles) {
      rejected.push(
        ...incomingFiles.slice(maxFiles).map((file) => ({ file, reason: `You can choose up to ${maxFiles} files.` })),
      );
    }
    if (maxSize !== undefined) {
      rejected.push(
        ...incomingFiles
          .filter((file) => file.size > maxSize)
          .map((file) => ({ file, reason: `${file.name} is too large.` })),
      );
    }
    if (accept) {
      rejected.push(
        ...incomingFiles
          .filter((file) => !matchesAccept(file, accept))
          .map((file) => ({ file, reason: `${file.name} is not an accepted file type.` })),
      );
    }
    if (rejected.length > 0) {
      setErrors(rejected);
      properties.onReject?.(rejected);
      return;
    }
    setErrors([]);
    const selected = multiple ? incomingFiles : incomingFiles.slice(0, 1);
    setFiles(selected);
    properties.onDrop?.(selected);
  };

  const openPicker = (): void => {
    if (!disabled) inputReference.current?.click();
  };
  const onInput = (event: Event): void => reportFiles([...((event.target as HTMLInputElement).files ?? [])]);
  const handleDrop = (event: DragEvent): void => {
    event.preventDefault();
    setDragging(false);
    if (!disabled) reportFiles([...(event.dataTransfer?.files ?? [])]);
  };
  const onKeydown = (event: KeyboardEvent): void => {
    if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      openPicker();
    }
  };
  return (
    <div
      className={classNames(styles['forge-drop-zone'], { [styles['forge-drop-zone--disabled']]: disabled })}
      style={style}
    >
      <div
        aria-disabled={disabled ? 'true' : undefined}
        aria-label={properties.label ?? 'Upload files'}
        className={classNames(styles['forge-drop-zone__target'], {
          [styles['forge-drop-zone__target--dragging']]: dragging,
        })}
        aria-invalid={errors.length > 0 ? 'true' : undefined}
        role="button"
        tabindex={disabled ? -1 : 0}
        onClick={openPicker}
        onDragEnter={(event: DragEvent) => {
          event.preventDefault();
          if (!disabled) {
            setDragging(true);
            properties.onDragEnter?.();
          }
        }}
        onDragLeave={() => {
          setDragging(false);
          properties.onDragLeave?.();
        }}
        onDragOver={(event: DragEvent) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDrop={handleDrop}
        onKeydown={onKeydown}
      >
        <span className={styles['forge-drop-zone__prompt']}>
          <Slot
            isDragover={dragging}
            isUploading={false}
            files={files}
          >
            {properties.children ?? 'Drop files here or browse'}
          </Slot>
        </span>
        {errors.length > 0 ? <span role="alert">{errors[0]?.reason}</span> : undefined}
      </div>
      <input
        ref={inputReference}
        id={resolvedId}
        accept={accept}
        className={styles['forge-drop-zone__input']}
        disabled={disabled}
        multiple={multiple}
        type="file"
        onChange={onInput}
      />
    </div>
  );
}
