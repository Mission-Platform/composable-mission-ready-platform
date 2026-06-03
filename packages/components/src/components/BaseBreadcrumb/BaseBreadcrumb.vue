<script setup lang="ts">
  import { RouterLink } from 'vue-router'
  import BaseTypography from '../BaseTypography/BaseTypography.vue'

  export interface BreadcrumbItem {
    label: string
    href?: string
    to?: string | Record<string, unknown>
  }

  withDefaults(
    defineProps<{
      items: BreadcrumbItem[]
      separator?: string
    }>(),
    {
      separator: '/',
    },
  )
</script>

<template>
  <nav class="base-breadcrumb" aria-label="Breadcrumb">
    <ol class="base-breadcrumb__list">
      <li
        v-for="(item, index) in items"
        :key="index"
        class="base-breadcrumb__item"
      >
        <span
          v-if="index > 0"
          class="base-breadcrumb__separator"
          aria-hidden="true"
        >{{ separator }}</span>
        <RouterLink
          v-if="item.to && index < items.length - 1"
          :to="item.to"
          class="base-breadcrumb__link"
        >{{ item.label }}</RouterLink>
        <BaseTypography
          v-else-if="item.href && index < items.length - 1"
          variant="body-sm"
          as="a"
          color="secondary"
          :href="item.href"
          class="base-breadcrumb__link"
        >{{ item.label }}</BaseTypography>
        <BaseTypography
          v-else
          variant="body-sm"
          weight="medium"
          as="span"
          color="secondary"
          class="base-breadcrumb__current"
          :aria-current="index === items.length - 1 ? 'page' : undefined"
        >{{ item.label }}</BaseTypography>
      </li>
    </ol>
  </nav>
</template>

<style scoped lang="scss">
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
      // typography handled by BaseTypography
    }
  }
</style>
