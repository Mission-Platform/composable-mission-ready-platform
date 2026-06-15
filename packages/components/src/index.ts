// ─── @mission-platform/components ───────────────────────────────────────────
// Vue 3 component library for Mission Platform.
// Import the styles separately:  import '@mission-platform/components/styles'
//
// `BaseMonacoEditor` lives behind the dedicated `./monaco` subpath
// (`@mission-platform/components/monaco`) so apps that don't render a code
// editor — most notably the SSG-prerendered marketing site — pay no Monaco
// / language-worker bundle cost.

export { default as BaseButton } from './components/base-button';
export type { ButtonVariant, ButtonSize } from './components/base-button';

export { default as BaseIconButton } from './components/base-icon-button';
export type { IconButtonVariant, IconButtonSize } from './components/base-icon-button';

export { default as BaseCard } from './components/base-card';
export type { CardPadding } from './components/base-card';
export { default as BaseCardHeader } from './components/base-card/base-card-header.vue';
export { default as BaseCardBody } from './components/base-card/base-card-body.vue';
export { default as BaseCardFooter } from './components/base-card/base-card-footer.vue';

export { default as BaseCarousel } from './components/base-carousel';

export { default as BaseBadge } from './components/base-badge';
export type { BadgeVariant, BadgeSize } from './components/base-badge';

export { default as BaseInput } from './components/base-input';
export type { InputSize, InputType } from './components/base-input';

export { default as BaseSelect } from './components/base-select';
export type { SelectSize, SelectOption } from './components/base-select';

export { default as BaseTextarea } from './components/base-textarea';
export type { TextareaSize, TextareaResize } from './components/base-textarea';

export { default as BaseCheckbox } from './components/base-checkbox';

export { default as BaseRadio } from './components/base-radio';

export { default as BaseRadioGroup } from './components/base-radio-group';
export type { RadioOption } from './components/base-radio-group';

export { default as BaseSwitch } from './components/base-switch';
export type { SwitchSize } from './components/base-switch';

export { default as BaseMarkdownInput } from './components/base-markdown-input';
export type { MarkdownInputSize, MarkdownInputTab } from './components/base-markdown-input';

export {
  default as BaseSchemaForm,
  useSchemaForm,
  jsonSchemaToFields,
  jsonSchemaDefaults,
  createFormValidator,
  evaluateCondition,
  isFieldVisible,
} from './components/base-schema-form';
export type {
  FormJsonSchema,
  SchemaFormDefinition,
  SchemaFormValidationMode,
  SchemaFormStep,
  JsonSchemaProperty,
  JsonSchemaType,
  JsonSchemaStringFormat,
  FieldUiOptions,
  FormValues,
  FormFieldSchema,
  FormFieldType,
  FormErrors,
  FormValidator,
  SchemaFormTranslate,
  SchemaObject,
  FieldCondition,
  FieldConditionLeaf,
  FieldConditionGroup,
} from './components/base-schema-form';
export { default as BaseSchemaFormField } from './components/base-schema-form/base-schema-form-field.vue';
export { default as BaseSchemaFormActions } from './components/base-schema-form/base-schema-form-actions.vue';

export { default as BaseFieldSet } from './components/base-field-set';

export {
  default as BaseFormBuilder,
  useFormBuilder,
  DEFAULT_FIELD_TYPES,
  createField,
  nextFieldId,
  builderFieldToProperty,
  fieldsToSchema,
  fieldsToWizardSchema,
  fieldsToDefinition,
  schemaToFields,
  schemaStepTitles,
  schemaStepDescriptions,
  schemaStepConditions,
  fieldKeyError,
  slugify,
  uniqueKey,
  widgetToJsonType,
  widgetHasOptions,
  isNumberWidget,
  isFieldsetWidget,
  CANVAS_GROUP,
  PALETTE_GROUP,
  canvasGroup,
  canvasStepGroup,
  canvasGroupStep,
  canvasGroupParentId,
  isCanvasGroup,
} from './components/base-form-builder';
export type {
  UseFormBuilder,
  UseFormBuilderConfig,
  InsertTarget,
  BuilderField,
  BuilderFieldOption,
  FieldTypeDescriptor,
  FieldsToSchemaOptions,
  FormBuilderDragData,
  FormBuilderDropData,
} from './components/base-form-builder';

export { default as BaseTag } from './components/base-tag';
export type { TagSize, TagVariant } from './components/base-tag';

export { default as BaseDropdown } from './components/base-dropdown';
export type { DropdownPlacement } from './components/base-dropdown';

export { default as BaseMultiselect } from './components/base-multiselect';
export type { MultiselectSize, MultiselectOption } from './components/base-multiselect';

export { default as BaseCollapse } from './components/base-collapse';

export { default as BaseAccordion } from './components/base-accordion';
export { BaseAccordionItem } from './components/base-accordion';
export type { AccordionContext } from './components/base-accordion';

export { default as BaseDialog } from './components/base-dialog';
export { default as BaseDialogHeader } from './components/base-dialog/base-dialog-header.vue';
export { default as BaseDialogBody } from './components/base-dialog/base-dialog-body.vue';
export { default as BaseDialogFooter } from './components/base-dialog/base-dialog-footer.vue';

export { default as BaseBreadcrumb } from './components/base-breadcrumb';
export type { BreadcrumbItem } from './components/base-breadcrumb';

export { default as BaseDrawer, DRAWER_SIZE_REM } from './components/base-drawer';
export type { DrawerPlacement, DrawerSize, DrawerVariant, DrawerDraggable } from './components/base-drawer';
export { default as BaseDrawerHeader } from './components/base-drawer/base-drawer-header.vue';
export { default as BaseDrawerBody } from './components/base-drawer/base-drawer-body.vue';
export { default as BaseDrawerFooter } from './components/base-drawer/base-drawer-footer.vue';

export { default as BaseFileInput } from './components/base-file-input';

export { default as BaseSearchInput } from './components/base-search-input';
export type { SearchInputSize } from './components/base-search-input';

export { default as BaseList } from './components/base-list';
export type { ListVariant, ListSize, ListItem } from './components/base-list';

export { default as BaseSpinner } from './components/base-spinner';
export type { SpinnerSize, SpinnerVariant } from './components/base-spinner';

export { default as BaseProgressBar } from './components/base-progress-bar';
export type { ProgressVariant, ProgressSize } from './components/base-progress-bar';

export { default as BaseMenu } from './components/base-menu';
export type { MenuItem } from './components/base-menu';
export { default as BaseMenuList } from './components/base-menu/base-menu-list.vue';
export { default as BaseMenuItemLink } from './components/base-menu/base-menu-item-link.vue';
export { default as BaseMenuItemButton } from './components/base-menu/base-menu-item-button.vue';
export { default as BaseMenuSubmenu } from './components/base-menu/base-menu-submenu.vue';

export { default as BaseMenubar } from './components/base-menubar';

export { default as BaseMenuItem } from './components/base-menu-item';
export type { MenuItemVariant } from './components/base-menu-item';

export { default as BaseModal } from './components/base-modal';
export type { ModalSize } from './components/base-modal';
export { default as BaseModalHeader } from './components/base-modal/base-modal-header.vue';
export { default as BaseModalBody } from './components/base-modal/base-modal-body.vue';
export { default as BaseModalFooter } from './components/base-modal/base-modal-footer.vue';

export { default as BaseNavbar } from './components/base-navbar';

export { default as BaseNavbarItem } from './components/base-navbar-item';
export type { NavbarItemVariant, NavbarItemChild } from './components/base-navbar-item';

export { default as BaseSkeleton } from './components/base-skeleton';
export type { SkeletonShape } from './components/base-skeleton';

export { default as BaseStatusIcon } from './components/base-status-icon';
export type { StatusLevel, StatusIconSize } from './components/base-status-icon';

export { default as BaseFormWizard } from './components/base-form-wizard';
export type { WizardStep } from './components/base-form-wizard';
export { default as BaseFormWizardSteps } from './components/base-form-wizard/base-form-wizard-steps.vue';
export { default as BaseFormWizardContent } from './components/base-form-wizard/base-form-wizard-content.vue';
export { default as BaseFormWizardFooter } from './components/base-form-wizard/base-form-wizard-footer.vue';

export { default as BaseTabs } from './components/base-tabs';
export type { TabItem, TabsVariant } from './components/base-tabs';
export { default as BaseTabList } from './components/base-tabs/base-tab-list.vue';
export { default as BaseTabPanel } from './components/base-tabs/base-tab-panel.vue';
export { default as BaseVirtualTabs } from './components/base-virtual-tabs';

export { default as BaseTable } from './components/base-table';
export type { TableColumn } from './components/base-table';
export type { SortDirection } from './components/base-table/types';
export { default as BaseTableHead } from './components/base-table/base-table-head.vue';
export { default as BaseTableBody } from './components/base-table/base-table-body.vue';
export { default as BaseTableEmptyState } from './components/base-table/base-table-empty-state.vue';

export { default as BaseTooltip } from './components/base-tooltip';
export type { TooltipPlacement } from './components/base-tooltip';

export { default as BasePopover } from './components/base-popover';
export type { PopoverPlacement } from './components/base-popover';

export { default as BaseWindowPopout } from './components/base-window-popout';

export { default as BaseTypography } from './components/base-typography';
export type {
  TypographyVariant,
  TypographyWeight,
  TypographyColor,
  TypographyAlign,
} from './components/base-typography';

// ─── Layout & display components ─────────────────────────────────────────────

export { default as BaseApplicationLayout, StatusLevels } from './components/base-application-layout';
export type { ApplicationStatusLevel } from './components/base-application-layout';

export { default as BaseVerticalLayout } from './components/base-vertical-layout';

export { default as BaseGrid, GRID_GAP_SPACING } from './components/base-grid';
export type { GridCell, GridGap, GridAlignment } from './components/base-grid';

export { default as BaseStack, STACK_JUSTIFY_CONTENT, STACK_ALIGN_ITEMS } from './components/base-stack';
export type { StackDirection, StackJustify, StackAlign } from './components/base-stack';

export { default as BaseMasonry, MASONRY_GAP_SPACING } from './components/base-masonry';
export type { MasonryGap } from './components/base-masonry';

export { default as BaseTimeline, BaseTimelineItem, TimelineContextKey } from './components/base-timeline';
export type {
  TimelineOrientation,
  TimelineAlign,
  TimelineItemVariant,
  TimelineContext,
} from './components/base-timeline';

export { default as BaseAvatar } from './components/base-avatar';
export type { AvatarSize, AvatarShape, AvatarStatus } from './components/base-avatar';

export { default as BaseInView } from './components/base-in-view';
export type { InViewAnimation } from './components/base-in-view';

export { default as BaseVirtualList } from './components/base-virtual-list';

export { default as BaseVirtualTable } from './components/base-virtual-table';
export type { VirtualTableColumn } from './components/base-virtual-table';
export { default as BaseVirtualTableHead } from './components/base-virtual-table/base-virtual-table-head.vue';
export { default as BaseVirtualTableRow } from './components/base-virtual-table/base-virtual-table-row.vue';
export { default as BaseVirtualTableFooter } from './components/base-virtual-table/base-virtual-table-footer.vue';

export { default as BaseTreeView } from './components/base-tree-view';
export type { TreeNode } from './components/base-tree-view';
export { default as BaseTreeNodeLabel } from './components/base-tree-view/base-tree-node-label.vue';

export { default as BaseVirtualTreeView } from './components/base-virtual-tree-view';
export type { VirtualTreeNode } from './components/base-virtual-tree-view';

export { default as BaseVirtualLogViewer } from './components/base-virtual-log-viewer';
export type { LogEntry, LogLevel } from './components/base-virtual-log-viewer';
export { default as BaseLogViewerToolbar } from './components/base-virtual-log-viewer/base-log-viewer-toolbar.vue';
export { default as BaseLogViewerRow } from './components/base-virtual-log-viewer/base-log-viewer-row.vue';

// ─── Date / time picker components ───────────────────────────────────────────

export { default as BaseCalendar } from './components/base-calendar';
export type { CalendarSize } from './components/base-calendar';

export { default as BaseDateInput } from './components/base-date-input';
export type { DateInputSize } from './components/base-date-input';

export { default as BaseDateRangeInput } from './components/base-date-range-input';
export type { DateRangeInputSize, DateRange } from './components/base-date-range-input';

export { default as BaseTimeInput } from './components/base-time-input';
export type { TimeInputSize } from './components/base-time-input';

export { default as BaseTimeRangeInput } from './components/base-time-range-input';
export type { TimeRangeInputSize, TimeRange } from './components/base-time-range-input';

export { default as BaseDateTimeRangeInput } from './components/base-date-time-range-input';
export type { DateTimeRangeInputSize, DateTimeRange, TimezoneMode } from './components/base-date-time-range-input';

export { default as BaseColorInput } from './components/base-color-input';
export type { ColorInputSize } from './components/base-color-input';

export { default as BaseNumberStepper } from './components/base-number-stepper';
export type { NumberStepperSize } from './components/base-number-stepper';

export {
  default as BaseLocationInput,
  COORDINATE_PRECISION,
  roundCoordinate,
  parseAxis,
  formatAxis,
  formatLocation,
  toGeoJsonPoint,
  fromGeoJsonPoint,
  isCompleteLocation,
  isEmptyLocation,
  emptyLocation,
} from './components/base-location-input';
export type {
  LocationInputSize,
  LocationFormat,
  LocationValue,
  GeoJsonPoint,
  CoordinateAxis,
} from './components/base-location-input';

// ─── Scheduler ────────────────────────────────────────────────────────────────

export { default as BaseScheduler } from './components/base-scheduler';
export { default as BaseSchedulerEvent } from './components/base-scheduler/base-scheduler-event.vue';
export { default as BaseSchedulerTimeGrid } from './components/base-scheduler/base-scheduler-time-grid.vue';
export { default as BaseSchedulerMonthView } from './components/base-scheduler/base-scheduler-month-view.vue';
export { default as BaseSchedulerYearView } from './components/base-scheduler/base-scheduler-year-view.vue';
export { default as BaseSchedulerEventDialog } from './components/base-scheduler/base-scheduler-event-dialog.vue';
export { useScheduler } from './components/base-scheduler/use-scheduler';
export type { SchedulerInstance } from './components/base-scheduler/use-scheduler';
export type {
  VEvent,
  VEventStatus,
  VEventClass,
  VEventTransp,
  VEventAttendee,
  VAlarm,
  RRule,
  RRuleFreq,
  RRuleWeekday,
  SchedulerView,
  SchedulerEventSlot,
} from './components/base-scheduler/types';

// ─── Code ─────────────────────────────────────────────────────────────────────

export { default as BaseCodeBlock } from './components/base-code-block';
export type { CodeBlockLanguage } from './components/base-code-block';

// `BaseMonacoEditor` and its `MonacoEditorLanguage` / `MonacoEditorTheme`
// type aliases are intentionally NOT re-exported from this barrel. Import
// them from the dedicated subpath instead:
//
//   import { BaseMonacoEditor } from '@mission-platform/components/monaco'
//   import type { MonacoEditorLanguage } from '@mission-platform/components/monaco'

// ─── Content & media components ──────────────────────────────────────────────

export { default as BaseSeparator } from './components/base-separator';
export type { SeparatorOrientation, SeparatorVariant, SeparatorSpacing } from './components/base-separator';

export { default as BaseQuote } from './components/base-quote';
export type { QuoteVariant, QuoteSize } from './components/base-quote';

export { default as BaseButtonGroup } from './components/base-button-group';
export type { ButtonGroupOrientation, ButtonGroupGap } from './components/base-button-group';

export { default as BaseHero } from './components/base-hero';
export type { HeroAlign, HeroSize } from './components/base-hero';

export { default as BaseAlertBanner } from './components/base-alert-banner';
export type { AlertBannerVariant } from './components/base-alert-banner';

export { default as BaseResponsiveImage } from './components/base-responsive-image';
export type { ResponsiveImageSource, ResponsiveImageFit } from './components/base-responsive-image';

export { default as BaseResponsiveVideo } from './components/base-responsive-video';
export type { ResponsiveVideoSource, ResponsiveVideoFit } from './components/base-responsive-video';

export { default as BaseBackgroundVideo } from './components/base-background-video';
export type { BackgroundVideoSource, BackgroundVideoFit } from './components/base-background-video';

export { default as BaseQrCode, encodeQr } from './components/base-qr-code';
export type { QrErrorCorrection, QrMatrix } from './components/base-qr-code';

// ─── Communication components ────────────────────────────────────────────────

export { default as BaseChatArea } from './components/base-chat-area';

export { default as BaseChatBubble } from './components/base-chat-bubble';
export type { ChatBubbleSide, ChatBubbleVariant } from './components/base-chat-bubble';

// ─── Navigation & input components ───────────────────────────────────────────

export { default as BasePagination } from './components/base-pagination';
export type { PaginationSize, PaginationItem } from './components/base-pagination';

export { default as BaseRating } from './components/base-rating';
export type { RatingSize } from './components/base-rating';

export { default as BaseSegmentControl } from './components/base-segment-control';
export type { SegmentControlSize, SegmentOption } from './components/base-segment-control';

export { default as BaseSlider } from './components/base-slider';
export type { SliderSize } from './components/base-slider';

export { default as BaseRangeInput } from './components/base-range-input';
export type { RangeInputSize, RangeValue } from './components/base-range-input';

export { default as BaseOtpInput } from './components/base-otp-input';
export type { OtpInputType, OtpInputSize } from './components/base-otp-input';

// ─── Toast notifications ─────────────────────────────────────────────────────

export { default as BaseToast, BaseToastContainer } from './components/base-toast';

// ─── Theme ────────────────────────────────────────────────────────────────────

export { default as BaseThemeToggle } from './components/base-theme-toggle';
export type { Theme } from './components/base-theme-toggle';

export { default as BaseThemeProvider } from './components/base-theme-provider';

export { default as BaseThemeComposer } from './components/base-theme-composer';

// ─── Composables ──────────────────────────────────────────────────────────────

export { useRouterClose } from './composables/use-router-close';
export { useZIndex, ZLayer } from './composables/use-z-index';
export type { ZLayerName } from './composables/use-z-index';

export { useTheme, createThemeStore, resetThemeStore, ThemeStoreKey } from './composables/use-theme';
export type { ResolvedTheme, UseThemeOptions, ThemeStore } from './composables/use-theme';

export {
  useThemeComposer,
  createThemeComposer,
  resetThemeComposer,
  configToCssVariables,
  cssVariablesToString,
  ATTRIBUTE_TO_CSS_VAR,
  ThemeComposerKey,
} from './composables/use-theme-composer';
export type {
  ThemeComposerConfig,
  ThemeComposerAttribute,
  ThemeComposerStore,
  UseThemeComposerOptions,
} from './composables/use-theme-composer';

export { useToast } from './composables/use-toast';
export type {
  ToastVariant,
  ToastPosition,
  ToastOptions,
  ToastRecord,
  UseToastReturn,
} from './composables/use-toast';
