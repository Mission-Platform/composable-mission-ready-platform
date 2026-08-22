import type { ForgeComponentMetadata, ForgeComponentRegistryEntry, ForgePropertyDefinition } from './contracts';

const BUTTON_VARIANTS = [
  'neutral',
  'primary',
  'secondary',
  'tertiary',
  'success',
  'warning',
  'info',
  'error',
  'critical',
  'ghost',
] as const;
const COMMON_STATES = ['default', 'hover', 'active', 'focus-visible', 'disabled'] as const;

function kebabAlias(name: string): string {
  return `forge${name.slice('Forge'.length).replaceAll(/[A-Z]/g, (character) => `-${character.toLowerCase()}`)}`;
}

const property = (
  name: string,
  type: ForgePropertyDefinition['type'],
  values?: readonly string[],
): ForgePropertyDefinition => ({
  name,
  type,
  values,
});

const entry = (
  name: string,
  options: Partial<Omit<ForgeComponentRegistryEntry, 'name'>> & Pick<ForgeComponentRegistryEntry, 'tokenContracts'>,
): ForgeComponentRegistryEntry => ({
  name,
  aliases: [name, kebabAlias(name)],
  importPath: '@mission-platform/components',
  props: [],
  slots: [{ name: 'default', multiple: true }],
  variants: [],
  states: [...COMMON_STATES],
  htmlFallback: 'div',
  classification: 'visual',
  ...options,
});

const entries: readonly ForgeComponentRegistryEntry[] = [
  entry('ForgeButton', {
    tokenContracts: ['component.button.<variant>'],
    props: [
      property('variant', 'enum', BUTTON_VARIANTS),
      property('size', 'enum', ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl']),
      property('padding', 'enum', ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl']),
      property('margin', 'enum', ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl']),
      property('disabled', 'boolean'),
      property('loading', 'boolean'),
    ],
    variants: [...BUTTON_VARIANTS],
    states: [...COMMON_STATES, 'loading'],
    slots: [{ name: 'default', required: true, multiple: true, description: 'Button label or content.' }],
    htmlFallback: 'button',
  }),
  entry('ForgeIconButton', {
    tokenContracts: ['component.button.<variant>', 'component.icon'],
    props: [
      property('label', 'string', []),
      property('variant', 'enum', BUTTON_VARIANTS),
      property('size', 'enum', ['sm', 'md', 'lg']),
      property('disabled', 'boolean'),
      property('loading', 'boolean'),
    ],
    variants: [...BUTTON_VARIANTS],
    states: [...COMMON_STATES, 'loading'],
    slots: [{ name: 'default', required: true, description: 'Icon content.' }],
    htmlFallback: 'button',
  }),
  entry('ForgeBadge', {
    tokenContracts: ['component.feedback'],
    props: [property('variant', 'enum', BUTTON_VARIANTS), property('size', 'enum', ['sm', 'md', 'lg'])],
    variants: [...BUTTON_VARIANTS],
    states: ['default', 'disabled'],
  }),
  entry('ForgeStack', {
    tokenContracts: ['component.layout'],
    props: [
      property('direction', 'enum', ['row', 'column']),
      property('gap', 'number'),
      property('align', 'enum', ['start', 'center', 'end', 'stretch']),
    ],
    slots: [{ name: 'default', required: true, multiple: true }],
    htmlFallback: 'div',
  }),
  entry('ForgeTypography', {
    tokenContracts: ['component.typography'],
    props: [property('as', 'string'), property('variant', 'string'), property('color', 'string')],
    states: ['default', 'link', 'disabled'],
    slots: [{ name: 'default', required: true, multiple: true }],
    htmlFallback: 'p',
  }),
  entry('ForgeAvatar', {
    tokenContracts: ['component.media'],
    props: [
      property('src', 'string'),
      property('initials', 'string'),
      property('size', 'enum'),
      property('shape', 'enum'),
      property('status', 'enum'),
      property('variant', 'enum'),
    ],
    states: ['default', 'disabled'],
  }),
  entry('ForgeResponsiveImage', {
    tokenContracts: ['component.media'],
    props: [property('src', 'string'), property('aspect', 'string'), property('fit', 'enum')],
    states: ['default', 'placeholder'],
    slots: [],
  }),
  entry('ForgeSeparator', {
    tokenContracts: ['component.surface'],
    props: [property('orientation', 'enum', ['horizontal', 'vertical'])],
    states: ['default'],
    slots: [],
  }),
  entry('ForgeSpinner', {
    tokenContracts: ['component.feedback'],
    props: [property('size', 'enum'), property('variant', 'enum')],
    states: ['loading'],
    slots: [],
  }),
  entry('ForgeSkeleton', {
    tokenContracts: ['component.feedback'],
    props: [property('shape', 'enum'), property('size', 'enum')],
    states: ['loading'],
    slots: [],
  }),
  entry('ForgeStatusIcon', {
    tokenContracts: ['component.feedback.<status>'],
    props: [property('status', 'enum'), property('size', 'enum')],
    states: ['default', 'disabled'],
    slots: [],
  }),
  entry('ForgeTag', {
    tokenContracts: ['component.feedback'],
    props: [property('variant', 'enum'), property('size', 'enum'), property('removable', 'boolean')],
    variants: [...BUTTON_VARIANTS],
    states: ['default', 'hover', 'disabled'],
  }),
  entry('ForgeCard', {
    tokenContracts: ['component.surface'],
    props: [property('variant', 'enum'), property('padding', 'enum')],
    variants: ['default', 'outlined', 'elevated'],
    states: ['default', 'hover', 'selected'],
  }),
  entry('ForgeButtonGroup', {
    tokenContracts: ['component.button-group'],
    props: [
      property('orientation', 'enum', ['horizontal', 'vertical']),
      property('attached', 'boolean'),
      property('variant', 'enum'),
      property('gap', 'number'),
    ],
    states: ['default', 'focus-visible', 'disabled'],
  }),
  entry('ForgeGrid', {
    tokenContracts: ['component.layout.grid'],
    props: [property('columns', 'number'), property('gap', 'number'), property('padding', 'enum')],
    states: ['default'],
  }),
  entry('ForgeList', {
    tokenContracts: ['component.surface'],
    props: [property('variant', 'enum'), property('gap', 'number')],
    states: ['default', 'selected'],
  }),
  entry('ForgeMenuItem', {
    tokenContracts: ['component.navigation'],
    props: [property('active', 'boolean'), property('disabled', 'boolean')],
    states: ['default', 'hover', 'focus-visible', 'selected', 'disabled'],
  }),
  entry('ForgeMenu', {
    tokenContracts: ['component.navigation'],
    props: [property('open', 'boolean'), property('orientation', 'enum')],
    states: ['default', 'expanded'],
  }),
  entry('ForgeTabs', {
    tokenContracts: ['component.navigation'],
    props: [property('orientation', 'enum'), property('activeTab', 'string')],
    states: ['default', 'hover', 'focus-visible', 'selected', 'disabled'],
  }),
  entry('ForgeAccordion', {
    tokenContracts: ['component.surface', 'component.navigation'],
    props: [property('items', 'nodes'), property('expanded', 'boolean')],
    states: ['default', 'hover', 'focus-visible', 'expanded', 'disabled'],
  }),
  entry('ForgeAlertBanner', {
    tokenContracts: ['component.feedback', 'component.overlay'],
    props: [property('status', 'enum'), property('dismissible', 'boolean')],
    states: ['default', 'hover', 'focus-visible'],
  }),
  entry('ForgeCollapse', {
    tokenContracts: ['component.collapse'],
    props: [property('open', 'boolean'), property('variant', 'enum'), property('disabled', 'boolean')],
    states: ['default', 'hover', 'focus-visible', 'expanded', 'disabled'],
  }),
  entry('ForgeDropdown', {
    tokenContracts: ['component.overlay', 'component.navigation'],
    props: [property('open', 'boolean'), property('placement', 'enum')],
    states: ['default', 'expanded', 'focus-visible'],
  }),
  entry('ForgePopover', {
    tokenContracts: ['component.overlay'],
    props: [property('open', 'boolean'), property('placement', 'enum')],
    states: ['default', 'expanded', 'focus-visible'],
  }),
  entry('ForgeTooltip', {
    tokenContracts: ['component.overlay'],
    props: [property('open', 'boolean'), property('placement', 'enum')],
    states: ['default', 'expanded'],
  }),
  entry('ForgeToast', {
    tokenContracts: ['component.overlay', 'component.feedback'],
    props: [property('status', 'enum'), property('duration', 'number')],
    states: ['default', 'loading'],
  }),
  entry('ForgeDialog', {
    tokenContracts: ['component.overlay'],
    props: [property('open', 'boolean'), property('title', 'string')],
    states: ['default', 'expanded', 'focus-visible'],
    slots: [{ name: 'default', multiple: true }, { name: 'title' }, { name: 'footer', multiple: true }],
  }),
  entry('ForgeModal', {
    tokenContracts: ['component.overlay'],
    props: [property('open', 'boolean'), property('size', 'enum')],
    states: ['default', 'expanded', 'focus-visible'],
    slots: [
      { name: 'default', multiple: true },
      { name: 'header', multiple: true },
      { name: 'footer', multiple: true },
    ],
  }),
  entry('ForgePagination', {
    tokenContracts: ['component.navigation'],
    props: [property('page', 'number'), property('size', 'number')],
    states: ['default', 'hover', 'focus-visible', 'selected', 'disabled'],
  }),
  entry('ForgeTimeline', {
    tokenContracts: ['component.timeline'],
    props: [property('status', 'enum'), property('orientation', 'enum'), property('outlinedMarker', 'boolean')],
    states: ['default', 'selected'],
  }),
  entry('ForgeCarousel', {
    tokenContracts: ['component.navigation.carousel'],
    props: [
      property('slides', 'nodes'),
      property('controls', 'boolean'),
      property('autoplay', 'boolean'),
      property('tone', 'enum'),
    ],
    states: ['default', 'hover', 'focus-visible', 'selected', 'disabled'],
  }),
  entry('ForgeTable', {
    tokenContracts: ['component.data.table'],
    props: [
      property('columns', 'nodes'),
      property('size', 'enum'),
      property('caption', 'string'),
      property('striped', 'boolean'),
      property('bordered', 'boolean'),
      property('hoverable', 'boolean'),
      property('loading', 'boolean'),
    ],
    states: ['default', 'hover', 'focus-visible', 'loading'],
  }),
  entry('ForgeThemeToggle', {
    tokenContracts: ['component.button', 'component.icon'],
    props: [property('theme', 'enum', ['light', 'dark']), property('size', 'enum')],
    states: ['default', 'hover', 'active', 'selected'],
  }),
  entry('ForgeThemeProvider', {
    tokenContracts: ['component.layout'],
    props: [property('theme', 'enum', ['light', 'dark'])],
    states: ['default', 'light', 'dark'],
  }),
  entry('ForgeInput', {
    tokenContracts: ['component.input', 'component.field'],
    props: [
      property('size', 'enum'),
      property('value', 'string'),
      property('disabled', 'boolean'),
      property('invalid', 'boolean'),
    ],
    states: ['default', 'hover', 'active', 'focus-visible', 'disabled', 'invalid'],
  }),
  entry('ForgeSelect', {
    tokenContracts: ['component.select', 'component.input', 'component.field'],
    props: [
      property('size', 'enum'),
      property('options', 'nodes'),
      property('disabled', 'boolean'),
      property('invalid', 'boolean'),
      property('open', 'boolean'),
    ],
    states: ['default', 'hover', 'focus-visible', 'disabled', 'expanded', 'selected', 'invalid'],
  }),
  entry('ForgeMultiselect', {
    tokenContracts: ['component.select', 'component.input', 'component.field'],
    props: [
      property('size', 'enum'),
      property('options', 'nodes'),
      property('disabled', 'boolean'),
      property('invalid', 'boolean'),
      property('open', 'boolean'),
    ],
    states: ['default', 'hover', 'focus-visible', 'disabled', 'expanded', 'selected', 'invalid'],
  }),
];

export const FORGE_COMPONENT_REGISTRY: readonly ForgeComponentRegistryEntry[] = Object.freeze(entries);

const names = (entry: ForgeComponentRegistryEntry): readonly string[] => [entry.name, ...entry.aliases];

export function findForgeComponent(
  name: string,
  metadata?: ForgeComponentMetadata,
): ForgeComponentRegistryEntry | undefined {
  const candidates = [metadata?.registryName, metadata?.componentName, metadata?.forgeName, name].filter(
    (candidate): candidate is string => candidate !== undefined,
  );
  return FORGE_COMPONENT_REGISTRY.find((component) =>
    candidates.some((candidate) => names(component).includes(candidate)),
  );
}

export function getForgeComponent(name: string): ForgeComponentRegistryEntry {
  const component = findForgeComponent(name);
  if (!component) {
    throw new Error(`Unknown Forge component: ${name}`);
  }
  return component;
}
