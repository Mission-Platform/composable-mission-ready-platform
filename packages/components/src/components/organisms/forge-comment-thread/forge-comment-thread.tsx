import { classNames, type MpElement, useState } from '@mission-platform/forge';

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
}

export function ForgeCommentThread(properties: Readonly<CommentThreadProperties>): MpElement {
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
