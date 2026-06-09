<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  episodes: {
    type: Array,
    default: () => [],
  },
  activeId: {
    type: [Number, String],
    default: '',
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['select'])

const scrollerRef = ref(null)
const scrollTop = ref(0)
const viewportHeight = ref(400)
const columns = ref(3)
const rowHeight = 64
const bufferRows = 3

const rows = computed(() => {
  const result = []

  for (let index = 0; index < props.episodes.length; index += columns.value) {
    result.push(props.episodes.slice(index, index + columns.value))
  }

  return result
})

const startRow = computed(() => Math.max(Math.floor(scrollTop.value / rowHeight) - bufferRows, 0))
const visibleRowCount = computed(() => Math.ceil(viewportHeight.value / rowHeight) + bufferRows * 2)
const endRow = computed(() => Math.min(startRow.value + visibleRowCount.value, rows.value.length))
const visibleRows = computed(() => rows.value.slice(startRow.value, endRow.value))
const topPadding = computed(() => startRow.value * rowHeight)
const bottomPadding = computed(() => Math.max((rows.value.length - endRow.value) * rowHeight, 0))

const updateColumns = () => {
  if (window.innerWidth >= 1024) {
    columns.value = 3
  } else if (window.innerWidth >= 520) {
    columns.value = 5
  } else {
    columns.value = 4
  }
}

const updateViewport = () => {
  viewportHeight.value = scrollerRef.value?.clientHeight || 400
}

const handleScroll = () => {
  scrollTop.value = scrollerRef.value?.scrollTop || 0
}

const episodeLabel = (episode, index) => {
  const number = episode.episodeNumber || episode.episode || index + 1

  return String(number).padStart(2, '0')
}

onMounted(() => {
  updateColumns()
  updateViewport()
  window.addEventListener('resize', updateColumns)
  window.addEventListener('resize', updateViewport)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateColumns)
  window.removeEventListener('resize', updateViewport)
})
</script>

<template>
  <section class="rounded-2xl border border-white/10 bg-white/[0.055] p-4 shadow-[0_18px_70px_rgba(0,0,0,0.32)] backdrop-blur-xl">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-black text-white">Episodes</h2>
        <p class="mt-1 text-xs font-bold text-slate-400">{{ episodes.length }} available</p>
      </div>
      <span class="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-xs font-black text-cyan-100">HD</span>
    </div>

    <div v-if="loading" class="mt-4 grid grid-cols-3 gap-2">
      <div v-for="item in 15" :key="item" class="h-12 animate-pulse rounded-xl bg-white/10"></div>
    </div>

    <div
      v-else
      ref="scrollerRef"
      class="episode-scroll mt-4 max-h-[420px] overflow-y-auto pr-1"
      @scroll="handleScroll"
    >
      <div :style="{ height: `${topPadding}px` }"></div>

      <div
        v-for="(row, rowIndex) in visibleRows"
        :key="`${startRow + rowIndex}-${columns}`"
        class="grid gap-2 pb-2"
        :style="{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, minHeight: `${rowHeight}px` }"
      >
        <button
          v-for="(episode, index) in row"
          :key="episode.id"
          type="button"
          :class="[
            episode.id === activeId
              ? 'border-fuchsia-300/50 bg-gradient-to-br from-fuchsia-500 to-pink-500 text-white shadow-[0_12px_28px_rgba(217,70,239,0.34)]'
              : episode.watched
                ? 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15'
                : 'border-white/10 bg-black/20 text-slate-200 hover:border-fuchsia-300/30 hover:bg-fuchsia-500/15 hover:text-white',
            'relative h-12 overflow-hidden rounded-xl border text-sm font-black transition duration-200 hover:-translate-y-0.5',
          ]"
          @click="emit('select', episode)"
        >
          <span class="relative z-10">{{ episodeLabel(episode, startRow * columns + rowIndex * columns + index) }}</span>
          <span
            v-if="episode.progressPercent && episode.id !== activeId"
            class="absolute inset-x-0 bottom-0 h-1 bg-cyan-300/70"
            :style="{ width: `${episode.progressPercent}%` }"
          ></span>
        </button>
      </div>

      <div :style="{ height: `${bottomPadding}px` }"></div>
    </div>
  </section>
</template>
