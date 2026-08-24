import { classNames, type MpElement, useEffect, useState } from '@mission-platform/forge';

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
export interface TestimonialsSectionProperties {
  testimonials: Testimonial[];
  title?: string;
  ariaLabel?: string;
  variant?: TestimonialsVariant;
  autoplay?: boolean;
  columns?: number;
  interval?: number;
  onChange?: (index: number) => void;
}

export function ForgeTestimonialsSection(properties: Readonly<TestimonialsSectionProperties>): MpElement {
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
      />
    );
  const columnCount = Math.max(1, Math.floor(columns));
  return (
    <section
      className={classNames(styles['forge-testimonials-section'], styles[`forge-testimonials-section--${variant}`])}
      aria-label={resolvedAriaLabel}
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
