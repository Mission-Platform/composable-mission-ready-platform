<script lang="ts" setup>
  /**
   * `BaseLocationInput` — Geographic coordinate input for the Mission Platform UI.
   *
   * Captures a latitude/longitude point in one of three representations —
   * Decimal Degrees (DD), Degrees Decimal Minutes (DM), or Degrees Minutes
   * Seconds (DMS) — chosen via the format selector. Whatever variant is used
   * for entry, the canonical {@link LocationValue} model always carries signed
   * decimal-degree `lat`/`lng` rounded to centimetre precision (7 fractional
   * digits).
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { computed, ref, watch } from 'vue';

  import { useId } from '../../composables/use-id';
  import BaseInput from '../base-input/base-input.vue';
  import BaseSelect from '../base-select/base-select.vue';
  import BaseTypography from '../base-typography/base-typography.vue';

  import { emptyLocation, formatAxis, parseAxis } from './location';

  import type { LocationFormat, LocationValue } from './location';

  export type LocationInputSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

  const props = withDefaults(
    defineProps<{
      /** The canonical location value (signed decimal-degree `lat`/`lng`). */
      modelValue?: LocationValue | null;
      label?: string;
      labelHidden?: boolean;
      hint?: string;
      error?: string;
      disabled?: boolean;
      required?: boolean;
      /** Initial entry/serialisation format (defaults to Decimal Degrees). */
      format?: LocationFormat;
      /** Whether to expose the format selector (defaults to `true`). */
      allowFormatChange?: boolean;
      size?: LocationInputSize;
      id?: string;
    }>(),
    {
      modelValue: null,
      label: undefined,
      labelHidden: false,
      hint: undefined,
      error: undefined,
      disabled: false,
      required: false,
      format: 'dd',
      allowFormatChange: true,
      size: 'md',
      id: undefined,
    },
  );

  const emit = defineEmits<{
    'update:modelValue': [value: LocationValue];
    change: [value: LocationValue];
  }>();

  const { id: resolvedId } = useId(props.id);

  const FORMAT_OPTIONS: Array<{ label: string; value: LocationFormat }> = [
    { label: 'DD', value: 'dd' },
    { label: 'DM', value: 'dm' },
    { label: 'DMS', value: 'dms' },
  ];

  /** The active format: the value's own, else the configured default. */
  const format = computed<LocationFormat>(() => props.modelValue?.format ?? props.format);

  // Local text buffers so the user can type freely; resynced from the model.
  const latText = ref('');
  const lngText = ref('');

  /** Refreshes the text buffers from the current model value and format. */
  function syncFromModel() {
    const value = props.modelValue;
    latText.value = formatAxis(value?.lat, format.value, 'lat');
    lngText.value = formatAxis(value?.lng, format.value, 'lng');
  }
  syncFromModel();

  watch(() => [props.modelValue, props.format], syncFromModel, { deep: true });

  /** Emit a fresh {@link LocationValue} from the current text + format. */
  function commit() {
    const value: LocationValue = {
      lat: parseAxis(latText.value, format.value, 'lat'),
      lng: parseAxis(lngText.value, format.value, 'lng'),
      format: format.value,
    };
    emit('update:modelValue', value);
    emit('change', value);
  }

  /** Handles latitude input: buffers the text and re-emits the location. */
  function onLatInput(next: string | number) {
    latText.value = String(next);
    commit();
  }

  /** Handles longitude input: buffers the text and re-emits the location. */
  function onLngInput(next: string | number) {
    lngText.value = String(next);
    commit();
  }

  /** Switches the coordinate format, preserving the current coordinates. */
  function onFormatChange(next: string | number) {
    const base = props.modelValue ?? emptyLocation();
    const value: LocationValue = { lat: base.lat, lng: base.lng, format: next as LocationFormat };
    emit('update:modelValue', value);
    emit('change', value);
  }

  /** Per-format placeholders that hint at the expected syntax. */
  const placeholders = computed(() => {
    switch (format.value) {
      case 'dms': {
        return { lat: '40°42\'46.0"N', lng: '74°00\'21.5"W' };
      }
      case 'dm': {
        return { lat: "40°42.767'N", lng: "74°00.358'W" };
      }
      default: {
        return { lat: '40.7127753', lng: '-74.0059728' };
      }
    }
  });
</script>

<template>
  <fieldset
    :class="[
      'base-location-input',
      `base-location-input--${size}`,
      { 'base-location-input--error': !!error, 'base-location-input--disabled': disabled },
    ]"
  >
    <legend
      v-if="label"
      :class="['base-location-input__legend', { 'base-location-input__legend--hidden': labelHidden }]"
    >
      <BaseTypography
        as="span"
        color="primary"
        variant="label"
      >
        {{ label }}
      </BaseTypography>
      <span
        v-if="required"
        aria-hidden="true"
        class="base-location-input__required"
      >
        *
      </span>
    </legend>

    <div class="base-location-input__row">
      <BaseSelect
        v-if="allowFormatChange"
        :disabled="disabled"
        :model-value="format"
        :options="FORMAT_OPTIONS"
        :size="size"
        class="base-location-input__format"
        label="Coordinate format"
        label-hidden
        @update:model-value="onFormatChange"
      />
      <BaseInput
        :aria-describedby="error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined"
        :disabled="disabled"
        :model-value="latText"
        :placeholder="placeholders.lat"
        :required="required"
        :size="size"
        class="base-location-input__coord"
        label="Latitude"
        @update:model-value="onLatInput"
      />
      <BaseInput
        :disabled="disabled"
        :model-value="lngText"
        :placeholder="placeholders.lng"
        :required="required"
        :size="size"
        class="base-location-input__coord"
        label="Longitude"
        @update:model-value="onLngInput"
      />
    </div>

    <BaseTypography
      v-if="error"
      :id="`${resolvedId}-error`"
      as="p"
      class="base-location-input__error"
      color="inherit"
      role="alert"
      variant="caption"
    >
      {{ error }}
    </BaseTypography>
    <BaseTypography
      v-else-if="hint"
      :id="`${resolvedId}-hint`"
      as="p"
      class="base-location-input__hint"
      color="secondary"
      variant="caption"
    >
      {{ hint }}
    </BaseTypography>
  </fieldset>
</template>

<style lang="scss" scoped>
  @layer mp.components {
    .base-location-input {
      display: flex;
      flex-direction: column;
      gap: var(--mp-spacing-2);
      padding: 0;
      margin: 0;
      border: 0;

      &__legend {
        display: flex;
        align-items: center;
        gap: 2px;
        padding: 0;
        margin-bottom: var(--mp-spacing-1);

        &--hidden {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip-path: inset(50%);
          white-space: nowrap;
          border: 0;
        }
      }

      &__required {
        color: var(--mp-color-danger-default);
        margin-left: 2px;
      }

      &__row {
        display: flex;
        gap: var(--mp-spacing-2);
        align-items: flex-end;
      }

      &__format {
        flex: 0 0 auto;
      }

      &__coord {
        flex: 1 1 0;
        min-width: 0;
      }

      &--disabled {
        pointer-events: none;
        color: var(--mp-color-text-disabled);
      }

      &__error {
        color: var(--mp-color-danger-text);
        margin: 0;
      }

      &__hint {
        margin: 0;
      }
    }
  }
</style>
