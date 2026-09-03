import { describe, expect, it } from 'vitest';

import { computeStats, countWords, EMPTY_EDITOR_STATS, htmlToPlainText } from './text-stats';

describe('htmlToPlainText', () => {
  it('returns an empty string for empty input', () => {
    expect(htmlToPlainText('')).toBe('');
  });

  it('strips inline tags and keeps the text', () => {
    expect(htmlToPlainText('<strong>Hello</strong> <em>world</em>')).toBe('Hello world');
  });

  it('inserts word boundaries between block elements', () => {
    expect(htmlToPlainText('<p>Hello</p><p>world</p>')).toBe('Hello world');
    expect(htmlToPlainText('<ul><li>a</li><li>b</li></ul>')).toBe('a b');
  });

  it('treats <br> as a boundary', () => {
    expect(htmlToPlainText('line one<br>line two')).toBe('line one line two');
  });

  it('decodes common HTML entities', () => {
    expect(htmlToPlainText('Tom &amp; Jerry')).toBe('Tom & Jerry');
    expect(htmlToPlainText('a&nbsp;b')).toBe('a b');
  });

  it('collapses runs of whitespace', () => {
    expect(htmlToPlainText('<p>  spaced   out  </p>')).toBe('spaced out');
  });
});

describe('countWords', () => {
  it('counts zero for blank strings', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   ')).toBe(0);
  });

  it('counts whitespace-delimited words', () => {
    expect(countWords('one two three')).toBe(3);
    expect(countWords('  padded   words here ')).toBe(3);
  });
});

describe('computeStats', () => {
  it('reports empty stats for empty content', () => {
    expect(computeStats('')).toEqual(EMPTY_EDITOR_STATS);
  });

  it('computes words and character counts from HTML', () => {
    const stats = computeStats('<p>Hello <strong>brave</strong> world</p>');
    expect(stats.words).toBe(3);
    expect(stats.characters).toBe('Hello brave world'.length);
    expect(stats.charactersNoSpaces).toBe('Hellobraveworld'.length);
  });
});
