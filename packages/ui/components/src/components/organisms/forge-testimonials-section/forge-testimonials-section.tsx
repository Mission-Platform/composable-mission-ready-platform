import {
  classNames,
  useEffect,
  useState,
  createForgeStyle,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge';

import { initialsForName } from '../../../utils';
import { ForgeAvatar } from '../../atoms/forge-avatar/forge-avatar';

import styles from './forge-testimonials-section.module.scss';

export interface Testimonial {
  id: string;
  quote: string;
  name: string;
  role?: string;
  company?: string;
  src?: string;
}
export type TestimonialsVariant = 'carousel' | 'grid' | 'cards' | 'card' | 'featured' | 'minimal' | 'single';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface TestimonialsSectionStyleProperties {
  readonly 'border-width-thin'?: string;
  readonly 'color-bg-muted'?: string;
  readonly 'color-bg-surface'?: string;
  readonly 'color-border-default'?: string;
  readonly 'color-text-tertiary'?: string;
  readonly 'line-height-relaxed'?: string;
  readonly 'radius-full'?: string;
  readonly 'radius-lg'?: string;
  readonly 'size-height-lg'?: string;
  readonly 'spacing-1'?: string;
  readonly 'spacing-4'?: string;
  readonly 'spacing-5'?: string;
  readonly 'spacing-6'?: string;
  readonly 'spacing-8'?: string;
}

export type TestimonialsSectionStyle = CSSStyleProperties & {
  readonly '--forge-testimonials-section-border-width-thin'?: string | undefined;
  readonly '--forge-testimonials-section-color-bg-muted'?: string | undefined;
  readonly '--forge-testimonials-section-color-bg-surface'?: string | undefined;
  readonly '--forge-testimonials-section-color-border-default'?: string | undefined;
  readonly '--forge-testimonials-section-color-text-tertiary'?: string | undefined;
  readonly '--forge-testimonials-section-line-height-relaxed'?: string | undefined;
  readonly '--forge-testimonials-section-radius-full'?: string | undefined;
  readonly '--forge-testimonials-section-radius-lg'?: string | undefined;
  readonly '--forge-testimonials-section-size-height-lg'?: string | undefined;
  readonly '--forge-testimonials-section-spacing-1'?: string | undefined;
  readonly '--forge-testimonials-section-spacing-4'?: string | undefined;
  readonly '--forge-testimonials-section-spacing-5'?: string | undefined;
  readonly '--forge-testimonials-section-spacing-6'?: string | undefined;
  readonly '--forge-testimonials-section-spacing-8'?: string | undefined;
};

function createTestimonialsSectionStyle(
  properties: Readonly<TestimonialsSectionStyleProperties> | undefined,
): TestimonialsSectionStyle | undefined {
  return createForgeStyle({
    '--forge-testimonials-section-border-width-thin': properties?.['border-width-thin'],
    '--forge-testimonials-section-color-bg-muted': properties?.['color-bg-muted'],
    '--forge-testimonials-section-color-bg-surface': properties?.['color-bg-surface'],
    '--forge-testimonials-section-color-border-default': properties?.['color-border-default'],
    '--forge-testimonials-section-color-text-tertiary': properties?.['color-text-tertiary'],
    '--forge-testimonials-section-line-height-relaxed': properties?.['line-height-relaxed'],
    '--forge-testimonials-section-radius-full': properties?.['radius-full'],
    '--forge-testimonials-section-radius-lg': properties?.['radius-lg'],
    '--forge-testimonials-section-size-height-lg': properties?.['size-height-lg'],
    '--forge-testimonials-section-spacing-1': properties?.['spacing-1'],
    '--forge-testimonials-section-spacing-4': properties?.['spacing-4'],
    '--forge-testimonials-section-spacing-5': properties?.['spacing-5'],
    '--forge-testimonials-section-spacing-6': properties?.['spacing-6'],
    '--forge-testimonials-section-spacing-8': properties?.['spacing-8'],
  }) as TestimonialsSectionStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface TestimonialsSectionProperties {
  testimonials: Testimonial[];
  title?: string;
  ariaLabel?: string;
  variant?: TestimonialsVariant;
  autoplay?: boolean;
  columns?: number;
  interval?: number;
  onChange?: (index: number) => void;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<TestimonialsSectionStyleProperties>;
}

export function ForgeTestimonialsSection(properties: Readonly<TestimonialsSectionProperties>): MpElement {
  const style = createTestimonialsSectionStyle(properties.properties);

  const {
    testimonials,
    title,
    ariaLabel,
    variant = 'carousel',
    autoplay = false,
    columns = 3,
    interval = 5000,
  } = properties;
  const resolvedAriaLabel = ariaLabel ?? title ?? 'Testimonials';
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(!autoplay);
  const current = testimonials[index];
  const change = (next: number): void => {
    const value = (next + testimonials.length) % testimonials.length;
    setIndex(value);
    properties.onChange?.(value);
  };
  const isCollection = variant === 'grid' || variant === 'cards' || variant === 'card';
  useEffect(() => {
    if (!autoplay || paused || testimonials.length < 2 || typeof globalThis.setInterval !== 'function') return;
    const timer = globalThis.setInterval(() => change(index + 1), interval);
    return () => globalThis.clearInterval(timer);
  }, [autoplay, index, interval, paused, testimonials.length]);
  const renderTestimonial = (testimonial: Testimonial): MpElement => (
    <figure key={testimonial.id}>
      <blockquote>“{testimonial.quote}”</blockquote>
      <figcaption>
        <span className={styles['forge-testimonials-section__avatar']}>
          <ForgeAvatar
            alt=""
            initials={initialsForName(testimonial.name)}
            size="md"
            src={testimonial.src}
          />
        </span>
        <strong>{testimonial.name}</strong>
        {testimonial.role ? (
          <span>
            {testimonial.role}
            {testimonial.company ? `, ${testimonial.company}` : ''}
          </span>
        ) : undefined}
      </figcaption>
    </figure>
  );
  if (!current && !isCollection)
    return (
      <section
        className={classNames(styles['forge-testimonials-section'], styles[`forge-testimonials-section--${variant}`])}
        aria-label={ariaLabel}
        style={style}
      />
    );
  const columnCount = Math.max(1, Math.floor(columns));
  return (
    <section
      className={classNames(styles['forge-testimonials-section'], styles[`forge-testimonials-section--${variant}`])}
      aria-label={resolvedAriaLabel}
      style={style}
    >
      {title ? <h2>{title}</h2> : undefined}
      {isCollection ? (
        <div
          className={styles['forge-testimonials-section__grid']}
          style={{ '--forge-testimonial-columns': columnCount } as Record<string, number>}
        >
          {testimonials.map((testimonial) => renderTestimonial(testimonial))}
        </div>
      ) : current ? (
        renderTestimonial(current)
      ) : undefined}
      {!isCollection && testimonials.length > 1 ? (
        <div className={styles['forge-testimonials-section__controls']}>
          <button
            type="button"
            aria-label="Previous testimonial"
            onClick={() => change(index - 1)}
          >
            ←
          </button>
          <span aria-live="polite">
            {index + 1} / {testimonials.length}
          </span>
          <button
            type="button"
            aria-label="Next testimonial"
            onClick={() => change(index + 1)}
          >
            →
          </button>
          {autoplay ? (
            <button
              type="button"
              aria-label={paused ? 'Resume autoplay' : 'Pause autoplay'}
              onClick={() => setPaused(!paused)}
            >
              {paused ? 'Play' : 'Pause'}
            </button>
          ) : undefined}
        </div>
      ) : undefined}
    </section>
  );
}
