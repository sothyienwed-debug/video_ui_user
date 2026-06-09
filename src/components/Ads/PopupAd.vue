<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  variant: {
    type: String,
    default: 'session',
  },
  skipDelay: {
    type: Number,
    default: 5,
  },
  adUrl: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['close'])

const countdown = ref(0)
let timer = null

const title = computed(() => (props.variant === 'episode' ? 'A short sponsor break' : 'Welcome to tonight stream'))
const description = computed(() =>
  props.variant === 'episode'
    ? 'The next episode will be ready after this quick sponsor card.'
    : 'Support the platform and keep your anime queue running smoothly.',
)
const canSkip = computed(() => countdown.value <= 0)

const clearTimer = () => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

const startCountdown = () => {
  clearTimer()
  countdown.value = Math.max(Number(props.skipDelay) || 0, 0)

  if (!props.visible || countdown.value <= 0) return

  timer = window.setInterval(() => {
    countdown.value -= 1

    if (countdown.value <= 0) {
      clearTimer()
    }
  }, 1000)
}

const close = () => {
  if (!canSkip.value) return

  emit('close')
}

watch(
  () => props.visible,
  (isVisible) => {
    if (isVisible) {
      startCountdown()
    } else {
      clearTimer()
    }
  },
  { immediate: true },
)

onBeforeUnmount(clearTimer)
</script>

<template>
  <div v-if="visible" class="fixed inset-0 z-[70] grid place-items-center bg-black/75 px-4 backdrop-blur-sm">
    <section class="w-full max-w-md overflow-hidden rounded-2xl border border-fuchsia-300/25 bg-[#11111f] shadow-[0_28px_110px_rgba(0,0,0,0.65)]">
      <div class="bg-gradient-to-r from-fuchsia-500 via-pink-500 to-cyan-400 p-1"></div>
      <div class="p-5 sm:p-6">
        <p class="text-xs font-black uppercase tracking-[0.2em] text-cyan-100">Advertisement</p>
        <h2 class="mt-3 text-2xl font-black leading-tight text-white">{{ title }}</h2>
        <p class="mt-3 text-sm font-semibold leading-6 text-slate-300">{{ description }}</p>

        <a
          :href="adUrl || '#'"
          target="_blank"
          rel="noopener"
          class="mt-5 block rounded-2xl border border-white/10 bg-white/[0.07] p-4 transition hover:bg-white/[0.1]"
        >
          <span class="block text-lg font-black text-white">Featured anime sponsor</span>
          <span class="mt-1 block text-sm font-semibold text-slate-400">Open the offer in a new tab.</span>
        </a>

        <div class="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            :disabled="!canSkip"
            class="rounded-xl border border-white/10 px-4 py-2 text-sm font-black text-white transition enabled:bg-white/10 enabled:hover:bg-fuchsia-500/20 disabled:cursor-not-allowed disabled:opacity-45"
            @click="close"
          >
            {{ canSkip ? 'Continue' : `Skip in ${countdown}s` }}
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
