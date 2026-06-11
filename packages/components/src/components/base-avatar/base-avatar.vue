<script lang="ts" setup>
  /**
   * `BaseAvatar` — Avatar component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { computed, type StyleValue } from 'vue';

  export type AvatarSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  export type AvatarShape = 'circle' | 'square';
  export type AvatarStatus = 'online' | 'offline' | 'away' | 'busy' | undefined;

  const props = withDefaults(
    defineProps<{
      src?: string;
      alt?: string;
      initials?: string;
      size?: AvatarSize;
      shape?: AvatarShape;
      status?: AvatarStatus;
      color?: string;
    }>(),
    {
      src: undefined,
      alt: '',
      initials: undefined,
      size: 'md',
      shape: 'circle',
      status: undefined,
      color: undefined,
    },
  );

  const sizeMap: Record<AvatarSize, string> = {
    '2xs': '20px',
    xs: '24px',
    sm: '32px',
    md: '40px',
    lg: '56px',
    xl: '80px',
    '2xl': '96px',
  };

  const fontSizeMap: Record<AvatarSize, string> = {
    '2xs': 'var(--mp-size-font-2xs)',
    xs: 'var(--mp-size-font-xs)',
    sm: 'var(--mp-size-font-sm)',
    md: 'var(--mp-size-font-md)',
    lg: 'var(--mp-size-font-lg)',
    xl: 'var(--mp-size-font-xl)',
    '2xl': 'var(--mp-size-font-2xl)',
  };

  const statusSizeMap: Record<AvatarSize, string> = {
    '2xs': '5px',
    xs: '6px',
    sm: '8px',
    md: '10px',
    lg: '13px',
    xl: '18px',
    '2xl': '22px',
  };

  const statusColorMap: Record<NonNullable<AvatarStatus>, string> = {
    online: 'var(--mp-color-success-default)',
    offline: 'var(--mp-color-border-default)',
    away: 'var(--mp-color-warning-default)',
    busy: 'var(--mp-color-danger-default)',
  };

  const dimension = computed(() => sizeMap[props.size]);
  const fontSize = computed(() => fontSizeMap[props.size]);
  const statusSize = computed(() => statusSizeMap[props.size]);
  const statusColor = computed(() => (props.status ? statusColorMap[props.status] : undefined));

  const avatarStyle = computed<StyleValue>(() => ({
    width: dimension.value,
    height: dimension.value,
    borderRadius: props.shape === 'circle' ? '50%' : 'var(--mp-radius-md)',
    backgroundColor: props.src ? undefined : (props.color ?? 'var(--mp-color-primary-default)'),
    fontSize: fontSize.value,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: '0',
    color: 'var(--mp-color-text-on-primary)',
    fontWeight: 'var(--mp-font-weight-semibold)',
    fontFamily: 'var(--mp-font-family-sans)',
    userSelect: 'none',
  }));
</script>

<template>
  <div
    class="avatar"
    style="position: relative; display: inline-flex"
  >
    <div
      :class="['avatar__image', `avatar--${size}`, `avatar--${shape}`]"
      :style="[avatarStyle]"
    >
      <img
        v-if="src"
        :alt="alt"
        :src="src"
        style="width: 100%; height: 100%; object-fit: cover"
      />
      <span
        v-else-if="initials"
        class="avatar__initials"
      >
        {{ initials }}
      </span>
      <slot v-else />
    </div>
    <span
      v-if="status"
      :aria-label="status"
      :style="{
        position: 'absolute',
        bottom: '0',
        right: '0',
        width: statusSize,
        height: statusSize,
        borderRadius: '50%',
        backgroundColor: statusColor,
        border: '2px solid var(--mp-color-bg-surface)',
        display: 'block',
      }"
      aria-atomic="false"
      aria-live="off"
      class="avatar__status"
      role="status"
    />
  </div>
</template>
