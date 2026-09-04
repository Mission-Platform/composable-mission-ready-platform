/**
 * Stable, self-contained inputs for the Forge compiler benchmark.
 *
 * Keeping the corpus in TypeScript (rather than reading files from the working
 * tree) makes a run independent of checkout paths and filesystem cache state.
 * The source extensions intentionally cover the TSX frontend used by the
 * current compiler while the fixtures exercise the syntax families that the
 * Oxc migration must preserve.
 */

export interface ForgeBenchmarkFixture {
  readonly name: string;
  readonly size: 'small' | 'medium' | 'large';
  readonly fileName: string;
  readonly moduleKind: 'component' | 'composable';
  readonly componentName: string;
  readonly aspects: readonly string[];
  readonly source: string;
}

const SMALL_SOURCE = [
  "import { type MpElement } from '@mission-platform/forge-jsx';",
  '',
  'export interface BadgeProperties {',
  '  label: string;',
  '  tone?: string;',
  '}',
  '',
  'export function ForgeBenchmarkBadge(properties: BadgeProperties): MpElement {',
  "  const tone = properties.tone ?? 'neutral';",
  '  return <span class={`badge badge--${tone}`}>{properties.label}</span>;',
  '}',
].join('\n');

const MEDIUM_SOURCE = [
  "import { type MpChild, type MpElement, useEffect, useMemo, useState } from '@mission-platform/forge-jsx';",
  "import { formatBenchmarkValue as format } from '@/shared/benchmark-format';",
  '',
  'export interface BenchmarkCardProperties {',
  '  title: string;',
  '  values: readonly number[];',
  '  children?: MpChild;',
  '  onChange?: (value: number) => void;',
  '}',
  '',
  'export function ForgeBenchmarkCard(properties: BenchmarkCardProperties): MpElement {',
  '  const [selected, setSelected] = useState(0);',
  '  const [ready, setReady] = useState(false);',
  '  const average = useMemo(() => properties.values.reduce((sum, value) => sum + value, 0) / properties.values.length, [properties.values]);',
  '  useEffect(() => {',
  '    setReady(true);',
  '    return () => setReady(false);',
  '  }, [properties.title]);',
  '  const selectedValue = properties.values[selected] ?? 0;',
  '  return (',
  '    <article class="benchmark-card">',
  '      <header><h2>{properties.title}</h2><span>{ready ? format(selectedValue) : "loading"}</span></header>',
  '      <ul>{properties.values.map((value, index) => <li key={index}><button onClick={() => { setSelected(index); properties.onChange?.(value); }}>{format(value)}</button></li>)}</ul>',
  '      <p data-average={average}>{properties.children}</p>',
  '    </article>',
  '  );',
  '}',
].join('\n');

const LARGE_ROWS = Array.from(
  { length: 32 },
  (_, index) =>
    `        <li className={item.active ? 'row row--active' : 'row'} key={item.id}><span>${index + 1}: {item.label}</span><strong>{format(item.value)}</strong>{item.children}</li>`,
).join('\n');

const LARGE_SOURCE = [
  "import { type MpChild, type MpElement, useEffect, useMemo, useRef, useState } from '@mission-platform/forge-jsx';",
  "import { formatBenchmarkValue as format } from '@/shared/benchmark-format';",
  "import { BenchmarkRow } from './BenchmarkRow';",
  '',
  'type BenchmarkItem = { id: string; label: string; value: number; active: boolean; children?: MpChild };',
  '',
  'export interface BenchmarkDashboardProperties {',
  '  items: readonly BenchmarkItem[];',
  '  query?: string;',
  '  children?: MpChild;',
  '}',
  '',
  'export function ForgeBenchmarkDashboard(properties: BenchmarkDashboardProperties): MpElement {',
  '  const [query, setQuery] = useState(properties.query ?? "");',
  '  const [expanded, setExpanded] = useState<string | undefined>();',
  '  const rootReference = useRef<HTMLElement | null>(null);',
  '  const filtered = useMemo(() => properties.items.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())), [properties.items, query]);',
  '  useEffect(() => {',
  '    rootReference.current?.setAttribute("data-ready", "true");',
  '    return () => rootReference.current?.removeAttribute("data-ready");',
  '  }, [filtered.length]);',
  '  return (',
  '    <section ref={rootReference} class="dashboard">',
  '      <label>Filter <input value={query} onInput={(event) => setQuery(event.currentTarget.value)} /></label>',
  '      <div class="summary"><span>{filtered.length} results</span><span>{format(filtered.reduce((sum, item) => sum + item.value, 0))}</span></div>',
  '      {filtered.length === 0 ? <p class="empty">No results</p> : <ul>',
  '        {filtered.map((item, index) => (',
  '          <li className={item.active ? "row row--active" : "row"} key={item.id}>',
  '            <BenchmarkRow item={item} index={index} expanded={expanded === item.id} onToggle={() => setExpanded(expanded === item.id ? undefined : item.id)} />',
  '            {expanded === item.id && <div class="details">',
  LARGE_ROWS,
  '            </div>}',
  '          </li>',
  '        ))}',
  '      </ul>}',
  '      <footer>{properties.children}</footer>',
  '    </section>',
  '  );',
  '}',
].join('\n');

export const FORGE_BENCHMARK_CORPUS: readonly ForgeBenchmarkFixture[] = [
  {
    name: 'badge-props',
    size: 'small',
    fileName: 'ForgeBenchmarkBadge.tsx',
    moduleKind: 'component',
    componentName: 'ForgeBenchmarkBadge',
    aspects: ['jsx', 'props', 'type-aliases'],
    source: SMALL_SOURCE,
  },
  {
    name: 'card-hooks-slots-aliases',
    size: 'medium',
    fileName: 'ForgeBenchmarkCard.tsx',
    moduleKind: 'component',
    componentName: 'ForgeBenchmarkCard',
    aspects: ['jsx', 'hooks', 'effects', 'props', 'types', 'slots', 'aliases'],
    source: MEDIUM_SOURCE,
  },
  {
    name: 'dashboard-complex-render-tree',
    size: 'large',
    fileName: 'ForgeBenchmarkDashboard.tsx',
    moduleKind: 'component',
    componentName: 'ForgeBenchmarkDashboard',
    aspects: ['jsx', 'hooks', 'effects', 'props', 'types', 'slots', 'aliases', 'complex-render-tree'],
    source: LARGE_SOURCE,
  },
];
