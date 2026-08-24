import {
  classNames,
  type MpChild,
  type MpElement,
  type MpRenderProperty,
  Slot,
  useEffect,
  useMemo,
  useRef,
  useState,
} from '@mission-platform/forge';

/** Size token — canonical 2xs → 2xl scale. */
export type VirtualListSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** The scope passed to {@link ForgeVirtualList}'s `row` (scoped) slot per rendered row. */
export interface VirtualListItemScope {
  /** The data item for this row. */
  item: unknown;
  /** The item's absolute index in the full `items` array. */
  index: number;
}

export interface VirtualListProperties {
  /** The content the consumer fills the component’s slots with. */
  children?: MpChild | readonly MpChild[];
  /** The full data array. Only the rows in (or near) the viewport are rendered. */
  items: readonly unknown[];
  /** Fixed pixel height of every row — required for the offset maths. */
  itemHeight: number;
  /** Extra rows rendered above/below the viewport. Defaults to `3`. */
  overscan?: number;
  /** Height (px) of the scrollable container. Defaults to `400`. */
  height?: number;
  /** Size token controlling the list's font scale. Defaults to `'md'`. */
  size?: VirtualListSize;
  /** Renders one row; receives `{ item, index }` (a scoped slot / render-prop). */
  row?: MpRenderProperty<VirtualListItemScope>;
}

/**
 * `ForgeVirtualList` — renders only the rows visible within the scroll container,
 * so an arbitrarily long `items` array stays cheap to render. Authored once in
 * the neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`; the scroll position is held with the
 * neutral {@link useState}/{@link useRef}/{@link useMemo}/{@link useEffect}
 * hooks.
 *
 * Each visible row is rendered through the **scoped `row` slot**
 * (`<Slot name="row" item={…} index={…} />`), which the compiler maps to a Vue
 * scoped slot (`slots.row?.({ item, index })`) and a React render-prop
 * (`row?.({ item, index })`) — so the consumer renders rows the same way on
 * either framework. The original Vue SFC was generic over the row type and used
 * a scoped **default** slot; the neutral version uses `unknown` items (cast at
 * the call site) and a named `row` slot (the cross-framework runtime adapters
 * forward named — but not default — slots as scoped functions).
 */
export function ForgeVirtualList(properties: Readonly<VirtualListProperties>): MpElement {
  const { items, itemHeight, overscan = 3, height = 400, size = 'md' } = properties;

  const [scrollTop, setScrollTop] = useState(0);
  const containerReference = useRef<HTMLElement | null>(null);

  const totalHeight = useMemo(() => items.length * itemHeight, [items, itemHeight]);

  const startIndex = useMemo(
    () => Math.max(0, Math.floor(scrollTop / itemHeight) - overscan),
    [scrollTop, itemHeight, overscan],
  );

  const endIndex = useMemo(() => {
    const visibleCount = Math.ceil(height / itemHeight);
    return Math.min(items.length - 1, Math.floor(scrollTop / itemHeight) + visibleCount + overscan);
  }, [scrollTop, itemHeight, height, overscan, items]);

  const offsetY = useMemo(() => startIndex * itemHeight, [startIndex, itemHeight]);

  const visibleItems = useMemo(
    () => items.slice(startIndex, endIndex + 1).map((item, offset) => ({ item, index: startIndex + offset })),
    [items, startIndex, endIndex],
  );

  useEffect(() => {
    const element = containerReference.current;
    if (element === null) {
      return;
    }
    const handleScroll = (event: Event): void => {
      setScrollTop((event.target as HTMLElement).scrollTop);
    };
    element.addEventListener('scroll', handleScroll, { passive: true });
    return () => element.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      ref={containerReference}
      class={classNames('forge-virtual-list', size ? `forge-size--${size}` : undefined)}
      role="list"
      tabindex={0}
      style={{ height: `${height}px`, overflowY: 'auto', position: 'relative' }}
    >
      <div
        aria-hidden="true"
        style={{ height: `${totalHeight}px`, position: 'relative', pointerEvents: 'none' }}
      />
      <div style={{ position: 'absolute', top: `${offsetY}px`, left: '0', right: '0' }}>
        {visibleItems.map(({ item, index }) => (
          <div
            key={index}
            role="listitem"
            style={{ height: `${itemHeight}px`, boxSizing: 'border-box' }}
          >
            <Slot
              name="row"
              item={item}
              index={index}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
