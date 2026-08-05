<script setup lang="ts">
  import { navGroups, titleForSlug } from '../documentation';

  // Emitted whenever a page link is activated, so a host that renders this
  // sidebar inside the navbar's mobile menu can dismiss the menu (a no-op for
  // the persistent desktop column).
  const emit = defineEmits<{ navigate: [] }>();
</script>

<template>
  <nav
    class="sidebar"
    aria-label="Documentation"
  >
    <ul class="sidebar__groups">
      <li
        v-for="group in navGroups"
        :key="group.label"
        class="sidebar__group"
      >
        <p class="sidebar__group-label">{{ group.label }}</p>
        <ul class="sidebar__links">
          <li
            v-for="slug in group.items"
            :key="slug"
          >
            <RouterLink
              class="sidebar__link"
              :to="`/${slug}`"
              active-class="sidebar__link--active"
              @click="emit('navigate')"
            >
              {{ titleForSlug(slug) }}
            </RouterLink>
          </li>
        </ul>
      </li>
    </ul>
  </nav>
</template>

<style scoped lang="scss">
  .sidebar {
    padding: 24px 16px 48px;
  }

  .sidebar__groups {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .sidebar__group + .sidebar__group {
    margin-top: 24px;
  }

  .sidebar__group-label {
    margin: 0 0 8px;
    padding: 0 8px;
    font-size: var(--mp-font-size-xs, 0.75rem);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--mp-color-text-tertiary, #6b7280);
  }

  .sidebar__links {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .sidebar__link {
    display: block;
    padding: 6px 8px;
    border-radius: var(--mp-radius-md, 8px);
    color: var(--mp-color-text-secondary, #374151);
    text-decoration: none;
    font-size: var(--mp-font-size-sm, 0.9rem);
    line-height: 1.4;
  }

  .sidebar__link:hover {
    background: var(--mp-color-bg-subtle, #f1f5f9);
    color: var(--mp-color-text-primary, #111827);
  }

  .sidebar__link--active {
    background: var(--mp-color-primary-muted, rgb(74 158 190 / 12%));
    color: var(--mp-color-primary-text, #4a9ebe);
    font-weight: 600;
  }
</style>
