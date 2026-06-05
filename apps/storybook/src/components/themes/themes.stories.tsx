import { BreakpointDebug, HideAt, ShowAt, useBreakpoints } from '@mission-platform/breakpoints';
import {
  BaseAccordion,
  BaseAccordionItem,
  BaseApplicationLayout,
  BaseAvatar,
  BaseBadge,
  BaseBreadcrumb,
  BaseButton,
  BaseCalendar,
  BaseCard,
  BaseCheckbox,
  BaseCodeBlock,
  BaseCollapse,
  BaseDateInput,
  BaseDateRangeInput,
  BaseDateTimeRangeInput,
  BaseDialog,
  BaseFileInput,
  BaseFormBuilder,
  BaseFormWizard,
  BaseInput,
  BaseInView,
  BaseList,
  BaseMarkdownInput,
  BaseMenu,
  BaseMenubar,
  BaseMenuItem,
  BaseModal,
  BaseMonacoEditor,
  BaseMultiselect,
  BaseNavbar,
  BasePopover,
  BaseProgressBar,
  BaseRadio,
  BaseRadioGroup,
  BaseSearchInput,
  BaseSelect,
  BaseSidebar,
  BaseSkeleton,
  BaseSpinner,
  BaseStatusIcon,
  BaseSwitch,
  BaseTable,
  BaseTabs,
  BaseTag,
  BaseTextarea,
  BaseThemeToggle,
  BaseTimeInput,
  BaseTimeRangeInput,
  BaseTooltip,
  BaseTreeView,
  BaseTypography,
  BaseVirtualList,
  BaseVirtualLogViewer,
  BaseVirtualTable,
  BaseVirtualTreeView,
  BaseWindowPopout,
} from '@mission-platform/components';
import {
  IconAlert,
  IconAlignCenter,
  IconAlignJustify,
  IconAlignLeft,
  IconAlignRight,
  IconArrow,
  IconBell,
  IconBlockquote,
  IconBold,
  IconBulletList,
  IconCalendar,
  IconCheck,
  IconChevron,
  IconClose,
  IconCodeBlock,
  IconCodeInline,
  IconCopy,
  IconDebug,
  IconDownload,
  IconDrawCircle,
  IconDrawLine,
  IconDrawPolygon,
  IconDrawSquare,
  IconDrawTriangle,
  IconEdit,
  IconError,
  IconExternalLink,
  IconEye,
  IconEyeOff,
  IconFilter,
  IconGeodesic,
  IconGlobe,
  IconHeading,
  IconHeadingFive,
  IconHeadingFour,
  IconHeadingOne,
  IconHeadingSix,
  IconHeadingThree,
  IconHeadingTwo,
  IconHome,
  IconInfo,
  IconItalic,
  IconJoin,
  IconLock,
  IconLockOpen,
  IconMenu,
  IconMinus,
  IconMove,
  IconNotice,
  IconNumberedList,
  IconPlus,
  IconRefresh,
  IconRotateCCW,
  IconRotateCW,
  IconScaleDown,
  IconScaleUp,
  IconSearch,
  IconSettings,
  IconSort,
  IconSplit,
  IconStar,
  IconTable,
  IconTableColumnAdd,
  IconTableColumnRemove,
  IconTableRowAdd,
  IconTableRowRemove,
  IconTrash,
  IconUpload,
  IconUser,
  IconWarning,
} from '@mission-platform/icons';
import { MapDraw, MapLibre, MapMarker, MapPopup } from '@mission-platform/map';
import { type Component, ref } from 'vue';

import type { DrawMode, DrawnFeature } from '@mission-platform/map';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

import 'maplibre-gl/dist/maplibre-gl.css';

// A self-contained component that renders a full component showcase inside a given theme class
const ThemeShowcase = {
  components: {
    BaseAccordion,
    BaseAccordionItem,
    BaseApplicationLayout,
    BaseAvatar,
    BaseBadge,
    BaseBreadcrumb,
    BaseButton,
    BaseCard,
    BaseCheckbox,
    BaseCollapse,
    BaseDateInput,
    BaseDateRangeInput,
    BaseDateTimeRangeInput,
    BaseDialog,
    BaseFileInput,
    BaseFormWizard,
    BaseInView,
    BaseInput,
    BaseList,
    BaseMarkdownInput,
    BaseMenu,
    BaseMenubar,
    BaseMenuItem,
    BaseModal,
    BaseMultiselect,
    BaseNavbar,
    BasePopover,
    BaseProgressBar,
    BaseRadio,
    BaseRadioGroup,
    BaseSearchInput,
    BaseSelect,
    BaseSidebar,
    BaseSkeleton,
    BaseSpinner,
    BaseStatusIcon,
    BaseSwitch,
    BaseTabs,
    BaseTable,
    BaseTag,
    BaseTextarea,
    BaseTimeInput,
    BaseTimeRangeInput,
    BaseTooltip,
    BaseTypography,
    BaseVirtualList,
    BaseVirtualTable,
    BaseCalendar,
    BaseCodeBlock,
    BaseMonacoEditor,
    BaseTreeView,
    BaseVirtualLogViewer,
    BaseVirtualTreeView,
    BaseWindowPopout,
    BreakpointDebug,
    BaseFormBuilder,
    HideAt,
    MapDraw,
    MapLibre,
    MapMarker,
    MapPopup,
    ShowAt,
    BaseThemeToggle,
    IconAlert,
    IconAlignCenter,
    IconAlignJustify,
    IconAlignLeft,
    IconAlignRight,
    IconArrow,
    IconBell,
    IconBlockquote,
    IconBold,
    IconBulletList,
    IconCalendar,
    IconCheck,
    IconChevron,
    IconClose,
    IconCodeBlock,
    IconCodeInline,
    IconCopy,
    IconDebug,
    IconDownload,
    IconEdit,
    IconError,
    IconExternalLink,
    IconEye,
    IconEyeOff,
    IconFilter,
    IconGlobe,
    IconHeading,
    IconHeadingFive,
    IconHeadingFour,
    IconHeadingOne,
    IconHeadingSix,
    IconHeadingThree,
    IconHeadingTwo,
    IconHome,
    IconInfo,
    IconItalic,
    IconLock,
    IconMenu,
    IconMinus,
    IconNotice,
    IconNumberedList,
    IconPlus,
    IconRefresh,
    IconSearch,
    IconSettings,
    IconStar,
    IconTable,
    IconTableColumnAdd,
    IconTableColumnRemove,
    IconTableRowAdd,
    IconTableRowRemove,
    IconTrash,
    IconUpload,
    IconDrawCircle,
    IconDrawLine,
    IconDrawPolygon,
    IconDrawSquare,
    IconDrawTriangle,
    IconGeodesic,
    IconJoin,
    IconLockOpen,
    IconMove,
    IconRotateCCW,
    IconRotateCW,
    IconScaleDown,
    IconScaleUp,
    IconSort,
    IconSplit,
    IconUser,
    IconWarning,
  },
  setup() {
    const inputValue = ref('');
    const selectValue = ref('');
    const textareaValue = ref('');
    const checkboxValue = ref(true);
    const switchValue = ref(true);
    const radioValue = ref('a');
    const searchValue = ref('');
    const multiselectValue = ref<string[]>([]);
    const dateValue = ref('');
    const timeValue = ref('');
    const dateRangeValue = ref({ start: '', end: '' });
    const timeRangeValue = ref({ start: '', end: '' });
    const dateTimeRangeValue = ref({ start: '', end: '', timezone: 'browser' as const });
    const fileValue = ref<File | undefined>(undefined);
    const markdownValue = ref('');
    const collapseOpen = ref(false);
    const popoverOpen = ref(false);
    const dialogOpen = ref(false);
    const modalOpen = ref(false);
    const tabActive = ref('tab1');
    const sidebarOpen = ref(false);
    const wizardStep = ref(0);
    const formBuilderValues = ref<Record<string, unknown>>({});
    const calendarValue = ref('');
    const monacoValue = ref('// Monaco Editor\nconsole.log("Hello, Mission Platform!")');
    const codeBlockSample = ref(
      'import { MapLibre } from "@mission-platform/map"\n\nconst map = useMap()\nmap.value?.flyTo({ center: [2.35, 48.85], zoom: 12 })',
    );
    const logEntries = Array.from({ length: 50 }, (_, index) => ({
      id: index + 1,
      level: (['debug', 'info', 'warn', 'error', 'fatal'] as const)[index % 5],
      message: `Log message #${index + 1} — sample output from the virtual log viewer`,
      timestamp: new Date(Date.now() - (50 - index) * 2000).toISOString(),
    }));
    const treeNodes = [
      {
        id: 'root-1',
        label: 'Components',
        children: [
          { id: 'child-1', label: 'BaseButton', children: [] },
          { id: 'child-2', label: 'BaseCard', children: [] },
          { id: 'child-3', label: 'BaseTabs', children: [] },
        ],
      },
      {
        id: 'root-2',
        label: 'Composables',
        children: [
          { id: 'child-4', label: 'useBreakpoints', children: [] },
          { id: 'child-5', label: 'useMap', children: [] },
        ],
      },
      {
        id: 'root-3',
        label: 'Utilities',
        children: [
          { id: 'child-6', label: 'breakpoints', children: [] },
          { id: 'child-7', label: 'mediaQuery', children: [] },
        ],
      },
    ];
    const { current: bpCurrent, active: bpActive } = useBreakpoints();

    // ── Map / Draw toolbar state ──────────────────────────────────────────
    const drawMode = ref<DrawMode>(undefined);
    const drawFeatures = ref<DrawnFeature[]>([]);
    const drawSelectedId = ref<string | undefined>(undefined);
    const drawJoiningFromId = ref<string | undefined>(undefined);
    const drawGeodesic = ref(true);
    const mapDrawReference = ref<InstanceType<typeof MapDraw> | undefined>(undefined);

    const drawModes: { label: string; value: DrawMode; icon: unknown }[] = [
      { label: 'None', value: undefined, icon: undefined },
      { label: 'Line', value: 'line', icon: IconDrawLine },
      { label: 'Polygon', value: 'polygon', icon: IconDrawPolygon },
      { label: 'Square', value: 'square', icon: IconDrawSquare },
      { label: 'Circle', value: 'circle', icon: IconDrawCircle },
      { label: 'Triangle', value: 'triangle', icon: IconDrawTriangle },
    ];

    function setDrawMode(m: DrawMode) {
      drawMode.value = m;
    }

    function drawScale(factor: number) {
      mapDrawReference.value?.drawing.scaleSelected(factor);
    }

    function drawRotate(deg: number) {
      mapDrawReference.value?.drawing.rotateSelected(deg);
    }

    function drawDeleteSelected() {
      mapDrawReference.value?.drawing.deleteSelected();
      drawSelectedId.value = undefined;
      drawJoiningFromId.value = undefined;
    }

    function drawSplitSelected() {
      mapDrawReference.value?.drawing.splitSelected();
    }

    function drawStartJoin() {
      if (!drawSelectedId.value) return;
      drawJoiningFromId.value = drawSelectedId.value;
    }

    function onDrawSelect(id: string | undefined) {
      if (drawJoiningFromId.value && id && id !== drawJoiningFromId.value) {
        mapDrawReference.value?.drawing.joinLines(drawJoiningFromId.value, id);
        drawJoiningFromId.value = undefined;
        drawSelectedId.value = mapDrawReference.value?.drawing.selectedId.value;
        return;
      }
      if (id === drawJoiningFromId.value) return;
      drawJoiningFromId.value = undefined;
      drawSelectedId.value = id ?? undefined;
    }

    function drawToggleGeodesic() {
      drawGeodesic.value = !drawGeodesic.value;
    }

    function drawIsLine() {
      const f = drawFeatures.value.find((x) => x.id === drawSelectedId.value);
      return f?.geometry.type === 'LineString';
    }

    const listItems = [
      { id: '1', label: 'First item' },
      { id: '2', label: 'Second item' },
      { id: '3', label: 'Third item' },
    ];

    const breadcrumbItems = [{ label: 'Home', href: '#' }, { label: 'Components', href: '#' }, { label: 'Showcase' }];

    const tabItems = [
      { id: 'tab1', label: 'Tab 1' },
      { id: 'tab2', label: 'Tab 2' },
      { id: 'tab3', label: 'Tab 3' },
    ];

    const showcaseTab = ref('basics');
    const showcaseTabs = [
      { id: 'basics', label: 'Basics' },
      { id: 'forms', label: 'Forms' },
      { id: 'navigation', label: 'Navigation' },
      { id: 'data', label: 'Data' },
      { id: 'overlays', label: 'Overlays' },
      { id: 'icons', label: 'Icons' },
      { id: 'calendar', label: 'Calendar' },
      { id: 'editors', label: 'Editors' },
      { id: 'map', label: 'Map' },
      { id: 'breakpoints', label: 'Breakpoints' },
    ];

    return {
      inputValue,
      selectValue,
      textareaValue,
      checkboxValue,
      switchValue,
      radioValue,
      searchValue,
      multiselectValue,
      dateValue,
      timeValue,
      dateRangeValue,
      timeRangeValue,
      dateTimeRangeValue,
      fileValue,
      markdownValue,
      collapseOpen,
      popoverOpen,
      dialogOpen,
      modalOpen,
      tabActive,
      listItems,
      breadcrumbItems,
      tabItems,
      calendarValue,
      monacoValue,
      logEntries,
      treeNodes,
      bpCurrent,
      bpActive,
      codeBlockSample,
      showcaseTab,
      showcaseTabs,
      sidebarOpen,
      wizardStep,
      formBuilderValues,
      drawMode,
      drawFeatures,
      drawSelectedId,
      drawJoiningFromId,
      drawGeodesic,
      mapDrawRef: mapDrawReference,
      drawModes,
      setDrawMode,
      drawScale,
      drawRotate,
      drawDeleteSelected,
      drawSplitSelected,
      drawStartJoin,
      onDrawSelect,
      drawToggleGeodesic,
      drawIsLine,
    };
  },
  template: `
    <div>
      <BaseApplicationLayout>
        <template #navbar>
          <BaseNavbar brand="Mission Platform" :sticky="true">
            <BaseTypography variant="body-sm" as="a" href="#" color="primary" style="padding: 6px 12px; border-radius: 6px;">Dashboard</BaseTypography>
            <BaseTypography variant="body-sm" as="a" href="#" color="primary" style="padding: 6px 12px; border-radius: 6px;">Components</BaseTypography>
            <BaseTypography variant="body-sm" as="a" href="#" color="primary" style="padding: 6px 12px; border-radius: 6px;">Settings</BaseTypography>
          </BaseNavbar>
        </template>

        <template #content>
          <div style="padding: 2rem;">
            <BaseTabs v-model="showcaseTab" :tabs="showcaseTabs">

              <!-- ── Basics tab ─────────────────────────────────────────── -->
              <template #basics>
                <div style="display: flex; flex-direction: column; gap: 2rem; padding-top: 1.5rem;">

                  <!-- Typography -->
                  <section style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <BaseTypography variant="label" color="secondary">Typography</BaseTypography>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                      <BaseTypography variant="display">Display heading</BaseTypography>
                      <BaseTypography variant="h1">Heading 1</BaseTypography>
                      <BaseTypography variant="h2">Heading 2</BaseTypography>
                      <BaseTypography variant="h3">Heading 3</BaseTypography>
                      <BaseTypography variant="h4">Heading 4</BaseTypography>
                      <BaseTypography variant="body-lg">Body large — The quick brown fox jumps over the lazy dog.</BaseTypography>
                      <BaseTypography variant="body-md">Body medium — The quick brown fox jumps over the lazy dog.</BaseTypography>
                      <BaseTypography variant="body-sm">Body small — The quick brown fox jumps over the lazy dog.</BaseTypography>
                      <BaseTypography variant="body-xs">Body extra-small — The quick brown fox jumps over the lazy dog.</BaseTypography>
                      <BaseTypography variant="label">Label text</BaseTypography>
                      <BaseTypography variant="caption" color="secondary">Caption text</BaseTypography>
                      <BaseTypography variant="code">const x = 42</BaseTypography>
                    </div>
                  </section>

                  <!-- Buttons -->
                  <section style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <BaseTypography variant="label" color="secondary">Buttons</BaseTypography>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;">
                      <BaseButton variant="primary">Primary</BaseButton>
                      <BaseButton variant="secondary">Secondary</BaseButton>
                      <BaseButton variant="ghost">Ghost</BaseButton>
                      <BaseButton variant="danger">Danger</BaseButton>
                      <BaseButton variant="primary" disabled style="--mp-color-primary-default: color-mix(in srgb, var(--mp-color-primary-default) 60%, var(--mp-color-text-primary) 40%);">Disabled</BaseButton>
                      <BaseButton variant="primary" loading>Loading</BaseButton>
                    </div>
                  </section>

                  <!-- Badges -->
                  <section style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <BaseTypography variant="label" color="secondary">Badges</BaseTypography>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;">
                      <BaseBadge variant="neutral">Neutral</BaseBadge>
                      <BaseBadge variant="primary">Primary</BaseBadge>
                      <BaseBadge variant="success">Success</BaseBadge>
                      <BaseBadge variant="warning">Warning</BaseBadge>
                      <BaseBadge variant="danger">Danger</BaseBadge>
                      <BaseBadge variant="info">Info</BaseBadge>
                      <BaseBadge variant="primary" pill>Pill</BaseBadge>
                    </div>
                  </section>

                  <!-- Tags -->
                  <section style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <BaseTypography variant="label" color="secondary">Tags</BaseTypography>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;">
                      <BaseTag variant="neutral" label="Neutral" />
                      <BaseTag variant="primary" label="Primary" />
                      <BaseTag variant="success" label="Success" />
                      <BaseTag variant="warning" label="Warning" />
                      <BaseTag variant="danger" label="Danger" />
                    </div>
                  </section>

                  <!-- Avatar -->
                  <section style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <BaseTypography variant="label" color="secondary">Avatar</BaseTypography>
                    <div style="display: flex; flex-wrap: wrap; gap: 1rem; align-items: center;">
                      <BaseAvatar name="Alice Smith" size="sm" />
                      <BaseAvatar name="Bob Jones" size="md" />
                      <BaseAvatar name="Carol White" size="lg" />
                      <BaseAvatar name="Dan Brown" size="xl" status="online" />
                      <BaseAvatar name="Eve Green" size="xl" status="busy" />
                      <BaseAvatar name="Frank Black" size="xl" status="away" />
                    </div>
                  </section>

                  <!-- Status Icon -->
                  <section style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <BaseTypography variant="label" color="secondary">Status Icon</BaseTypography>
                    <div style="display: flex; flex-wrap: wrap; gap: 1rem; align-items: center;">
                      <BaseStatusIcon level="info" />
                      <BaseStatusIcon level="success" />
                      <BaseStatusIcon level="warning" />
                      <BaseStatusIcon level="error" />
                      <BaseStatusIcon level="critical" />
                    </div>
                  </section>

                  <!-- Card -->
                  <section style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <BaseTypography variant="label" color="secondary">Card</BaseTypography>
                    <BaseCard bordered style="max-width: 360px;">
                      <template #header>
                        <BaseTypography variant="h5">Card Header</BaseTypography>
                      </template>
                      <BaseTypography variant="body-md">This is the card body content demonstrating the theme colours.</BaseTypography>
                      <template #footer>
                        <BaseTypography variant="caption" color="secondary">Card Footer</BaseTypography>
                      </template>
                    </BaseCard>
                  </section>

                  <!-- Progress & Skeleton -->
                  <section style="display: flex; flex-direction: column; gap: 0.75rem; max-width: 360px;">
                    <BaseTypography variant="label" color="secondary">Progress &amp; Skeleton</BaseTypography>
                    <BaseProgressBar :value="65" />
                    <BaseSkeleton style="height: 1rem; border-radius: 4px; background-color: var(--mp-color-bg-muted-contrast, color-mix(in srgb, var(--mp-color-bg-muted) 70%, var(--mp-color-text-primary) 30%));" />
                    <BaseSkeleton style="height: 1rem; width: 75%; border-radius: 4px; background-color: var(--mp-color-bg-muted-contrast, color-mix(in srgb, var(--mp-color-bg-muted) 70%, var(--mp-color-text-primary) 30%));" />
                  </section>

                  <!-- Spinners -->
                  <section style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <BaseTypography variant="label" color="secondary">Spinners</BaseTypography>
                    <div style="display: flex; gap: 1rem; align-items: center;">
                      <BaseSpinner size="sm" />
                      <BaseSpinner size="md" />
                      <BaseSpinner size="lg" />
                    </div>
                  </section>

                  <!-- Theme Toggle -->
                  <section style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <BaseTypography variant="label" color="secondary">Theme Toggle</BaseTypography>
                    <BaseThemeToggle />
                  </section>

                </div>
              </template>

              <!-- ── Forms tab ──────────────────────────────────────────── -->
              <template #forms>
                <div style="display: flex; flex-direction: column; gap: 2rem; padding-top: 1.5rem; color: var(--mp-color-text-primary);">

                  <!-- Form Inputs -->
                  <section style="display: flex; flex-direction: column; gap: 0.75rem; max-width: 360px;">
                    <BaseTypography variant="label" color="secondary">Form Inputs</BaseTypography>
                    <BaseInput
                      id="theme-input"
                      v-model="inputValue"
                      label="Text Input"
                      placeholder="Enter text…"
                      hint="A helpful hint below the field."
                    />
                    <BaseSelect
                      id="theme-select"
                      v-model="selectValue"
                      label="Select"
                      placeholder="Choose an option…"
                      :options="[{ label: 'Option A', value: 'a' }, { label: 'Option B', value: 'b' }]"
                    />
                    <BaseTextarea
                      id="theme-textarea"
                      v-model="textareaValue"
                      label="Textarea"
                      placeholder="Enter a longer message…"
                    />
                    <BaseCheckbox id="theme-checkbox" v-model="checkboxValue" :label="'Checkbox (checked)'" />
                    <BaseSwitch id="theme-switch" v-model="switchValue" label="Toggle switch (on)" />
                    <BaseRadioGroup
                      id="theme-radio"
                      v-model="radioValue"
                      label="Radio Group"
                      :options="[{ label: 'Option A', value: 'a' }, { label: 'Option B', value: 'b' }]"
                    />
                    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                      <BaseTypography variant="body-sm" color="secondary">Individual Radio</BaseTypography>
                      <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                        <BaseRadio v-model="radioValue" value="a" label="Radio A" />
                        <BaseRadio v-model="radioValue" value="b" label="Radio B" />
                      </div>
                    </div>
                  </section>

                  <!-- Search & Multiselect -->
                  <section style="display: flex; flex-direction: column; gap: 0.75rem; max-width: 360px;">
                    <BaseTypography variant="label" color="secondary">Search &amp; Multiselect</BaseTypography>
                    <BaseSearchInput
                      id="theme-search"
                      v-model="searchValue"
                      placeholder="Search…"
                    />
                    <BaseMultiselect
                      id="theme-multiselect"
                      v-model="multiselectValue"
                      label="Multiselect"
                      placeholder="Pick one or more…"
                      :options="[{ label: 'Alpha', value: 'a' }, { label: 'Bravo', value: 'b' }, { label: 'Charlie', value: 'c' }]"
                    />
                  </section>

                  <!-- Date & Time -->
                  <section style="display: flex; flex-direction: column; gap: 0.75rem; max-width: 360px;">
                    <BaseTypography variant="label" color="secondary">Date &amp; Time</BaseTypography>
                    <BaseDateInput
                      id="theme-date"
                      v-model="dateValue"
                      label="Date"
                      placeholder="YYYY-MM-DD"
                    />
                    <BaseTimeInput
                      id="theme-time"
                      v-model="timeValue"
                      label="Time"
                    />
                    <BaseDateRangeInput
                      id="theme-date-range"
                      v-model="dateRangeValue"
                      label="Date Range"
                    />
                    <BaseTimeRangeInput
                      id="theme-time-range"
                      v-model="timeRangeValue"
                      label="Time Range"
                    />
                    <BaseDateTimeRangeInput
                      id="theme-datetime-range"
                      v-model="dateTimeRangeValue"
                      label="Date &amp; Time Range"
                    />
                  </section>

                  <!-- File & Markdown -->
                  <section style="display: flex; flex-direction: column; gap: 0.75rem; max-width: 360px;">
                    <BaseTypography variant="label" color="secondary">File &amp; Markdown</BaseTypography>
                    <BaseFileInput
                      id="theme-file"
                      v-model="fileValue"
                      label="File Upload"
                      hint="Drag &amp; drop or click to browse."
                      drag-drop
                    />
                    <BaseMarkdownInput
                      id="theme-markdown"
                      v-model="markdownValue"
                      label="Markdown"
                      placeholder="Write **markdown** here…"
                      :rows="4"
                    />
                  </section>

                  <!-- Form Wizard -->
                  <section style="display: flex; flex-direction: column; gap: 0.75rem; max-width: 540px;">
                    <BaseTypography variant="label" color="secondary">Form Wizard</BaseTypography>
                    <BaseFormWizard
                      v-model="wizardStep"
                      style="color: var(--mp-color-text-primary); --mp-color-primary-text: var(--mp-color-text-primary); --mp-color-border-default: var(--mp-color-text-primary);"
                      :steps="[
                        { id: 'step-1', title: 'Account', description: 'Set up your account credentials' },
                        { id: 'step-2', title: 'Profile', description: 'Enter your personal details' },
                        { id: 'step-3', title: 'Review', description: 'Confirm your information' },
                      ]"
                    >
                      <template #step-1>
                        <BaseTypography variant="body-md">Step 1: Enter your email and password.</BaseTypography>
                      </template>
                      <template #step-2>
                        <BaseTypography variant="body-md">Step 2: Fill in your name and bio.</BaseTypography>
                      </template>
                      <template #step-3>
                        <BaseTypography variant="body-md">Step 3: Review and submit.</BaseTypography>
                      </template>
                    </BaseFormWizard>
                  </section>

                  <!-- Form Builder -->
                  <section style="display: flex; flex-direction: column; gap: 0.75rem; max-width: 480px;">
                    <BaseTypography variant="label" color="secondary">Form Builder</BaseTypography>
                    <BaseFormBuilder
                      v-model="formBuilderValues"
                      :schema="{
                        fields: [
                          { key: 'name', type: 'text', label: 'Full Name', placeholder: 'Jane Doe', required: true },
                          { key: 'email', type: 'email', label: 'Email', placeholder: 'jane@example.com' },
                          { key: 'role', type: 'select', label: 'Role', options: [{ label: 'Admin', value: 'admin' }, { label: 'Editor', value: 'editor' }] },
                          { key: 'bio', type: 'textarea', label: 'Bio', placeholder: 'Tell us about yourself…', rows: 3 },
                          { key: 'notify', type: 'switch', label: 'Email notifications' },
                          { key: 'agree', type: 'checkbox', label: 'I agree to the terms' },
                        ]
                      }"
                    />
                  </section>

                </div>
              </template>

              <!-- ── Navigation tab ─────────────────────────────────────── -->
              <template #navigation>
                <div style="display: flex; flex-direction: column; gap: 2rem; padding-top: 1.5rem; color: var(--mp-color-text-primary);">

                  <!-- Breadcrumb -->
                  <section style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <BaseTypography variant="label" color="secondary">Breadcrumb</BaseTypography>
                    <BaseBreadcrumb :items="breadcrumbItems" />
                  </section>

                  <!-- Tabs -->
                  <section style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <BaseTypography variant="label" color="secondary">Tabs</BaseTypography>
                    <BaseTabs v-model="tabActive" :tabs="tabItems">
                      <template #tab1>
                        <BaseTypography variant="body-md">Content for Tab 1</BaseTypography>
                      </template>
                      <template #tab2>
                        <BaseTypography variant="body-md">Content for Tab 2</BaseTypography>
                      </template>
                      <template #tab3>
                        <BaseTypography variant="body-md">Content for Tab 3</BaseTypography>
                      </template>
                    </BaseTabs>
                  </section>

                  <!-- Accordion -->
                  <section style="display: flex; flex-direction: column; gap: 0.75rem; max-width: 480px;">
                    <BaseTypography variant="label" color="secondary">Accordion</BaseTypography>
                    <BaseAccordion>
                      <BaseAccordionItem id="acc-one">
                        <template #summary>Section One</template>
                        <BaseTypography variant="body-md">Content for the first accordion section.</BaseTypography>
                      </BaseAccordionItem>
                      <BaseAccordionItem id="acc-two">
                        <template #summary>Section Two</template>
                        <BaseTypography variant="body-md">Content for the second accordion section.</BaseTypography>
                      </BaseAccordionItem>
                      <BaseAccordionItem id="acc-three" disabled>
                        <template #summary>Section Three</template>
                        <BaseTypography variant="body-md">Disabled section content.</BaseTypography>
                      </BaseAccordionItem>
                    </BaseAccordion>
                  </section>

                  <!-- Collapse -->
                  <section style="display: flex; flex-direction: column; gap: 0.75rem; max-width: 480px;">
                    <BaseTypography variant="label" color="secondary">Collapse</BaseTypography>
                    <BaseButton variant="secondary" @click="collapseOpen = !collapseOpen">
                      {{ collapseOpen ? 'Collapse' : 'Expand' }}
                    </BaseButton>
                    <BaseCollapse :open="collapseOpen">
                      <BaseCard bordered>
                        <BaseTypography variant="body-md">Collapsible panel content.</BaseTypography>
                      </BaseCard>
                    </BaseCollapse>
                  </section>

                  <!-- List -->
                  <section style="display: flex; flex-direction: column; gap: 0.75rem; max-width: 360px;">
                    <BaseTypography variant="label" color="secondary">List</BaseTypography>
                    <BaseList :items="listItems" />
                  </section>

                  <!-- Menubar -->
                  <section style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <BaseTypography variant="label" color="secondary">Menubar</BaseTypography>
                    <BaseMenubar bordered label="Main menu">
                      <BaseMenuItem>File</BaseMenuItem>
                      <BaseMenuItem>Edit</BaseMenuItem>
                      <BaseMenuItem>View</BaseMenuItem>
                      <BaseMenuItem variant="danger">Danger action</BaseMenuItem>
                    </BaseMenubar>
                  </section>

                  <!-- Sidebar -->
                  <section style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <BaseTypography variant="label" color="secondary">Sidebar</BaseTypography>
                    <BaseButton variant="secondary" @click="sidebarOpen = true">Open Sidebar</BaseButton>
                    <BaseSidebar :open="sidebarOpen" title="Navigation" side="left" @close="sidebarOpen = false">
                      <div style="padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
                        <BaseTypography variant="body-md">Dashboard</BaseTypography>
                        <BaseTypography variant="body-md">Components</BaseTypography>
                        <BaseTypography variant="body-md">Settings</BaseTypography>
                      </div>
                    </BaseSidebar>
                  </section>

                </div>
              </template>

              <!-- ── Data tab ───────────────────────────────────────────── -->
              <template #data>
                <div style="display: flex; flex-direction: column; gap: 2rem; padding-top: 1.5rem;">

                  <!-- Table -->
                  <section style="display: flex; flex-direction: column; gap: 0.75rem; color: var(--mp-color-text-primary);">
                    <BaseTypography variant="label" color="secondary">Table</BaseTypography>
                    <BaseTable
                      :columns="[{ key: 'name', label: 'Name', sortable: true }, { key: 'role', label: 'Role' }, { key: 'status', label: 'Status' }]"
                      :rows="[{ name: 'Alice Smith', role: 'Admin', status: 'Active' }, { name: 'Bob Jones', role: 'Editor', status: 'Inactive' }, { name: 'Carol White', role: 'Viewer', status: 'Active' }]"
                      bordered
                      hoverable
                      caption="Team members"
                    />
                  </section>

                  <!-- Virtual List -->
                  <section style="display: flex; flex-direction: column; gap: 0.75rem; color: var(--mp-color-text-primary);">
                    <BaseTypography variant="label" color="secondary">Virtual List</BaseTypography>
                    <BaseVirtualList
                      :items="Array.from({ length: 100 }, (_, i) => ({ id: i + 1, label: 'Item ' + (i + 1) }))"
                      :item-height="40"
                      :height="200"
                    >
                      <template #default="{ item }">
                        <div style="padding: 0 1rem; display: flex; align-items: center; height: 40px; border-bottom: 1px solid var(--mp-color-border-default);">
                          <BaseTypography variant="body-sm">{{ item.label }}</BaseTypography>
                        </div>
                      </template>
                    </BaseVirtualList>
                  </section>

                  <!-- Virtual Table -->
                  <section style="display: flex; flex-direction: column; gap: 0.75rem; color: var(--mp-color-text-primary);">
                    <BaseTypography variant="label" color="secondary">Virtual Table</BaseTypography>
                    <BaseVirtualTable
                      :columns="[{ key: 'id', label: '#', width: '60px' }, { key: 'name', label: 'Name', sortable: true }, { key: 'value', label: 'Value', align: 'right' }]"
                      :rows="Array.from({ length: 200 }, (_, i) => ({ id: i + 1, name: 'Row ' + (i + 1), value: (i + 1) * 10 }))"
                      :height="240"
                      striped
                      caption="Large virtual dataset"
                    />
                  </section>

                  <!-- Tree View -->
                  <section style="display: flex; flex-direction: column; gap: 0.75rem; color: var(--mp-color-text-primary);">
                    <BaseTypography variant="label" color="secondary">Tree View</BaseTypography>
                    <BaseTreeView :nodes="treeNodes" :default-open="true" />
                  </section>

                  <!-- Virtual Tree View -->
                  <section style="display: flex; flex-direction: column; gap: 0.75rem; color: var(--mp-color-text-primary);">
                    <BaseTypography variant="label" color="secondary">Virtual Tree View</BaseTypography>
                    <BaseVirtualTreeView :nodes="treeNodes" :height="200" :default-open="true" />
                  </section>

                  <!-- Virtual Log Viewer -->
                  <section style="display: flex; flex-direction: column; gap: 0.75rem; color: var(--mp-color-text-primary);">
                    <BaseTypography variant="label" color="secondary">Virtual Log Viewer</BaseTypography>
                    <BaseVirtualLogViewer :entries="logEntries" :height="240" />
                  </section>

                </div>
              </template>

              <!-- ── Overlays tab ───────────────────────────────────────── -->
              <template #overlays>
                <div style="display: flex; flex-direction: column; gap: 2rem; padding-top: 1.5rem;">

                  <!-- Tooltip -->
                  <section style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <BaseTypography variant="label" color="secondary">Tooltip</BaseTypography>
                    <div style="display: flex; gap: 1rem;">
                      <BaseTooltip content="This is a tooltip">
                        <BaseButton variant="secondary">Hover me</BaseButton>
                      </BaseTooltip>
                      <BaseTooltip content="Tooltip on the right" placement="right">
                        <BaseButton variant="ghost">Right</BaseButton>
                      </BaseTooltip>
                    </div>
                  </section>

                  <!-- Popover -->
                  <section style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <BaseTypography variant="label" color="secondary">Popover</BaseTypography>
                    <BasePopover v-model:open="popoverOpen" placement="bottom-start">
                      <template #trigger>
                        <BaseButton variant="secondary" @click="popoverOpen = !popoverOpen">Open Popover</BaseButton>
                      </template>
                      <BaseCard style="min-width: 200px;">
                        <BaseTypography variant="body-sm">Popover content goes here.</BaseTypography>
                      </BaseCard>
                    </BasePopover>
                  </section>

                  <!-- Menu -->
                  <section style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <BaseTypography variant="label" color="secondary">Menu</BaseTypography>
                    <BaseMenu :items="[
                      { label: 'Edit' },
                      { label: 'Duplicate' },
                      { label: 'Delete' },
                    ]" />
                  </section>

                  <!-- Dialog -->
                  <section style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <BaseTypography variant="label" color="secondary">Dialog</BaseTypography>
                    <BaseButton variant="secondary" @click="dialogOpen = true">Open Dialog</BaseButton>
                    <BaseDialog :open="dialogOpen" title="Confirm action" @close="dialogOpen = false">
                      <BaseTypography variant="body-md">Are you sure you want to proceed with this action?</BaseTypography>
                      <template #footer>
                        <BaseButton variant="ghost" @click="dialogOpen = false">Cancel</BaseButton>
                        <BaseButton variant="primary" @click="dialogOpen = false">Confirm</BaseButton>
                      </template>
                    </BaseDialog>
                  </section>

                  <!-- Modal -->
                  <section style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <BaseTypography variant="label" color="secondary">Modal</BaseTypography>
                    <BaseButton variant="secondary" @click="modalOpen = true">Open Modal</BaseButton>
                    <BaseModal :open="modalOpen" title="Modal title" @close="modalOpen = false">
                      <BaseTypography variant="body-md">Modal body content. Modals are larger than dialogs and support richer content.</BaseTypography>
                      <template #footer>
                        <BaseButton variant="ghost" @click="modalOpen = false">Close</BaseButton>
                        <BaseButton variant="primary" @click="modalOpen = false">Save</BaseButton>
                      </template>
                    </BaseModal>
                  </section>

                  <!-- In View -->
                  <section style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <BaseTypography variant="label" color="secondary">In View (fade animation)</BaseTypography>
                    <BaseInView animation="fade" :once="false">
                      <BaseCard bordered style="max-width: 360px;">
                        <BaseTypography variant="body-md">This card fades in when it enters the viewport.</BaseTypography>
                      </BaseCard>
                    </BaseInView>
                    <BaseInView animation="slide-up" :once="false">
                      <BaseCard bordered style="max-width: 360px;">
                        <BaseTypography variant="body-md">This card slides up when it enters the viewport.</BaseTypography>
                      </BaseCard>
                    </BaseInView>
                  </section>

                  <!-- Window Popout -->
                  <section style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <BaseTypography variant="label" color="secondary">Window Popout</BaseTypography>
                    <BaseWindowPopout title="Mission Platform Popout">
                      <BaseCard bordered style="max-width: 360px;">
                        <BaseTypography variant="body-md">This content can be popped out into a separate browser window.</BaseTypography>
                      </BaseCard>
                    </BaseWindowPopout>
                  </section>

                </div>
              </template>

              <!-- ── Icons tab ──────────────────────────────────────────── -->
              <template #icons>
                <div style="display: flex; flex-direction: column; gap: 2rem; padding-top: 1.5rem;">

                  <section style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <BaseTypography variant="label" color="secondary">Navigation &amp; Controls</BaseTypography>
                    <div style="display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; color: var(--mp-color-text-primary);">
                      <BaseTooltip content="IconChevron"><IconChevron /></BaseTooltip>
                      <BaseTooltip content="IconArrow"><IconArrow /></BaseTooltip>
                      <BaseTooltip content="IconClose"><IconClose /></BaseTooltip>
                      <BaseTooltip content="IconSearch"><IconSearch /></BaseTooltip>
                      <BaseTooltip content="IconMenu"><IconMenu /></BaseTooltip>
                      <BaseTooltip content="IconFilter"><IconFilter /></BaseTooltip>
                    </div>
                  </section>

                  <section style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <BaseTypography variant="label" color="secondary">State &amp; Status</BaseTypography>
                    <div style="display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; color: var(--mp-color-text-primary);">
                      <BaseTooltip content="IconCheck"><IconCheck /></BaseTooltip>
                      <BaseTooltip content="IconInfo"><IconInfo /></BaseTooltip>
                      <BaseTooltip content="IconWarning"><IconWarning /></BaseTooltip>
                      <BaseTooltip content="IconError"><IconError /></BaseTooltip>
                      <BaseTooltip content="IconAlert"><IconAlert /></BaseTooltip>
                      <BaseTooltip content="IconNotice"><IconNotice /></BaseTooltip>
                      <BaseTooltip content="IconDebug"><IconDebug /></BaseTooltip>
                    </div>
                  </section>

                  <section style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <BaseTypography variant="label" color="secondary">Text Alignment</BaseTypography>
                    <div style="display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; color: var(--mp-color-text-primary);">
                      <BaseTooltip content="IconAlignLeft"><IconAlignLeft /></BaseTooltip>
                      <BaseTooltip content="IconAlignCenter"><IconAlignCenter /></BaseTooltip>
                      <BaseTooltip content="IconAlignRight"><IconAlignRight /></BaseTooltip>
                      <BaseTooltip content="IconAlignJustify"><IconAlignJustify /></BaseTooltip>
                    </div>
                  </section>

                  <section style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <BaseTypography variant="label" color="secondary">Navigation &amp; Links</BaseTypography>
                    <div style="display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; color: var(--mp-color-text-primary);">
                      <BaseTooltip content="IconExternalLink"><IconExternalLink /></BaseTooltip>
                      <BaseTooltip content="IconGlobe"><IconGlobe /></BaseTooltip>
                      <BaseTooltip content="IconHome"><IconHome /></BaseTooltip>
                    </div>
                  </section>

                  <section style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <BaseTypography variant="label" color="secondary">Math &amp; Quantity</BaseTypography>
                    <div style="display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; color: var(--mp-color-text-primary);">
                      <BaseTooltip content="IconPlus"><IconPlus /></BaseTooltip>
                      <BaseTooltip content="IconMinus"><IconMinus /></BaseTooltip>
                    </div>
                  </section>

                  <section style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <BaseTypography variant="label" color="secondary">Visibility</BaseTypography>
                    <div style="display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; color: var(--mp-color-text-primary);">
                      <BaseTooltip content="IconEye"><IconEye /></BaseTooltip>
                      <BaseTooltip content="IconEyeOff"><IconEyeOff /></BaseTooltip>
                    </div>
                  </section>

                  <section style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <BaseTypography variant="label" color="secondary">Actions</BaseTypography>
                    <div style="display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; color: var(--mp-color-text-primary);">
                      <BaseTooltip content="IconEdit"><IconEdit /></BaseTooltip>
                      <BaseTooltip content="IconTrash"><IconTrash /></BaseTooltip>
                      <BaseTooltip content="IconDownload"><IconDownload /></BaseTooltip>
                      <BaseTooltip content="IconUpload"><IconUpload /></BaseTooltip>
                      <BaseTooltip content="IconCopy"><IconCopy /></BaseTooltip>
                      <BaseTooltip content="IconRefresh"><IconRefresh /></BaseTooltip>
                    </div>
                  </section>

                  <section style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <BaseTypography variant="label" color="secondary">General UI</BaseTypography>
                    <div style="display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; color: var(--mp-color-text-primary);">
                      <BaseTooltip content="IconStar"><IconStar /></BaseTooltip>
                      <BaseTooltip content="IconUser"><IconUser /></BaseTooltip>
                      <BaseTooltip content="IconLock"><IconLock /></BaseTooltip>
                      <BaseTooltip content="IconSettings"><IconSettings /></BaseTooltip>
                      <BaseTooltip content="IconBell"><IconBell /></BaseTooltip>
                      <BaseTooltip content="IconCalendar"><IconCalendar /></BaseTooltip>
                    </div>
                  </section>

                  <section style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <BaseTypography variant="label" color="secondary">Sorting &amp; Misc</BaseTypography>
                    <div style="display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; color: var(--mp-color-text-primary);">
                      <BaseTooltip content="IconSort"><IconSort /></BaseTooltip>
                      <BaseTooltip content="IconLockOpen"><IconLockOpen /></BaseTooltip>
                    </div>
                  </section>

                  <section style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <BaseTypography variant="label" color="secondary">Map &amp; Drawing</BaseTypography>
                    <div style="display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; color: var(--mp-color-text-primary);">
                      <BaseTooltip content="IconDrawLine"><IconDrawLine /></BaseTooltip>
                      <BaseTooltip content="IconDrawPolygon"><IconDrawPolygon /></BaseTooltip>
                      <BaseTooltip content="IconDrawSquare"><IconDrawSquare /></BaseTooltip>
                      <BaseTooltip content="IconDrawCircle"><IconDrawCircle /></BaseTooltip>
                      <BaseTooltip content="IconDrawTriangle"><IconDrawTriangle /></BaseTooltip>
                      <BaseTooltip content="IconScaleUp"><IconScaleUp /></BaseTooltip>
                      <BaseTooltip content="IconScaleDown"><IconScaleDown /></BaseTooltip>
                      <BaseTooltip content="IconRotateCW"><IconRotateCW /></BaseTooltip>
                      <BaseTooltip content="IconRotateCCW"><IconRotateCCW /></BaseTooltip>
                      <BaseTooltip content="IconSplit"><IconSplit /></BaseTooltip>
                      <BaseTooltip content="IconJoin"><IconJoin /></BaseTooltip>
                      <BaseTooltip content="IconMove"><IconMove /></BaseTooltip>
                      <BaseTooltip content="IconGeodesic"><IconGeodesic /></BaseTooltip>
                    </div>
                  </section>

                  <section style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <BaseTypography variant="label" color="secondary">Rich Text &amp; Editor</BaseTypography>
                    <div style="display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; color: var(--mp-color-text-primary);">
                      <BaseTooltip content="IconBold"><IconBold /></BaseTooltip>
                      <BaseTooltip content="IconItalic"><IconItalic /></BaseTooltip>
                      <BaseTooltip content="IconHeading"><IconHeading /></BaseTooltip>
                      <BaseTooltip content="IconHeadingOne"><IconHeadingOne /></BaseTooltip>
                      <BaseTooltip content="IconHeadingTwo"><IconHeadingTwo /></BaseTooltip>
                      <BaseTooltip content="IconHeadingThree"><IconHeadingThree /></BaseTooltip>
                      <BaseTooltip content="IconHeadingFour"><IconHeadingFour /></BaseTooltip>
                      <BaseTooltip content="IconHeadingFive"><IconHeadingFive /></BaseTooltip>
                      <BaseTooltip content="IconHeadingSix"><IconHeadingSix /></BaseTooltip>
                      <BaseTooltip content="IconCodeInline"><IconCodeInline /></BaseTooltip>
                      <BaseTooltip content="IconCodeBlock"><IconCodeBlock /></BaseTooltip>
                      <BaseTooltip content="IconTable"><IconTable /></BaseTooltip>
                      <BaseTooltip content="IconTableColumnAdd"><IconTableColumnAdd /></BaseTooltip>
                      <BaseTooltip content="IconTableColumnRemove"><IconTableColumnRemove /></BaseTooltip>
                      <BaseTooltip content="IconTableRowAdd"><IconTableRowAdd /></BaseTooltip>
                      <BaseTooltip content="IconTableRowRemove"><IconTableRowRemove /></BaseTooltip>
                      <BaseTooltip content="IconBulletList"><IconBulletList /></BaseTooltip>
                      <BaseTooltip content="IconNumberedList"><IconNumberedList /></BaseTooltip>
                      <BaseTooltip content="IconBlockquote"><IconBlockquote /></BaseTooltip>
                    </div>
                  </section>

                </div>
              </template>

              <!-- ── Calendar tab ─────────────────────────────────────── -->
              <template #calendar>
                <div style="display: flex; flex-direction: column; gap: 2rem; padding-top: 1.5rem; color: var(--mp-color-text-primary);">

                  <section style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <BaseTypography variant="label" color="secondary">Calendar</BaseTypography>
                    <BaseCalendar v-model="calendarValue" />
                  </section>

                </div>
              </template>

              <!-- ── Editors tab ─────────────────────────────────────────── -->
              <template #editors>
                <div style="display: flex; flex-direction: column; gap: 2rem; padding-top: 1.5rem; color: var(--mp-color-text-primary);">

                  <!-- Code Block -->
                  <section style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <BaseTypography variant="label" color="secondary">Code Block</BaseTypography>
                    <BaseCodeBlock language="typescript" :code="codeBlockSample" />
                  </section>

                  <!-- Monaco Editor -->
                  <section style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <BaseTypography variant="label" color="secondary">Monaco Editor</BaseTypography>
                    <BaseMonacoEditor
                      v-model="monacoValue"
                      language="javascript"
                      height="180"
                    />
                  </section>

                </div>
              </template>

              <!-- ── Map tab ───────────────────────────────────────────── -->
              <template #map>
                <div style="display: flex; flex-direction: column; gap: 2rem; padding-top: 1.5rem; color: var(--mp-color-text-primary);">

                  <!-- MapLibre with Marker & Popup -->
                  <section style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <BaseTypography variant="label" color="secondary">Map — MapLibre (marker &amp; popup)</BaseTypography>
                    <div style="height: 360px; border-radius: 8px; overflow: hidden; border: 1px solid var(--mp-color-border-default);">
                      <MapLibre
                        map-style="https://demotiles.maplibre.org/style.json"
                        :center="[2.35, 48.85]"
                        :zoom="10"
                        style="width: 100%; height: 100%;"
                      >
                        <MapMarker :lng-lat="[2.35, 48.85]" color="#e84545">
                          <template #default>
                            <div style="background: var(--mp-color-bg-surface); border: 1px solid var(--mp-color-border-default); border-radius: 6px; padding: 0.5rem 0.75rem;">
                              <BaseTypography variant="body-sm">Paris, France</BaseTypography>
                            </div>
                          </template>
                        </MapMarker>
                        <MapPopup :lng-lat="[2.35, 48.85]" :offset="30">
                          <BaseTypography variant="caption">Lat 48.85 · Lng 2.35</BaseTypography>
                        </MapPopup>
                      </MapLibre>
                    </div>
                  </section>

                  <!-- MapDraw -->
                  <section style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <BaseTypography variant="label" color="secondary">Map — MapDraw (drawing toolbar)</BaseTypography>
                    <div style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
                      <span style="font-size: 12px; font-weight: 600; color: var(--mp-color-text-primary);">Draw:</span>
                      <BaseTooltip
                        v-for="m in drawModes"
                        :key="String(m.value)"
                        :content="m.label"
                        placement="bottom"
                      >
                        <BaseButton
                          :variant="drawMode === m.value ? 'primary' : 'secondary'"
                          size="sm"
                          @click="setDrawMode(m.value)"
                        >
                          <component :is="m.icon" v-if="m.icon" :size="16" :aria-label="m.label" />
                          <span v-else>{{ m.label }}</span>
                        </BaseButton>
                      </BaseTooltip>
                    </div>
                    <div style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
                      <span style="font-size: 12px; font-weight: 600; color: var(--mp-color-text-primary);">Edit:</span>
                      <span
                        style="font-size: 12px; align-self: center;"
                        :style="{ color: drawJoiningFromId ? '#f59e0b' : 'var(--mp-color-text-secondary)' }"
                      >
                        {{ drawJoiningFromId ? '⚡ Click another line to join' : (drawSelectedId ? 'Selected: ' + drawSelectedId : 'Click a shape to select') }}
                      </span>
                      <BaseTooltip content="Scale Up ×1.5" placement="bottom">
                        <BaseButton variant="secondary" size="sm" :disabled="!drawSelectedId" @click="drawScale(1.5)">
                          <IconScaleUp :size="16" aria-label="Scale Up" />
                        </BaseButton>
                      </BaseTooltip>
                      <BaseTooltip content="Scale Down ×0.75" placement="bottom">
                        <BaseButton variant="secondary" size="sm" :disabled="!drawSelectedId" @click="drawScale(0.75)">
                          <IconScaleDown :size="16" aria-label="Scale Down" />
                        </BaseButton>
                      </BaseTooltip>
                      <BaseTooltip content="Rotate +45°" placement="bottom">
                        <BaseButton variant="secondary" size="sm" :disabled="!drawSelectedId" @click="drawRotate(45)">
                          <IconRotateCW :size="16" aria-label="Rotate Clockwise" />
                        </BaseButton>
                      </BaseTooltip>
                      <BaseTooltip content="Rotate −45°" placement="bottom">
                        <BaseButton variant="secondary" size="sm" :disabled="!drawSelectedId" @click="drawRotate(-45)">
                          <IconRotateCCW :size="16" aria-label="Rotate Counter-Clockwise" />
                        </BaseButton>
                      </BaseTooltip>
                      <BaseTooltip content="Split line at midpoint" placement="bottom">
                        <BaseButton variant="secondary" size="sm" :disabled="!(drawSelectedId && drawIsLine())" @click="drawSplitSelected()">
                          <IconSplit :size="16" aria-label="Split Line" />
                        </BaseButton>
                      </BaseTooltip>
                      <BaseTooltip
                        :content="drawJoiningFromId ? 'Joining — select another line to complete' : 'Join two lines at nearest endpoints'"
                        placement="bottom"
                      >
                        <BaseButton
                          :variant="drawJoiningFromId ? 'primary' : 'secondary'"
                          size="sm"
                          :disabled="!(drawSelectedId && drawIsLine())"
                          @click="drawStartJoin()"
                        >
                          <IconJoin :size="16" aria-label="Join Lines" />
                        </BaseButton>
                      </BaseTooltip>
                      <BaseTooltip content="Delete selected feature" placement="bottom">
                        <BaseButton variant="danger" size="sm" :disabled="!drawSelectedId" @click="drawDeleteSelected()">
                          <IconTrash :size="16" aria-label="Delete" />
                        </BaseButton>
                      </BaseTooltip>
                      <BaseTooltip
                        :content="drawGeodesic ? 'Geodesic mode: move/scale respects ground distances. Click for flat mode.' : 'Flat mode: move/scale preserves visual shape. Click for geodesic mode.'"
                        placement="bottom"
                      >
                        <BaseButton variant="secondary" size="sm" @click="drawToggleGeodesic()">
                          <IconGeodesic :size="16" aria-label="Geodesic mode" />
                          {{ drawGeodesic ? 'Geodesic' : 'Flat' }}
                        </BaseButton>
                      </BaseTooltip>
                    </div>
                    <div style="height: 360px; border-radius: 8px; overflow: hidden; border: 1px solid var(--mp-color-border-default);">
                      <MapLibre
                        map-style="https://demotiles.maplibre.org/style.json"
                        :center="[0, 20]"
                        :zoom="1.5"
                        style="width: 100%; height: 100%;"
                      >
                        <MapDraw
                          ref="mapDrawRef"
                          v-model="drawFeatures"
                          :mode="drawMode"
                          :geodesic="drawGeodesic"
                          @update:mode="drawMode = $event"
                          @update:geodesic="drawGeodesic = $event"
                          @select="onDrawSelect"
                        />
                      </MapLibre>
                    </div>
                  </section>

                </div>
              </template>

              <!-- ── Breakpoints tab ───────────────────────────────────── -->
              <template #breakpoints>
                <div style="display: flex; flex-direction: column; gap: 2rem; padding-top: 1.5rem; color: var(--mp-color-text-primary);">

                  <!-- Breakpoint info -->
                  <section style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <BaseTypography variant="label" color="secondary">Current Breakpoint</BaseTypography>
                    <BaseCard bordered style="max-width: 480px;">
                      <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                        <BaseTypography variant="body-md">Active breakpoint: <strong>{{ bpCurrent }}</strong></BaseTypography>
                        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                          <BaseBadge v-for="key in ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl']" :key="key" :variant="bpActive[key] ? 'success' : 'neutral'">{{ key }}</BaseBadge>
                        </div>
                      </div>
                    </BaseCard>
                  </section>

                  <!-- ShowAt / HideAt -->
                  <section style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <BaseTypography variant="label" color="secondary">ShowAt / HideAt</BaseTypography>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                      <ShowAt min="xs">
                        <BaseBadge variant="primary">Visible at xs and above (≥ 480 px)</BaseBadge>
                      </ShowAt>
                      <ShowAt max="sm">
                        <BaseBadge variant="warning">Visible below sm (< 768 px)</BaseBadge>
                      </ShowAt>
                      <HideAt min="md">
                        <BaseBadge variant="info">Hidden at md and above (≥ 1024 px)</BaseBadge>
                      </HideAt>
                      <ShowAt min="md">
                        <BaseBadge variant="success">Visible at md and above (≥ 1024 px)</BaseBadge>
                      </ShowAt>
                    </div>
                  </section>

                  <!-- BreakpointDebug -->
                  <section style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <BaseTypography variant="label" color="secondary">BreakpointDebug</BaseTypography>
                    <BaseTypography variant="body-sm" color="secondary">The debug overlay is fixed at the bottom-right corner of this story.</BaseTypography>
                    <BreakpointDebug />
                  </section>

                </div>
              </template>

            </BaseTabs>
          </div>
        </template>

        <template #footer>
          <div style="padding: 0.75rem 2rem; border-top: 1px solid var(--mp-color-border-default); display: flex; justify-content: space-between; align-items: center; background-color: var(--mp-color-bg-surface);">
            <BaseTypography variant="caption" color="tertiary">© 2026 Mission Platform</BaseTypography>
            <BaseTypography variant="caption" color="tertiary">v1.0.0</BaseTypography>
          </div>
        </template>
      </BaseApplicationLayout>
    </div>
  `,
};

const meta = {
  title: 'Themes/Showcase',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
The **Themes Showcase** renders the full Mission Platform component library inside
both the \`light\` and \`dark\` themes so you can visually verify that every token,
colour, and spacing value is correct across themes.

It is **not** a component story in the traditional sense — there is no single
component under test. Instead it acts as a living style guide: all components from
\`@mission-platform/components\`, all icons from \`@mission-platform/icons\`, the map
stack from \`@mission-platform/map\`, and the breakpoint helpers from
\`@mission-platform/breakpoints\` are all rendered together in one place.

### Tabs

| Tab | What is shown |
|---|---|
| Basics | Buttons, badges, typography, collapse, code block, avatar, status icon, spinner, skeleton, progress bar, tag |
| Forms | Inputs, select, multiselect, checkbox, switch, radio, date/time pickers, file input, textarea, markdown, form builder, form wizard |
| Navigation | Menu, menubar, sidebar, navbar, breadcrumb, tabs |
| Data | List, table, virtual list, virtual table, tree view, virtual tree view, virtual log viewer |
| Overlays | Tooltip, popover, dialog, modal, window popout |
| Icons | Full icon grid |
| Calendar | Date picker calendar |
| Editors | Monaco editor |
| Map | Interactive MapLibre map with drawing tools |
| Breakpoints | ShowAt / HideAt / BreakpointDebug helpers |

### Theme switching

Use the **Storybook toolbar** (🌗 icon) to switch the global theme. The
\`LightTheme\` and \`DarkTheme\` stories pin a specific theme, while \`SideBySide\`
renders both simultaneously for visual diffing.
        `.trim(),
      },
    },
    a11y: {
      config: {
        rules: [
          // Non-active tab panels are hidden (hidden="") but axe still scans them.
          // The following rules generate false positives from hidden panels:
          // - aria-required-children / aria-required-parent: calendar grid inside hidden panel
          // - landmark-unique: map canvas aria-label="Map" duplicated across hidden panels
          { id: 'aria-required-children', enabled: false },
          { id: 'aria-required-parent', enabled: false },
          { id: 'landmark-unique', enabled: false },
        ],
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Full component showcase rendered in the light theme. */
export const LightTheme: Story = {
  globals: {
    theme: 'light',
  },
  render: () => ({
    components: { ThemeShowcase: ThemeShowcase as unknown as Component },
    template: '<ThemeShowcase />',
  }),
};

/** Full component showcase rendered in the dark theme. */
export const DarkTheme: Story = {
  globals: {
    theme: 'dark',
  },
  render: () => ({
    components: { ThemeShowcase: ThemeShowcase as unknown as Component },
    template: '<ThemeShowcase />',
  }),
};

/**
 * Light and dark themes rendered side by side for instant visual diffing.
 * Two full-page layouts are placed in a two-column grid so differences in colours,
 * spacing, or component states are immediately visible.
 */
export const SideBySide: Story = {
  // Two full-page layouts are rendered side by side for visual comparison; duplicate
  // landmark roles (main, header, footer, nav) are structurally unavoidable in this context.
  // color-contrast is disabled because hidden tab panels contain dark-theme code blocks
  // that produce false-positive contrast violations (elements not visible to users).
  parameters: {
    a11y: {
      config: {
        rules: [
          { id: 'landmark-unique', enabled: false },
          { id: 'landmark-no-duplicate-banner', enabled: false },
          { id: 'landmark-no-duplicate-contentinfo', enabled: false },
          { id: 'landmark-no-duplicate-main', enabled: false },
          { id: 'color-contrast', enabled: false },
        ],
      },
    },
  },
  render: () => ({
    components: { ThemeShowcase: ThemeShowcase as unknown as Component },
    template: `
      <div style="display: grid; grid-template-columns: 1fr 1fr;">
        <div data-theme="light" style="background-color: var(--mp-color-bg-base); color: var(--mp-color-text-primary);">
          <ThemeShowcase />
        </div>
        <div data-theme="dark" style="background-color: var(--mp-color-bg-base); color: var(--mp-color-text-primary);">
          <ThemeShowcase />
        </div>
      </div>
    `,
  }),
};
