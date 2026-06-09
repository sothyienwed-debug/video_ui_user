<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  videoId: {
    type: [Number, String],
    default: '',
  },
  adUrl: {
    type: String,
    default: '',
  },
})

const visible = ref(false)
let showTimer = null
let hideTimer = null

const clearTimers = () => {
  if (showTimer) clearTimeout(showTimer)
  if (hideTimer) clearTimeout(hideTimer)
  showTimer = null
  hideTimer = null
}

const schedule = () => {
  clearTimers()
  visible.value = false

  if (!props.videoId) return

  showTimer = window.setTimeout(() => {
    visible.value = true
    hideTimer = window.setTimeout(() => {
      visible.value = false
    }, 15000)
  }, 15000)
}

const close = () => {
  visible.value = false
  clearTimers()
}

watch(
  () => props.videoId,
  schedule,
  { immediate: true },
)

onBeforeUnmount(clearTimers)
</script>

<template>
  <aside
    v-if="visible"
    class="fixed bottom-5 right-4 z-50 w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-fuchsia-300/25 bg-[#12121f]/95 p-3 shadow-[0_24px_80px_rgba(0,0,0,0.58)] backdrop-blur-xl sm:right-5"
  >
    <button
      type="button"
      class="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/45 text-sm font-black text-white transition hover:bg-white/15"
      aria-label="Close overlay advertisement"
      @click="close"
    >
      x
    </button>

    <a :href="adUrl || '#'" target="_blank" rel="noopener" class="block rounded-xl bg-gradient-to-br from-fuchsia-500/25 via-cyan-400/10 to-amber-300/15 p-4">
      <p class="text-xs font-black uppercase tracking-[0.18em] text-fuchsia-100">Sponsor</p>
      <h3 class="mt-2 pr-8 text-lg font-black leading-tight text-white">Unlock more anime extras</h3>
      <p class="mt-2 text-sm font-semibold leading-6 text-slate-300">Limited fan deals while this episode plays.</p>
    </a>
  </aside>
</template>
