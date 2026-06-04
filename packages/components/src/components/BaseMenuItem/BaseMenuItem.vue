<script lang="ts" setup>
  import { computed } from 'vue';
  import { RouterLink } from 'vue-router';

  import BaseTypography from '../BaseTypography/BaseTypography.vue';

  export type MenuItemVariant = 'default' | 'danger';

  const props = withDefaults(
    defineProps<{
      label?: string;
      disabled?: boolean;
      variant?: MenuItemVariant;
      icon?: string;
      active?: boolean;
      href?: string;
      to?: string | Record<string, unknown>;
    }>(),
    {
      label: undefined,
      disabled: false,
      variant: 'default',
      icon: undefined,
      active: false,
      href: undefined,
      to: undefined,
    },
  );

  const emit = defineEmits<{
    click: [event: MouseEvent];
  }>();

  const isLink = computed(() => !props.disabled && (!!props.to || !!props.href));

  function handleClick(event: MouseEvent) {
    emit('click', event);
  }
</script>

<template>
  <li
    :class="[
      'base-menu-item',
      `base-menu-item--${variant}`,
      { 'base-menu-item--disabled': disabled, 'base-menu-item--active': active },
    ]"
    role="none"
  >
    <RouterLink
      v-if="isLink && to"
      :tabindex="disabled ? -1 : 0"
      :to="to"
      class="base-menu-item__link"
      role="menuitem"
    >
      <slot name="icon" />
      <slot>
        <BaseTypography
          as="span"
          color="inherit"
          variant="body-sm"
        >
          {{ label }}
        </BaseTypography>
      </slot>
    </RouterLink>
    <a
      v-else-if="isLink && href"
      :href="href"
      :tabindex="disabled ? -1 : 0"
      class="base-menu-item__link"
      role="menuitem"
    >
      <slot name="icon" />
      <slot>
        <BaseTypography
          as="span"
          color="inherit"
          variant="body-sm"
        >
          {{ label }}
        </BaseTypography>
      </slot>
    </a>
    <span
      v-else
      :aria-disabled="disabled ? 'true' : undefined"
      :tabindex="0"
      class="base-menu-item__button"
      role="menuitem"
      @click="!disabled && handleClick($event)"
      @keydown.enter.prevent="!disabled && handleClick($event as unknown as MouseEvent)"
      @keydown.space.prevent="!disabled && handleClick($event as unknown as MouseEvent)"
    >
      <slot name="icon" />
      <slot>
        <BaseTypography
          as="span"
          color="inherit"
          variant="body-sm"
        >
          {{ label }}
        </BaseTypography>
      </slot>
    </span>
  </li>
</template>

<style lang="scss" scoped>
  .base-menu-item {
    list-style: none;

    &__link,
    &__button {
      display: flex;
      align-items: center;
      gap: var(--mp-spacing-2);
      width: 100%;
      padding: var(--mp-spacing-2) var(--mp-spacing-3);
      font-family: var(--mp-font-family-sans);
      cursor: pointer;
      border-radius: var(--mp-radius-sm);
      user-select: none;
      white-space: nowrap;
      text-decoration: none;
      color: inherit;
      transition:
        background-color 100ms ease,
        color 100ms ease;
    }

    &__link:hover,
    &__button:hover {
      background-color: var(--mp-color-bg-muted);
    }

    &__link:focus-visible,
    &__button:focus-visible {
      outline: none;
      box-shadow: var(--mp-shadow-focus-primary);
    }

    &--active > &__link,
    &--active > &__button {
      background-color: var(--mp-color-primary-muted);
      color: var(--mp-color-primary-text);
    }

    &--danger > &__link,
    &--danger > &__button {
      color: var(--mp-color-danger-text);

      &:hover {
        background-color: var(--mp-color-danger-subtle);
      }
    }

    &--disabled > &__link,
    &--disabled > &__button {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }
  }
</style>
