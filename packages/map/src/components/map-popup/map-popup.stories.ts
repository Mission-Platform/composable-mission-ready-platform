import MapLibre from '../map-libre/map-libre.vue';
import MapMarker from '../map-marker/map-marker.vue';

import MapPopup from './map-popup.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Map/MapPopup',
  component: MapPopup,
  tags: ['autodocs'],
  argTypes: {
    anchor: {
      control: 'select',
      options: ['top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'],
    },
    closeButton: { control: 'boolean' },
    closeOnClick: { control: 'boolean' },
    isText: { control: 'boolean' },
    open: { control: 'boolean' },
  },
  args: {
    lngLat: [2.3522, 48.8566],
    content: '<strong>Paris</strong><br/>The City of Light',
    isText: false,
    open: true,
    closeButton: true,
    closeOnClick: true,
  },
  parameters: {
    docs: {
      description: {
        component: `
**MapPopup** attaches a MapLibre GL JS popup to a geographic position. It must be
placed inside a \`<MapLibre>\` component, from which it receives the map instance
via \`inject\`.

The popup is rendered into the MapLibre canvas overlay — **MapPopup produces no
additional DOM output of its own**.

### Content modes

| Mode | Prop | Behaviour |
|---|---|---|
| HTML | \`is-text="false"\` (default) | \`content\` is inserted as raw HTML — supports rich markup |
| Plain text | \`is-text="true"\` | \`content\` is HTML-escaped before rendering — safe against XSS |

### Usage

\`\`\`vue
<MapLibre map-style="..." :center="[2.35, 48.86]" :zoom="11" style="height: 400px;">
  <MapMarker :lngLat="[2.35, 48.86]" />
  <MapPopup
    :lngLat="[2.35, 48.86]"
    content="<strong>Paris</strong>"
    :open="true"
    :close-button="true"
  />
</MapLibre>
\`\`\`

### Events

| Event | Payload | Description |
|---|---|---|
| \`close\` | — | Fired when the popup is dismissed (close button or click-outside) |
        `.trim(),
      },
    },
  },
  render: (arguments_) => ({
    components: { MapLibre, MapMarker, MapPopup },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <MapLibre
        map-style="https://demotiles.maplibre.org/style.json"
        :center="args.lngLat"
        :zoom="11"
        style="width: 100%; height: 400px;"
      >
        <MapMarker :lngLat="args.lngLat" />
        <MapPopup v-bind="args" />
      </MapLibre>
    `,
  }),
} satisfies Meta<typeof MapPopup>;

export default meta;
type Story = StoryObj<typeof meta>;

/** HTML popup shown next to a marker in Paris. */
export const Default: Story = {};

/** Plain-text popup (XSS-safe — HTML is escaped). */
export const PlainText: Story = {
  args: {
    content: '<script>alert("xss")<\/script> This is safe plain text.',
    isText: true,
  },
};

/** Popup with no close button. */
export const NoCloseButton: Story = {
  args: { closeButton: false },
};

/** Popup that starts closed and can be toggled open. */
export const Closed: Story = {
  args: { open: false },
};
