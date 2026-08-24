import { classNames, type MpChild, type MpElement, Slot, useId, useRef, useState } from '@mission-platform/forge';

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
    <div className={classNames(styles['forge-drop-zone'], { [styles['forge-drop-zone--disabled']]: disabled })}>
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
