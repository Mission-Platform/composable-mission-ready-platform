import { describe, expect, it } from 'vitest';

import {
  extractComponentPropertyUsages,
  validateComponentStylesheet,
} from './validate-component-property-declarations';

describe('component property declaration validation', () => {
  it('expands finite Sass lists and maps into concrete usage names', () => {
    const usages = extractComponentPropertyUsages(`
      @each $size in 'sm', 'lg' {
        .component--#{$size} { padding: var(--forge-card-size-#{$size}-padding, var(--mp-card-size-#{$size}-padding)); }
      }
      @each $name, $family in ('success': 'success', 'error': 'danger') {
        .component--#{$name} { color: var(--forge-card-tone-#{$family}-text, red); }
      }
    `);

    expect(usages.map((usage) => usage.property)).toEqual([
      '--forge-card-size-sm-padding',
      '--forge-card-size-lg-padding',
      '--forge-card-tone-success-text',
      '--forge-card-tone-danger-text',
    ]);
  });

  it('reports missing, duplicate, orphaned, and unresolved declarations', () => {
    const issues = validateComponentStylesheet(
      '/fixtures/component.module.scss',
      `
        .component { color: var(--forge-component-color, red); }
        .component { margin: var(--forge-component-gap, 1rem); }
        @each $size in 'sm' { .component { padding: var(--forge-component-padding-#{$size}, 1rem); } }
        @property --forge-component-color { syntax: "*"; inherits: true; initial-value: red; }
        @property --forge-component-color { syntax: "*"; inherits: true; initial-value: red; }
        @property --forge-component-unused { syntax: "*"; inherits: true; initial-value: red; }
        @property --forge-component-dynamic-#{$size} { syntax: "*"; inherits: true; initial-value: red; }
      `,
    );

    expect(new Set(issues.map((issue) => issue.kind))).toEqual(
      new Set(['missing', 'duplicate', 'orphaned', 'unresolved']),
    );
    expect(issues.map((issue) => issue.property)).toEqual(
      expect.arrayContaining(['--forge-component-gap', '--forge-component-unused']),
    );
  });

  it('accepts declarations in an imported co-located partial exactly once', () => {
    const issues = validateComponentStylesheet(
      '/fixtures/forge-card/forge-card.module.scss',
      `@use './forge-card-properties'; .component { color: var(--forge-card-color, red); }`,
      new Map([
        [
          '/fixtures/forge-card/_forge-card-properties.scss',
          `@property --forge-card-color { syntax: "*"; inherits: true; initial-value: red; }`,
        ],
      ]),
    );

    expect(issues).toEqual([]);
  });
});
