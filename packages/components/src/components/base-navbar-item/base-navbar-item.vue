<script lang="ts" setup>
  /**
   * `BaseNavbarItem` — Navbar item component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { IconChevron } from '@mission-platform/icons';
  import { computed, ref } from 'vue';
  import { RouterLink } from 'vue-router';

  import BaseDropdown from '../base-dropdown/base-dropdown.vue';

  export type NavbarItemVariant = 'default' | 'primary';

  export interface NavbarItemChild {
    label: string;
    href?: string;
    to?: string | Record<string, unknown>;
    disabled?: boolean;
    icon?: string;
    onClick?: () => void;
  }

  const props = withDefaults(
    defineProps<{
      label?: string;
      href?: string;
      to?: string | Record<string, unknown>;
      disabled?: boolean;
      active?: boolean;
      variant?: NavbarItemVariant;
      children?: NavbarItemChild[];
    }>(),
    {
      label: undefined,
      href: undefined,
      to: undefined,
      disabled: false,
      active: false,
      variant: 'default',
      children: undefined,
    },
  );

  const emit = defineEmits<{
    click: [event: MouseEvent];
  }>();

  const tag = computed(() => {
    if (props.to && !props.disabled) return RouterLink;
    if (props.href) return 'a';
    return 'button';
  });
  const hasChildren = computed(() => !!props.children && props.children.length > 0);
  const dropdownOpen = ref(false);

  function handleClick(event: MouseEvent) {
    if (props.disabled) return;
    if (hasChildren.value) {
      dropdownOpen.value = !dropdownOpen.value;
      return;
    }
    emit('click', event);
  }

  function handleChildClick(child: NavbarItemChild) {
    if (child.disabled) return;
    dropdownOpen.value = false;
    if (child.onClick) child.onClick();
  }
</script>

<template>
  <!-- Dropdown variant -->
  <BaseDropdown
    v-if="hasChildren"
    v-model:open="dropdownOpen"
    :match-trigger-width="false"
    class="base-navbar-item-dropdown-host"
    max-height="320px"
    placement="bottom-start"
  >
    <template #trigger>
      <button
        :aria-current="active ? 'page' : undefined"
        :aria-disabled="disabled ? 'true' : undefined"
        :aria-expanded="dropdownOpen"
        :aria-haspopup="true"
        :class="[
          'base-navbar-item',
          `base-navbar-item--${variant}`,
          {
            'base-navbar-item--active': active,
            'base-navbar-item--disabled': disabled,
            'base-navbar-item--open': dropdownOpen,
          },
        ]"
        :disabled="disabled || undefined"
        type="button"
        @click="handleClick"
      >
        <slot name="icon" />
        <slot>{{ label }}</slot>
        <IconChevron
          :direction="dropdownOpen ? 'up' : 'down'"
          class="base-navbar-item__chevron"
          size="sm"
        />
      </button>
    </template>

    <!-- Dropdown panel -->
    <ul
      class="base-navbar-item__dropdown-list"
      role="menu"
    >
      <li
        v-for="(child, i) in children"
        :key="i"
        class="base-navbar-item__dropdown-item-wrapper"
        role="none"
      >
        <RouterLink
          v-if="child.to && !child.disabled"
          :to="child.to"
          class="base-navbar-item__dropdown-item"
          role="menuitem"
          @click="dropdownOpen = false"
        >
          <span
            v-if="child.icon"
            aria-hidden="true"
            class="base-navbar-item__dropdown-icon"
          >
            {{ child.icon }}
          </span>
          <span>{{ child.label }}</span>
        </RouterLink>
        <a
          v-else-if="child.href && !child.disabled"
          :href="child.href"
          class="base-navbar-item__dropdown-item"
          role="menuitem"
          @click="dropdownOpen = false"
        >
          <span
            v-if="child.icon"
            aria-hidden="true"
            class="base-navbar-item__dropdown-icon"
          >
            {{ child.icon }}
          </span>
          <span>{{ child.label }}</span>
        </a>
        <button
          v-else
          :aria-disabled="child.disabled ? 'true' : undefined"
          :class="{ 'base-navbar-item__dropdown-item--disabled': child.disabled }"
          :disabled="child.disabled || undefined"
          class="base-navbar-item__dropdown-item"
          role="menuitem"
          type="button"
          @click="handleChildClick(child)"
        >
          <span
            v-if="child.icon"
            aria-hidden="true"
            class="base-navbar-item__dropdown-icon"
          >
            {{ child.icon }}
          </span>
          <span>{{ child.label }}</span>
        </button>
      </li>
    </ul>
  </BaseDropdown>

  <!-- Plain item (no children) -->
  <component
    :is="tag"
    v-else
    :aria-current="active ? 'page' : undefined"
    :aria-disabled="disabled ? 'true' : undefined"
    :class="[
      'base-navbar-item',
      `base-navbar-item--${variant}`,
      { 'base-navbar-item--active': active, 'base-navbar-item--disabled': disabled },
    ]"
    :disabled="tag === 'button' ? disabled || undefined : undefined"
    :href="tag === 'a' ? (disabled ? undefined : href) : undefined"
    :tabindex="disabled ? -1 : undefined"
    :to="tag === RouterLink ? to : undefined"
    :type="tag === 'button' ? 'button' : undefined"
    @click="handleClick"
  >
    <slot name="icon" />
    <slot>{{ label }}</slot>
  </component>
</template>

<style lang="scss" scoped>
  @use '@mission-platform/tokens/scss/mixins' as mp;

  .base-navbar-item-dropdown-host {
    display: inline-flex;
  }

  .base-navbar-item {
    @include mp.mp-font-label;

    display: inline-flex;
    align-items: center;
    gap: var(--mp-spacing-2);
    padding: var(--mp-spacing-1-5) var(--mp-spacing-3);
    border-radius: var(--mp-radius-md);
    color: var(--mp-color-text-secondary);
    background: none;
    border: none;
    cursor: pointer;
    text-decoration: none;
    white-space: nowrap;
    user-select: none;
    transition:
      background-color 150ms ease,
      color 150ms ease;

    &:focus-visible {
      outline: none;
      box-shadow: var(--mp-shadow-focus-primary);
    }

    &--active {
      background-color: var(--mp-color-primary-muted);
      color: var(--mp-color-primary-text);
    }

    &--open {
      background-color: var(--mp-color-bg-subtle);
      color: var(--mp-color-text-primary);
    }

    &--primary {
      color: var(--mp-color-primary-text);

      &:hover:not(.base-navbar-item--disabled) {
        background-color: var(--mp-color-primary-muted);
      }
    }

    &--disabled {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }

    &:hover:not(&--disabled) {
      background-color: var(--mp-color-bg-subtle);
      color: var(--mp-color-text-primary);
    }

    &__chevron {
      flex-shrink: 0;
      color: var(--mp-color-text-secondary);
      transition: transform 150ms ease;
    }
  }

  .base-navbar-item__dropdown-list {
    list-style: none;
    margin: 0;
    padding: var(--mp-spacing-1) 0;
    min-width: 180px;
  }

  .base-navbar-item__dropdown-item-wrapper {
    display: block;
  }

  .base-navbar-item__dropdown-item {
    @include mp.mp-font-label;

    display: flex;
    align-items: center;
    gap: var(--mp-spacing-2);
    width: 100%;
    padding: var(--mp-spacing-2) var(--mp-spacing-4);
    color: var(--mp-color-text-primary);
    background: none;
    border: none;
    cursor: pointer;
    text-decoration: none;
    text-align: left;
    white-space: nowrap;
    transition:
      background-color 150ms ease,
      color 150ms ease;

    &:focus-visible {
      outline: none;
      box-shadow: var(--mp-shadow-focus-primary);
    }

    &--disabled {
      color: var(--mp-color-text-disabled);
      cursor: not-allowed;
      pointer-events: none;
    }

    &:hover:not(&--disabled) {
      background-color: var(--mp-color-bg-subtle);
    }
  }

  .base-navbar-item__dropdown-icon {
    flex-shrink: 0;
    font-size: var(--mp-font-size-base);
  }
</style>
