<script lang="ts" setup>
  /**
   * `BaseBreadcrumb` — Breadcrumb component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { RouterLink } from 'vue-router';

  import BaseTypography from '../base-typography/base-typography.vue';

  export interface BreadcrumbItem {
    label: string;
    href?: string;
    to?: string | Record<string, unknown>;
  }

  withDefaults(
    defineProps<{
      items: BreadcrumbItem[];
      separator?: string;
    }>(),
    {
      separator: '/',
    },
  );
</script>

<template>
  <nav
    aria-label="Breadcrumb"
    class="base-breadcrumb"
  >
    <ol class="base-breadcrumb__list">
      <li
        v-for="(item, index) in items"
        :key="index"
        class="base-breadcrumb__item"
      >
        <span
          v-if="index > 0"
          aria-hidden="true"
          class="base-breadcrumb__separator"
        >
          {{ separator }}
        </span>
        <RouterLink
          v-if="item.to && index < items.length - 1"
          :to="item.to"
          class="base-breadcrumb__link"
        >
          {{ item.label }}
        </RouterLink>
        <BaseTypography
          v-else-if="item.href && index < items.length - 1"
          :href="item.href"
          as="a"
          class="base-breadcrumb__link"
          color="secondary"
          variant="body-sm"
        >
          {{ item.label }}
        </BaseTypography>
        <BaseTypography
          v-else
          :aria-current="index === items.length - 1 ? 'page' : undefined"
          as="span"
          class="base-breadcrumb__current"
          color="secondary"
          variant="body-sm"
          weight="medium"
        >
          {{ item.label }}
        </BaseTypography>
      </li>
    </ol>
  </nav>
</template>

<style lang="scss" scoped>
  @layer mp.components {
    .base-breadcrumb {
      &__list {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: var(--mp-spacing-1);
        list-style: none;
        margin: 0;
        padding: 0;
      }

      &__item {
        display: flex;
        align-items: center;
        gap: var(--mp-spacing-1);
      }

      &__separator {
        color: var(--mp-color-text-tertiary);
        user-select: none;
      }

      &__link {
        color: var(--mp-color-text-secondary);
        text-decoration: underline;

        &:hover {
          color: var(--mp-color-text-primary);
        }

        &:focus-visible {
          outline: none;
          border-radius: var(--mp-radius-xs);
          box-shadow: var(--mp-shadow-focus-primary);
        }
      }

      &__current {
        /* typography handled by BaseTypography */
      }
    }
  }
</style>
