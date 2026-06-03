<script setup lang="ts">
  import { computed, type StyleValue } from 'vue'

  export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  export type AvatarShape = 'circle' | 'square'
  export type AvatarStatus = 'online' | 'offline' | 'away' | 'busy' | undefined

  const props = withDefaults(
    defineProps<{
      src?: string
      alt?: string
      initials?: string
      size?: AvatarSize
      shape?: AvatarShape
      status?: AvatarStatus
      color?: string
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
  )

  const sizeMap: Record<AvatarSize, string> = {
    xs: '24px',
    sm: '32px',
    md: '40px',
    lg: '56px',
    xl: '80px',
  }

  const fontSizeMap: Record<AvatarSize, string> = {
    xs: 'var(--mp-font-size-xs)',
    sm: 'var(--mp-font-size-sm)',
    md: 'var(--mp-font-size-md)',
    lg: 'var(--mp-font-size-lg)',
    xl: 'var(--mp-font-size-2xl)',
  }

  const statusSizeMap: Record<AvatarSize, string> = {
    xs: '6px',
    sm: '8px',
    md: '10px',
    lg: '13px',
    xl: '18px',
  }

  const statusColorMap: Record<NonNullable<AvatarStatus>, string> = {
    online: 'var(--mp-color-success-default)',
    offline: 'var(--mp-color-border-default)',
    away: 'var(--mp-color-warning-default)',
    busy: 'var(--mp-color-danger-default)',
  }

  const dimension = computed(() => sizeMap[props.size])
  const fontSize = computed(() => fontSizeMap[props.size])
  const statusSize = computed(() => statusSizeMap[props.size])
  const statusColor = computed(() => (props.status ? statusColorMap[props.status] : undefined))

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
  }))
</script>

<template>
  <div class="avatar" style="position: relative; display: inline-flex">
    <div :style="[avatarStyle]" :class="['avatar__image', `avatar--${size}`, `avatar--${shape}`]">
      <img v-if="src" :src="src" :alt="alt" style="width: 100%; height: 100%; object-fit: cover" />
      <span v-else-if="initials" class="avatar__initials">{{ initials }}</span>
      <slot v-else />
    </div>
    <span
      v-if="status"
      class="avatar__status"
      role="status"
      aria-atomic="false"
      aria-live="off"
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
    />
  </div>
</template>
