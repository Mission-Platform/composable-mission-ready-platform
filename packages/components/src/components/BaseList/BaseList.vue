<script lang="ts" setup>
  import BaseTypography from '../BaseTypography/BaseTypography.vue';

  export type ListVariant = 'unordered' | 'ordered' | 'description' | 'none';
  export type ListSize = 'sm' | 'md' | 'lg';

  export interface ListItem {
    label?: string;
    description?: string;
    term?: string;
    content?: string;
  }

  withDefaults(
    defineProps<{
      items?: ListItem[];
      variant?: ListVariant;
      size?: ListSize;
      divided?: boolean;
    }>(),
    {
      items: () => [],
      variant: 'unordered',
      size: 'md',
      divided: false,
    },
  );
</script>

<template>
  <dl
    v-if="variant === 'description'"
    :class="['base-list', 'base-list--description', `base-list--${size}`, { 'base-list--divided': divided }]"
  >
    <template
      v-for="(item, index) in items"
      :key="index"
    >
      <slot
        :index="index"
        :item="item"
        name="item"
      >
        <dt class="base-list__term">
          <BaseTypography
            as="span"
            color="primary"
            variant="body-md"
            weight="semibold"
          >
            {{ item.term ?? item.label }}
          </BaseTypography>
        </dt>
        <dd class="base-list__detail">
          <BaseTypography
            as="span"
            color="secondary"
            variant="body-md"
          >
            {{ item.content ?? item.description }}
          </BaseTypography>
        </dd>
      </slot>
    </template>
    <slot />
  </dl>

  <ol
    v-else-if="variant === 'ordered'"
    :class="['base-list', 'base-list--ordered', `base-list--${size}`, { 'base-list--divided': divided }]"
  >
    <template
      v-for="(item, index) in items"
      :key="index"
    >
      <slot
        :index="index"
        :item="item"
        name="item"
      >
        <li class="base-list__item">
          <BaseTypography
            as="span"
            color="primary"
            variant="body-md"
          >
            {{ item.label }}
          </BaseTypography>
        </li>
      </slot>
    </template>
    <slot />
  </ol>

  <ul
    v-else-if="variant === 'none'"
    :class="['base-list', 'base-list--none', `base-list--${size}`, { 'base-list--divided': divided }]"
  >
    <template
      v-for="(item, index) in items"
      :key="index"
    >
      <slot
        :index="index"
        :item="item"
        name="item"
      >
        <li class="base-list__item">
          <BaseTypography
            as="span"
            color="primary"
            variant="body-md"
          >
            {{ item.label }}
          </BaseTypography>
        </li>
      </slot>
    </template>
    <slot />
  </ul>

  <ul
    v-else
    :class="['base-list', 'base-list--unordered', `base-list--${size}`, { 'base-list--divided': divided }]"
  >
    <template
      v-for="(item, index) in items"
      :key="index"
    >
      <slot
        :index="index"
        :item="item"
        name="item"
      >
        <li class="base-list__item">
          <BaseTypography
            as="span"
            color="primary"
            variant="body-md"
          >
            {{ item.label }}
          </BaseTypography>
        </li>
      </slot>
    </template>
    <slot />
  </ul>
</template>

<style lang="scss" scoped>
  .base-list {
    margin: 0;

    &__item {
      line-height: var(--mp-line-height-normal);

      .base-list--divided & + & {
        border-top: 1px solid var(--mp-color-border-default);
      }
    }

    /* Variants */
    &--unordered,
    &--ordered {
      padding-left: var(--mp-spacing-6);
    }

    &--none {
      list-style: none;
      padding: 0;

      .base-list__item {
        padding: 0;
      }
    }

    &--description {
      display: grid;
      grid-template-columns: max-content 1fr;
      padding: 0;
    }

    /* Sizes */
    &--sm {
      font-size: var(--mp-font-size-sm);

      .base-list__item,
      .base-list__term,
      .base-list__detail {
        padding: var(--mp-spacing-1) 0;
      }
    }

    &--md {
      font-size: var(--mp-font-size-md);

      .base-list__item,
      .base-list__term,
      .base-list__detail {
        padding: var(--mp-spacing-2) 0;
      }
    }

    &--lg {
      font-size: var(--mp-font-size-lg);

      .base-list__item,
      .base-list__term,
      .base-list__detail {
        padding: var(--mp-spacing-3) 0;
      }
    }

    /* Divided */
    &--divided {
      &.base-list--none .base-list__item + .base-list__item,
      &.base-list--unordered .base-list__item + .base-list__item,
      &.base-list--ordered .base-list__item + .base-list__item {
        border-top: 1px solid var(--mp-color-border-default);
      }
    }

    &__term {
      padding-right: var(--mp-spacing-6);
    }

    &__detail {
      margin: 0;
    }
  }
</style>
