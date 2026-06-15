<script lang="ts" setup>
  /**
   * `BaseSchedulerEventDialog` — Scheduler event dialog component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { computed, ref, watch } from 'vue';

  import BaseButton from '../base-button/base-button.vue';
  import BaseCheckbox from '../base-checkbox/base-checkbox.vue';
  import BaseColorInput from '../base-color-input/base-color-input.vue';
  import BaseDateRangeInput from '../base-date-range-input/base-date-range-input.vue';
  import BaseDateTimeRangeInput from '../base-date-time-range-input/base-date-time-range-input.vue';
  import BaseDialog from '../base-dialog/base-dialog.vue';
  import BaseInput from '../base-input/base-input.vue';
  import BaseSelect from '../base-select/base-select.vue';
  import BaseTextarea from '../base-textarea/base-textarea.vue';

  import type { RRuleFreq, VEvent, VEventClass, VEventStatus, VEventTransp } from './types';
  import type { DateRange } from '../base-date-range-input';
  import type { DateTimeRange } from '../base-date-time-range-input';

  const props = defineProps<{
    /** Whether the dialog is visible. */
    open: boolean;
    /** Existing event to edit (undefined means "create new"). */
    event?: VEvent;
    /** Pre-populated ISO datetime start for new events. */
    defaultStart?: string;
  }>();

  const emit = defineEmits<{
    /** Emitted when the user saves (create or update). */
    save: [partial: Omit<VEvent, 'uid' | 'dtstamp'>];
    /** Emitted when the user deletes the event. */
    delete: [uid: string];
    /** Emitted when the dialog is dismissed without saving. */
    close: [];
  }>();

  // ─── Form model ────────────────────────────────────────────────────────────

  /** Convert an ISO string or date-only string to "YYYY-MM-DD" */
  function isoToDateStr(iso: string | undefined): string {
    if (!iso) return '';
    return iso.slice(0, 10);
  }

  /** Convert an ISO string to "YYYY-MM-DDTHH:MM" for the datetime range picker */
  function isoToDatetimeLocal(iso: string | undefined): string {
    if (!iso) return '';
    if (iso.length >= 16) return iso.slice(0, 16);
    return iso.slice(0, 10) + 'T00:00';
  }

  function datetimeLocalToISO(local: string): string {
    if (!local) return '';
    return new Date(local).toISOString();
  }

  const defaultEnd = computed(() => {
    if (props.defaultStart) {
      const d = new Date(props.defaultStart);
      d.setHours(d.getHours() + 1);
      return d.toISOString().slice(0, 16);
    }
    return '';
  });

  const form = ref({
    summary: '',
    description: '',
    location: '',
    url: '',
    color: '#6c2fd4',
    dtstart: '',
    dtend: '',
    status: 'CONFIRMED' as VEventStatus,
    classification: 'PUBLIC' as VEventClass,
    transp: 'OPAQUE' as VEventTransp,
    allDay: false,
    rruleFreq: '' as string,
    rruleCount: '' as string,
    rruleInterval: '' as string,
    organizer: '',
  });

  function resetForm() {
    if (props.event) {
      form.value = {
        summary: props.event.summary ?? '',
        description: props.event.description ?? '',
        location: props.event.location ?? '',
        url: props.event.url ?? '',
        color: props.event.color ?? '#6c2fd4',
        dtstart: isoToDatetimeLocal(props.event.dtstart),
        dtend: isoToDatetimeLocal(props.event.dtend),
        status: props.event.status ?? 'CONFIRMED',
        classification: props.event.classification ?? 'PUBLIC',
        transp: props.event.transp ?? 'OPAQUE',
        allDay: /^\d{4}-\d{2}-\d{2}$/.test(props.event.dtstart),
        rruleFreq: props.event.rrule?.freq ?? '',
        rruleCount: props.event.rrule?.count != null ? String(props.event.rrule.count) : '',
        rruleInterval: props.event.rrule?.interval != null ? String(props.event.rrule.interval) : '',
        organizer: props.event.organizer ?? '',
      };
    } else {
      const startLocal = props.defaultStart
        ? isoToDatetimeLocal(props.defaultStart)
        : isoToDatetimeLocal(new Date().toISOString());
      form.value = {
        summary: '',
        description: '',
        location: '',
        url: '',
        color: '#6c2fd4',
        dtstart: startLocal,
        dtend: defaultEnd.value,
        status: 'CONFIRMED',
        classification: 'PUBLIC',
        transp: 'OPAQUE',
        allDay: false,
        rruleFreq: '',
        rruleCount: '',
        rruleInterval: '',
        organizer: '',
      };
    }
  }

  watch(
    () => props.open,
    (val) => {
      if (val) resetForm();
    },
    { immediate: true },
  );

  // ─── Date/time range picker bridges ───────────────────────────────────────

  /** Two-way binding for BaseDateTimeRangeInput (non-allDay mode) */
  const dateTimeRange = computed<DateTimeRange>({
    get() {
      return { start: form.value.dtstart, end: form.value.dtend, timezone: 'browser' as const };
    },
    set(val: DateTimeRange) {
      form.value.dtstart = val.start;
      form.value.dtend = val.end;
    },
  });

  /** Two-way binding for BaseDateRangeInput (allDay mode) */
  const dateRange = computed<DateRange>({
    get() {
      return { start: isoToDateStr(form.value.dtstart), end: isoToDateStr(form.value.dtend) };
    },
    set(val: DateRange) {
      form.value.dtstart = val.start;
      form.value.dtend = val.end;
    },
  });

  // ─── v-model bridges ───────────────────────────────────────────────────────
  // `BaseInput` / `BaseSelect` expose a `string | number` model and `BaseCheckbox`
  // a `boolean | string[]` model. These writable proxies adapt the strongly-typed
  // `form` fields so `v-model` type-checks under strict template checking while
  // keeping `form` (and therefore `onSave`) strongly typed.
  function stringModel(get: () => string, set: (value: string) => void) {
    return computed<string | number>({
      get,
      set: (value) => set(String(value)),
    });
  }

  const summaryModel = stringModel(
    () => form.value.summary,
    (value) => (form.value.summary = value),
  );
  const locationModel = stringModel(
    () => form.value.location,
    (value) => (form.value.location = value),
  );
  const urlModel = stringModel(
    () => form.value.url,
    (value) => (form.value.url = value),
  );
  const organizerModel = stringModel(
    () => form.value.organizer,
    (value) => (form.value.organizer = value),
  );
  const rruleFreqModel = stringModel(
    () => form.value.rruleFreq,
    (value) => (form.value.rruleFreq = value),
  );
  const rruleIntervalModel = stringModel(
    () => form.value.rruleInterval,
    (value) => (form.value.rruleInterval = value),
  );
  const rruleCountModel = stringModel(
    () => form.value.rruleCount,
    (value) => (form.value.rruleCount = value),
  );

  const statusModel = computed<string | number>({
    get: () => form.value.status,
    set: (value) => (form.value.status = value as VEventStatus),
  });
  const classificationModel = computed<string | number>({
    get: () => form.value.classification,
    set: (value) => (form.value.classification = value as VEventClass),
  });
  const transpModel = computed<string | number>({
    get: () => form.value.transp,
    set: (value) => (form.value.transp = value as VEventTransp),
  });

  const allDayModel = computed<boolean | string[]>({
    get: () => form.value.allDay,
    set: (value) => (form.value.allDay = Boolean(value)),
  });

  // ─── Save ──────────────────────────────────────────────────────────────────

  function toIsoField(localStr: string, allDay: boolean): string {
    if (!localStr) return '';
    if (allDay) return localStr.slice(0, 10);
    return datetimeLocalToISO(localStr);
  }

  function onSave() {
    const partial: Omit<VEvent, 'uid' | 'dtstamp'> = {
      dtstart: toIsoField(form.value.dtstart, form.value.allDay),
      dtend: toIsoField(form.value.dtend, form.value.allDay),
      summary: form.value.summary || undefined,
      description: form.value.description || undefined,
      location: form.value.location || undefined,
      url: form.value.url || undefined,
      color: form.value.color,
      status: form.value.status,
      classification: form.value.classification,
      transp: form.value.transp,
      organizer: form.value.organizer || undefined,
    };

    if (form.value.rruleFreq) {
      partial.rrule = {
        freq: form.value.rruleFreq as RRuleFreq,
        count: form.value.rruleCount ? Number(form.value.rruleCount) : undefined,
        interval: form.value.rruleInterval ? Number(form.value.rruleInterval) : undefined,
      };
    }

    emit('save', partial);
  }

  function onDelete() {
    if (props.event) emit('delete', props.event.uid);
  }

  // ─── Dialog title ──────────────────────────────────────────────────────────

  const dialogTitle = computed(() => (props.event ? 'Edit Event' : 'New Event'));

  // ─── Select option sets ────────────────────────────────────────────────────

  const statusOptions = [
    { label: 'CONFIRMED', value: 'CONFIRMED' },
    { label: 'TENTATIVE', value: 'TENTATIVE' },
    { label: 'CANCELLED', value: 'CANCELLED' },
  ];

  const classOptions = [
    { label: 'PUBLIC', value: 'PUBLIC' },
    { label: 'PRIVATE', value: 'PRIVATE' },
    { label: 'CONFIDENTIAL', value: 'CONFIDENTIAL' },
  ];

  const transpOptions = [
    { label: 'OPAQUE (blocks time)', value: 'OPAQUE' },
    { label: 'TRANSPARENT (free)', value: 'TRANSPARENT' },
  ];

  const freqOptions = [
    { label: 'None', value: '' },
    { label: 'DAILY', value: 'DAILY' },
    { label: 'WEEKLY', value: 'WEEKLY' },
    { label: 'MONTHLY', value: 'MONTHLY' },
    { label: 'YEARLY', value: 'YEARLY' },
  ];
</script>

<template>
  <BaseDialog
    :close-on-route-change="false"
    :open="open"
    :title="dialogTitle"
    @close="emit('close')"
    @update:open="(v) => !v && emit('close')"
  >
    <!-- default slot = BaseDialogBody content -->
    <form
      class="base-scheduler-event-dialog__body"
      @submit.prevent="onSave"
    >
      <!-- Summary -->
      <BaseInput
        v-model="summaryModel"
        label="Title"
        placeholder="Add title"
        required
      />

      <!-- All-day toggle -->
      <BaseCheckbox
        v-model="allDayModel"
        label="All day"
      />

      <!-- Date/time range — switches between date-only and datetime pickers -->
      <BaseDateRangeInput
        v-if="form.allDay"
        v-model="dateRange"
        label="Date range"
        required
      />
      <BaseDateTimeRangeInput
        v-else
        v-model="dateTimeRange"
        label="Date & time"
        required
      />

      <!-- Color -->
      <BaseColorInput
        v-model="form.color"
        hint="Click the swatch or type a hex value"
        label="Colour"
      />

      <!-- Location -->
      <BaseInput
        v-model="locationModel"
        label="Location"
        placeholder="Add location"
      />

      <!-- Description -->
      <BaseTextarea
        v-model="form.description"
        :rows="3"
        label="Description"
        placeholder="Add description"
      />

      <!-- URL -->
      <BaseInput
        v-model="urlModel"
        label="URL (RFC 5545 URL)"
        placeholder="https://…"
        type="url"
      />

      <!-- RFC 5545 STATUS -->
      <BaseSelect
        v-model="statusModel"
        :options="statusOptions"
        label="Status (RFC 5545 STATUS)"
      />

      <!-- RFC 5545 CLASS -->
      <BaseSelect
        v-model="classificationModel"
        :options="classOptions"
        label="Classification (RFC 5545 CLASS)"
      />

      <!-- RFC 5545 TRANSP -->
      <BaseSelect
        v-model="transpModel"
        :options="transpOptions"
        label="Transparency (RFC 5545 TRANSP)"
      />

      <!-- RFC 5545 ORGANIZER -->
      <BaseInput
        v-model="organizerModel"
        label="Organizer (RFC 5545 ORGANIZER)"
        placeholder="mailto:organizer@example.com"
      />

      <!-- RFC 5545 RRULE -->
      <fieldset class="base-scheduler-event-dialog__fieldset">
        <legend class="base-scheduler-event-dialog__fieldset-legend">Recurrence (RFC 5545 RRULE)</legend>

        <BaseSelect
          v-model="rruleFreqModel"
          :options="freqOptions"
          label="Frequency"
        />

        <template v-if="form.rruleFreq">
          <BaseInput
            v-model="rruleIntervalModel"
            label="Interval (every N …)"
            placeholder="1"
            type="number"
          />

          <BaseInput
            v-model="rruleCountModel"
            label="Count (end after N occurrences)"
            placeholder="unlimited"
            type="number"
          />
        </template>
      </fieldset>
    </form>

    <!-- footer slot = BaseDialogFooter content -->
    <template #footer>
      <BaseButton
        v-if="event"
        class="base-scheduler-event-dialog__delete-btn"
        size="sm"
        type="button"
        variant="error"
        @click="onDelete"
      >
        Delete
      </BaseButton>
      <BaseButton
        size="sm"
        type="button"
        variant="secondary"
        @click="emit('close')"
      >
        Cancel
      </BaseButton>
      <BaseButton
        size="sm"
        type="button"
        variant="primary"
        @click="onSave"
      >
        {{ event ? 'Update' : 'Create' }}
      </BaseButton>
    </template>
  </BaseDialog>
</template>

<style lang="scss" scoped>
  @use '@mission-platform/tokens/scss/mixins' as mp;

  .base-scheduler-event-dialog {
    &__body {
      display: flex;
      flex-direction: column;
      gap: var(--mp-spacing-4);
    }

    &__fieldset {
      border: 1px solid var(--mp-color-border-default);
      border-radius: var(--mp-radius-md);
      padding: var(--mp-spacing-3);
      display: flex;
      flex-direction: column;
      gap: var(--mp-spacing-3);
    }

    &__fieldset-legend {
      @include mp.mp-font-body-sm;

      font-weight: 600;
      padding: 0 var(--mp-spacing-1);
      color: var(--mp-color-text-secondary);
    }

    &__delete-btn {
      margin-right: auto;
    }
  }
</style>
