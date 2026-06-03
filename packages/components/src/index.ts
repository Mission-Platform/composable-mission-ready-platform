// ─── @mission-platform/components ───────────────────────────────────────────
// Vue 3 component library for Mission Platform.
// Import the styles separately:  import '@mission-platform/components/styles'

export { default as BaseButton } from './components/BaseButton'
export type { ButtonVariant, ButtonSize } from './components/BaseButton'

export { default as BaseCard } from './components/BaseCard'
export type { CardPadding } from './components/BaseCard'
export { default as BaseCardHeader } from './components/BaseCard/BaseCardHeader.vue'
export { default as BaseCardBody } from './components/BaseCard/BaseCardBody.vue'
export { default as BaseCardFooter } from './components/BaseCard/BaseCardFooter.vue'

export { default as BaseBadge } from './components/BaseBadge'
export type { BadgeVariant, BadgeSize } from './components/BaseBadge'

export { default as BaseInput } from './components/BaseInput'
export type { InputSize, InputType } from './components/BaseInput'

export { default as BaseSelect } from './components/BaseSelect'
export type { SelectSize, SelectOption } from './components/BaseSelect'

export { default as BaseTextarea } from './components/BaseTextarea'
export type { TextareaSize, TextareaResize } from './components/BaseTextarea'

export { default as BaseCheckbox } from './components/BaseCheckbox'

export { default as BaseRadio } from './components/BaseRadio'

export { default as BaseRadioGroup } from './components/BaseRadioGroup'
export type { RadioOption } from './components/BaseRadioGroup'

export { default as BaseSwitch } from './components/BaseSwitch'
export type { SwitchSize } from './components/BaseSwitch'

export { default as BaseMarkdownInput } from './components/BaseMarkdownInput'
export type { MarkdownInputSize, MarkdownInputTab } from './components/BaseMarkdownInput'

export { default as BaseFormBuilder, useFormSchema } from './components/BaseFormBuilder'
export type {
  FormSchema,
  FormValues,
  FormFieldSchema,
  FormFieldType,
  FormErrors,
} from './components/BaseFormBuilder'
export { default as BaseFormBuilderField } from './components/BaseFormBuilder/BaseFormBuilderField.vue'
export { default as BaseFormBuilderActions } from './components/BaseFormBuilder/BaseFormBuilderActions.vue'

export { default as BaseTag } from './components/BaseTag'
export type { TagSize, TagVariant } from './components/BaseTag'

export { default as BaseDropdown } from './components/BaseDropdown'
export type { DropdownPlacement } from './components/BaseDropdown'

export { default as BaseMultiselect } from './components/BaseMultiselect'
export type { MultiselectSize, MultiselectOption } from './components/BaseMultiselect'

export { default as BaseCollapse } from './components/BaseCollapse'

export { default as BaseAccordion } from './components/BaseAccordion'
export { BaseAccordionItem } from './components/BaseAccordion'
export type { AccordionContext } from './components/BaseAccordion'

export { default as BaseDialog } from './components/BaseDialog'
export { default as BaseDialogHeader } from './components/BaseDialog/BaseDialogHeader.vue'
export { default as BaseDialogBody } from './components/BaseDialog/BaseDialogBody.vue'
export { default as BaseDialogFooter } from './components/BaseDialog/BaseDialogFooter.vue'

export { default as BaseBreadcrumb } from './components/BaseBreadcrumb'
export type { BreadcrumbItem } from './components/BaseBreadcrumb'

export { default as BaseSidebar } from './components/BaseSidebar'
export type { SidebarSide, SidebarSize } from './components/BaseSidebar'
export { default as BaseSidebarHeader } from './components/BaseSidebar/BaseSidebarHeader.vue'
export { default as BaseSidebarBody } from './components/BaseSidebar/BaseSidebarBody.vue'
export { default as BaseSidebarFooter } from './components/BaseSidebar/BaseSidebarFooter.vue'

export { default as BaseFileInput } from './components/BaseFileInput'

export { default as BaseSearchInput } from './components/BaseSearchInput'
export type { SearchInputSize } from './components/BaseSearchInput'

export { default as BaseList } from './components/BaseList'
export type { ListVariant, ListSize, ListItem } from './components/BaseList'

export { default as BaseSpinner } from './components/BaseSpinner'
export type { SpinnerSize, SpinnerVariant } from './components/BaseSpinner'

export { default as BaseProgressBar } from './components/BaseProgressBar'
export type { ProgressVariant, ProgressSize } from './components/BaseProgressBar'

export { default as BaseMenu } from './components/BaseMenu'
export type { MenuItem } from './components/BaseMenu'
export { default as BaseMenuList } from './components/BaseMenu/BaseMenuList.vue'
export { default as BaseMenuItemLink } from './components/BaseMenu/BaseMenuItemLink.vue'
export { default as BaseMenuItemButton } from './components/BaseMenu/BaseMenuItemButton.vue'
export { default as BaseMenuSubmenu } from './components/BaseMenu/BaseMenuSubmenu.vue'

export { default as BaseMenubar } from './components/BaseMenubar'

export { default as BaseMenuItem } from './components/BaseMenuItem'
export type { MenuItemVariant } from './components/BaseMenuItem'

export { default as BaseModal } from './components/BaseModal'
export type { ModalSize } from './components/BaseModal'
export { default as BaseModalHeader } from './components/BaseModal/BaseModalHeader.vue'
export { default as BaseModalBody } from './components/BaseModal/BaseModalBody.vue'
export { default as BaseModalFooter } from './components/BaseModal/BaseModalFooter.vue'

export { default as BaseNavbar } from './components/BaseNavbar'

export { default as BaseNavbarItem } from './components/BaseNavbarItem'
export type { NavbarItemVariant, NavbarItemChild } from './components/BaseNavbarItem'

export { default as BaseSkeleton } from './components/BaseSkeleton'
export type { SkeletonShape } from './components/BaseSkeleton'

export { default as BaseStatusIcon } from './components/BaseStatusIcon'
export type { StatusLevel, StatusIconSize } from './components/BaseStatusIcon'

export { default as BaseFormWizard } from './components/BaseFormWizard'
export type { WizardStep } from './components/BaseFormWizard'
export { default as BaseFormWizardSteps } from './components/BaseFormWizard/BaseFormWizardSteps.vue'
export { default as BaseFormWizardContent } from './components/BaseFormWizard/BaseFormWizardContent.vue'
export { default as BaseFormWizardFooter } from './components/BaseFormWizard/BaseFormWizardFooter.vue'

export { default as BaseTabs } from './components/BaseTabs'
export type { TabItem, TabsVariant } from './components/BaseTabs'
export { default as BaseTabList } from './components/BaseTabs/BaseTabList.vue'
export { default as BaseTabPanel } from './components/BaseTabs/BaseTabPanel.vue'
export { default as BaseVirtualTabs } from './components/BaseVirtualTabs'

export { default as BaseTable } from './components/BaseTable'
export type { TableColumn } from './components/BaseTable'
export type { SortDirection } from './components/BaseTable/types'
export { default as BaseTableHead } from './components/BaseTable/BaseTableHead.vue'
export { default as BaseTableBody } from './components/BaseTable/BaseTableBody.vue'
export { default as BaseTableEmptyState } from './components/BaseTable/BaseTableEmptyState.vue'

export { default as BaseTooltip } from './components/BaseTooltip'
export type { TooltipPlacement } from './components/BaseTooltip'

export { default as BasePopover } from './components/BasePopover'
export type { PopoverPlacement } from './components/BasePopover'

export { default as BaseWindowPopout } from './components/BaseWindowPopout'

export { default as BaseTypography } from './components/BaseTypography'
export type {
  TypographyVariant,
  TypographyWeight,
  TypographyColor,
  TypographyAlign,
} from './components/BaseTypography'

// ─── Layout & display components ─────────────────────────────────────────────

export { default as BaseApplicationLayout, StatusLevels } from './components/BaseApplicationLayout'
export type { ApplicationStatusLevel } from './components/BaseApplicationLayout'

export { default as BaseAvatar } from './components/BaseAvatar'
export type { AvatarSize, AvatarShape, AvatarStatus } from './components/BaseAvatar'

export { default as BaseInView } from './components/BaseInView'
export type { InViewAnimation } from './components/BaseInView'

export { default as BaseVirtualList } from './components/BaseVirtualList'

export { default as BaseVirtualTable } from './components/BaseVirtualTable'
export type { VirtualTableColumn } from './components/BaseVirtualTable'
export { default as BaseVirtualTableHead } from './components/BaseVirtualTable/BaseVirtualTableHead.vue'
export { default as BaseVirtualTableRow } from './components/BaseVirtualTable/BaseVirtualTableRow.vue'
export { default as BaseVirtualTableFooter } from './components/BaseVirtualTable/BaseVirtualTableFooter.vue'

export { default as BaseTreeView } from './components/BaseTreeView'
export type { TreeNode } from './components/BaseTreeView'
export { default as BaseTreeNodeLabel } from './components/BaseTreeView/BaseTreeNodeLabel.vue'

export { default as BaseVirtualTreeView } from './components/BaseVirtualTreeView'
export type { VirtualTreeNode } from './components/BaseVirtualTreeView'

export { default as BaseVirtualLogViewer } from './components/BaseVirtualLogViewer'
export type { LogEntry, LogLevel } from './components/BaseVirtualLogViewer'
export { default as BaseLogViewerToolbar } from './components/BaseVirtualLogViewer/BaseLogViewerToolbar.vue'
export { default as BaseLogViewerRow } from './components/BaseVirtualLogViewer/BaseLogViewerRow.vue'

// ─── Date / time picker components ───────────────────────────────────────────

export { default as BaseCalendar } from './components/BaseCalendar'
export type { CalendarSize } from './components/BaseCalendar'

export { default as BaseDateInput } from './components/BaseDateInput'
export type { DateInputSize } from './components/BaseDateInput'

export { default as BaseDateRangeInput } from './components/BaseDateRangeInput'
export type { DateRangeInputSize, DateRange } from './components/BaseDateRangeInput'

export { default as BaseTimeInput } from './components/BaseTimeInput'
export type { TimeInputSize } from './components/BaseTimeInput'

export { default as BaseTimeRangeInput } from './components/BaseTimeRangeInput'
export type { TimeRangeInputSize, TimeRange } from './components/BaseTimeRangeInput'

export { default as BaseDateTimeRangeInput } from './components/BaseDateTimeRangeInput'
export type {
  DateTimeRangeInputSize,
  DateTimeRange,
  TimezoneMode,
} from './components/BaseDateTimeRangeInput'

// ─── Code ─────────────────────────────────────────────────────────────────────

export { default as BaseCodeBlock } from './components/BaseCodeBlock'
export type { CodeBlockLanguage } from './components/BaseCodeBlock'

export { default as BaseMonacoEditor } from './components/BaseMonacoEditor'
export type { MonacoEditorLanguage, MonacoEditorTheme } from './components/BaseMonacoEditor'

// ─── Theme ────────────────────────────────────────────────────────────────────

export { default as BaseThemeToggle } from './components/BaseThemeToggle'
export type { Theme } from './components/BaseThemeToggle'

// ─── Composables ──────────────────────────────────────────────────────────────

export { useRouterClose } from './composables/useRouterClose'
