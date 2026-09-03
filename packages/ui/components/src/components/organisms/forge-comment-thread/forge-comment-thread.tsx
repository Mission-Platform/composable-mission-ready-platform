import {
  classNames,
  useState,
  createForgeStyle,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge';

import { initialsForName } from '../../../utils';
import { ForgeAvatar } from '../../atoms/forge-avatar/forge-avatar';

import styles from './forge-comment-thread.module.scss';

export type CommentThreadSize = 'sm' | 'md' | 'lg';
export interface CommentAuthor {
  id?: string;
  name: string;
  avatar?: string;
}

export interface CommentThreadComment {
  id: string;
  author: CommentAuthor | string;
  content?: string;
  body?: string;
  timestamp: string;
  avatar?: string;
  resolved?: boolean;
  replies?: CommentThreadComment[];
}

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface CommentThreadStyleProperties {
  readonly 'border-width-thick'?: string;
  readonly 'border-width-thin'?: string;
  readonly 'color-bg-muted'?: string;
  readonly 'color-border-default'?: string;
  readonly 'color-border-focus'?: string;
  readonly 'color-primary-default'?: string;
  readonly 'color-primary-subtle'?: string;
  readonly 'color-success-text'?: string;
  readonly 'color-text-link'?: string;
  readonly 'color-text-on-primary'?: string;
  readonly 'color-text-primary'?: string;
  readonly 'color-text-secondary'?: string;
  readonly 'font-size-sm'?: string;
  readonly 'font-weight-semibold'?: string;
  readonly 'opacity-disabled'?: string;
  readonly 'opacity-muted'?: string;
  readonly 'radius-full'?: string;
  readonly 'radius-md'?: string;
  readonly 'size-height-md'?: string;
  readonly 'size-pad-block-md'?: string;
  readonly 'size-pad-inline-lg'?: string;
  readonly 'size-pad-inline-md'?: string;
  readonly 'spacing-1'?: string;
  readonly 'spacing-2'?: string;
  readonly 'spacing-3'?: string;
  readonly 'spacing-4'?: string;
  readonly 'spacing-6'?: string;
}

export type CommentThreadStyle = CSSStyleProperties & {
  readonly '--forge-comment-thread-border-width-thick'?: string | undefined;
  readonly '--forge-comment-thread-border-width-thin'?: string | undefined;
  readonly '--forge-comment-thread-color-bg-muted'?: string | undefined;
  readonly '--forge-comment-thread-color-border-default'?: string | undefined;
  readonly '--forge-comment-thread-color-border-focus'?: string | undefined;
  readonly '--forge-comment-thread-color-primary-default'?: string | undefined;
  readonly '--forge-comment-thread-color-primary-subtle'?: string | undefined;
  readonly '--forge-comment-thread-color-success-text'?: string | undefined;
  readonly '--forge-comment-thread-color-text-link'?: string | undefined;
  readonly '--forge-comment-thread-color-text-on-primary'?: string | undefined;
  readonly '--forge-comment-thread-color-text-primary'?: string | undefined;
  readonly '--forge-comment-thread-color-text-secondary'?: string | undefined;
  readonly '--forge-comment-thread-font-size-sm'?: string | undefined;
  readonly '--forge-comment-thread-font-weight-semibold'?: string | undefined;
  readonly '--forge-comment-thread-opacity-disabled'?: string | undefined;
  readonly '--forge-comment-thread-opacity-muted'?: string | undefined;
  readonly '--forge-comment-thread-radius-full'?: string | undefined;
  readonly '--forge-comment-thread-radius-md'?: string | undefined;
  readonly '--forge-comment-thread-size-height-md'?: string | undefined;
  readonly '--forge-comment-thread-size-pad-block-md'?: string | undefined;
  readonly '--forge-comment-thread-size-pad-inline-lg'?: string | undefined;
  readonly '--forge-comment-thread-size-pad-inline-md'?: string | undefined;
  readonly '--forge-comment-thread-spacing-1'?: string | undefined;
  readonly '--forge-comment-thread-spacing-2'?: string | undefined;
  readonly '--forge-comment-thread-spacing-3'?: string | undefined;
  readonly '--forge-comment-thread-spacing-4'?: string | undefined;
  readonly '--forge-comment-thread-spacing-6'?: string | undefined;
};

function createCommentThreadStyle(
  properties: Readonly<CommentThreadStyleProperties> | undefined,
): CommentThreadStyle | undefined {
  return createForgeStyle({
    '--forge-comment-thread-border-width-thick': properties?.['border-width-thick'],
    '--forge-comment-thread-border-width-thin': properties?.['border-width-thin'],
    '--forge-comment-thread-color-bg-muted': properties?.['color-bg-muted'],
    '--forge-comment-thread-color-border-default': properties?.['color-border-default'],
    '--forge-comment-thread-color-border-focus': properties?.['color-border-focus'],
    '--forge-comment-thread-color-primary-default': properties?.['color-primary-default'],
    '--forge-comment-thread-color-primary-subtle': properties?.['color-primary-subtle'],
    '--forge-comment-thread-color-success-text': properties?.['color-success-text'],
    '--forge-comment-thread-color-text-link': properties?.['color-text-link'],
    '--forge-comment-thread-color-text-on-primary': properties?.['color-text-on-primary'],
    '--forge-comment-thread-color-text-primary': properties?.['color-text-primary'],
    '--forge-comment-thread-color-text-secondary': properties?.['color-text-secondary'],
    '--forge-comment-thread-font-size-sm': properties?.['font-size-sm'],
    '--forge-comment-thread-font-weight-semibold': properties?.['font-weight-semibold'],
    '--forge-comment-thread-opacity-disabled': properties?.['opacity-disabled'],
    '--forge-comment-thread-opacity-muted': properties?.['opacity-muted'],
    '--forge-comment-thread-radius-full': properties?.['radius-full'],
    '--forge-comment-thread-radius-md': properties?.['radius-md'],
    '--forge-comment-thread-size-height-md': properties?.['size-height-md'],
    '--forge-comment-thread-size-pad-block-md': properties?.['size-pad-block-md'],
    '--forge-comment-thread-size-pad-inline-lg': properties?.['size-pad-inline-lg'],
    '--forge-comment-thread-size-pad-inline-md': properties?.['size-pad-inline-md'],
    '--forge-comment-thread-spacing-1': properties?.['spacing-1'],
    '--forge-comment-thread-spacing-2': properties?.['spacing-2'],
    '--forge-comment-thread-spacing-3': properties?.['spacing-3'],
    '--forge-comment-thread-spacing-4': properties?.['spacing-4'],
    '--forge-comment-thread-spacing-6': properties?.['spacing-6'],
  }) as CommentThreadStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface CommentThreadProperties {
  comments: CommentThreadComment[];
  currentUser?: CommentAuthor | string;
  maxDepth?: number;
  ariaLabel?: string;
  placeholder?: string;
  submitLabel?: string;
  resolveLabel?: string;
  emptyText?: string;
  size?: CommentThreadSize;
  onReply?: (parentId: string, content: string) => void;
  onEdit?: (commentId: string, content: string) => void;
  onDelete?: (commentId: string) => void;
  onReact?: (commentId: string, reaction: string) => void;
  onResolve?: (comment: CommentThreadComment) => void;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<CommentThreadStyleProperties>;
}

export function ForgeCommentThread(properties: Readonly<CommentThreadProperties>): MpElement {
  const style = createCommentThreadStyle(properties.properties);

  const {
    comments,
    ariaLabel = 'Comments',
    placeholder = 'Write a comment…',
    submitLabel = 'Post comment',
    resolveLabel = 'Resolve comment',
    emptyText = 'No comments yet',
    size = 'md',
    maxDepth = 3,
  } = properties;
  const [replyText, setReplyText] = useState('');
  const resolve = (comment: CommentThreadComment): void => {
    properties.onResolve?.(comment);
  };

  const submit = (event: Event): void => {
    event.preventDefault();
    const body = replyText.trim();
    if (body === '') return;
    properties.onReply?.('', body);
    setReplyText('');
  };

  const renderComment = (comment: CommentThreadComment, depth: number): MpElement => {
    const author =
      typeof comment.author === 'string' ? { name: comment.author, avatar: comment.avatar } : comment.author;
    const content = comment.content ?? comment.body ?? '';
    const currentUserName =
      typeof properties.currentUser === 'string' ? properties.currentUser : properties.currentUser?.name;
    return (
      <li
        className={classNames(styles['forge-comment-thread__comment'], {
          [styles['forge-comment-thread__comment--resolved']]: comment.resolved,
          [styles['forge-comment-thread__comment--own']]: author.name === currentUserName,
        })}
        key={comment.id}
      >
        <span className={styles['forge-comment-thread__avatar']}>
          <ForgeAvatar
            alt=""
            initials={initialsForName(author.name)}
            size="sm"
            src={author.avatar}
          />
        </span>
        <div className={styles['forge-comment-thread__body']}>
          <div className={styles['forge-comment-thread__meta']}>
            <strong>{author.name}</strong>
            <time dateTime={comment.timestamp}>{comment.timestamp}</time>
          </div>
          <p>{content}</p>
          {comment.resolved ? (
            <span
              className={styles['forge-comment-thread__resolved']}
              role="status"
            >
              Resolved
            </span>
          ) : (
            <button
              className={styles['forge-comment-thread__resolve']}
              type="button"
              onClick={() => resolve(comment)}
            >
              {resolveLabel}
            </button>
          )}
          {author.name === currentUserName ? (
            <span>
              <button
                type="button"
                onClick={() => properties.onEdit?.(comment.id, content)}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => properties.onDelete?.(comment.id)}
              >
                Delete
              </button>
            </span>
          ) : undefined}
          <button
            type="button"
            onClick={() => properties.onReact?.(comment.id, 'like')}
          >
            React
          </button>
          {depth < maxDepth && comment.replies && comment.replies.length > 0 ? (
            <ol className={styles['forge-comment-thread__list']}>
              {comment.replies.map((reply) => renderComment(reply, depth + 1))}
            </ol>
          ) : undefined}
        </div>
      </li>
    );
  };

  return (
    <section
      aria-label={ariaLabel}
      className={classNames(styles['forge-comment-thread'], `forge-size--${size}`)}
      style={style}
    >
      {comments.length === 0 ? (
        <p className={styles['forge-comment-thread__empty']}>{emptyText}</p>
      ) : (
        <ol className={styles['forge-comment-thread__list']}>{comments.map((comment) => renderComment(comment, 0))}</ol>
      )}
      <form
        className={styles['forge-comment-thread__form']}
        onSubmit={submit}
      >
        <label className={styles['forge-comment-thread__label']}>
          <span className={styles['forge-comment-thread__label-text']}>Add a comment</span>
          <textarea
            aria-label="Add a comment"
            className={styles['forge-comment-thread__input']}
            placeholder={placeholder}
            value={replyText}
            onInput={(event: Event) => setReplyText((event.target as HTMLTextAreaElement).value)}
          />
        </label>
        <button
          className={styles['forge-comment-thread__submit']}
          type="submit"
          disabled={replyText.trim() === ''}
        >
          {submitLabel}
        </button>
      </form>
    </section>
  );
}
