<script lang="ts" setup>
  /**
   * `BaseList` — List component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import BaseTypography from '../base-typography/base-typography.vue';

  export type ListVariant = 'unordered' | 'ordered' | 'description' | 'none';
  export type ListSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

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
  @layer mp.components {
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

      /* Sizes — canonical 2xs → 2xl scale driven by the shared size tokens. */
      @each $size in '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl' {
        &--#{$size} {
          font-size: var(--mp-size-font-#{$size});

          .base-list__item,
          .base-list__term,
          .base-list__detail {
            padding: var(--mp-size-pad-block-#{$size}) 0;
          }
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
  }
</style>
