<script setup>
import { ref } from 'vue'
import { formatNumber } from '../services/api'

defineProps({
  stats: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['like', 'dislike', 'favorite', 'share', 'report'])

const showReportMenu = ref(false)

const reportReasons = [
  { key: 'broken', label: 'Broken video' },
  { key: 'copyright', label: 'Copyright issue' },
  { key: 'spam', label: 'Spam or abuse' },
]

const submitReport = (reason) => {
  showReportMenu.value = false
  emit('report', reason)
}
</script>

<template>
  <section class="rounded-2xl border border-white/10 bg-white/[0.055] p-3 shadow-[0_18px_70px_rgba(0,0,0,0.26)] backdrop-blur-xl sm:p-4">
    <div class="flex flex-wrap items-center gap-2">
      <button
        type="button"
        :class="[
          stats.liked ? 'border-fuchsia-300/40 bg-fuchsia-500/20 text-fuchsia-100' : 'border-white/10 bg-black/20 text-slate-100 hover:bg-white/10',
          'action-button',
        ]"
        @click="emit('like')"
      >
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none">
          <path d="M7 11v10H4.5A1.5 1.5 0 0 1 3 19.5v-8A1.5 1.5 0 0 1 4.5 10H7Zm0 1 4.8-8.1A2 2 0 0 1 15.5 5v4H20a2 2 0 0 1 2 2.3l-1.1 7A3 3 0 0 1 18 21H7V12Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
        </svg>
        <span>Like</span>
        <span class="text-slate-400">{{ formatNumber(stats.likes) }}</span>
      </button>

      <button
        type="button"
        :class="[
          stats.disliked ? 'border-rose-300/40 bg-rose-500/20 text-rose-100' : 'border-white/10 bg-black/20 text-slate-100 hover:bg-white/10',
          'action-button',
        ]"
        @click="emit('dislike')"
      >
        <svg class="h-4 w-4 rotate-180" viewBox="0 0 24 24" fill="none">
          <path d="M7 11v10H4.5A1.5 1.5 0 0 1 3 19.5v-8A1.5 1.5 0 0 1 4.5 10H7Zm0 1 4.8-8.1A2 2 0 0 1 15.5 5v4H20a2 2 0 0 1 2 2.3l-1.1 7A3 3 0 0 1 18 21H7V12Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
        </svg>
        <span>Dislike</span>
        <span class="text-slate-400">{{ formatNumber(stats.dislikes) }}</span>
      </button>

      <button
        type="button"
        :class="[
          stats.favorited ? 'border-amber-300/40 bg-amber-400/20 text-amber-100' : 'border-white/10 bg-black/20 text-slate-100 hover:bg-white/10',
          'action-button',
        ]"
        @click="emit('favorite')"
      >
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none">
          <path d="m12 3.8 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.2-4.1 5.8-.8L12 3.8Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
        </svg>
        <span>Favorite</span>
      </button>

      <button type="button" class="action-button border-white/10 bg-black/20 text-slate-100 hover:bg-white/10" @click="emit('share')">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none">
          <path d="M8.5 13.5 15.5 17M15.5 7 8.5 10.5M7 14.5a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm10 4a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm0-11a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        <span>Share</span>
      </button>

      <div class="relative">
        <button
          type="button"
          :class="[
            showReportMenu ? 'border-rose-300/40 bg-rose-500/20 text-rose-100' : 'border-white/10 bg-black/20 text-slate-100 hover:bg-white/10',
            'action-button',
          ]"
          @click="showReportMenu = !showReportMenu"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none">
            <path d="M12 9v5M12 18h.01M10.3 4.5 2.8 18a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.5a2 2 0 0 0-3.4 0Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span>Report</span>
        </button>

        <div
          v-if="showReportMenu"
          class="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#151522] p-2 shadow-[0_22px_70px_rgba(0,0,0,0.5)]"
        >
          <button
            v-for="reason in reportReasons"
            :key="reason.key"
            type="button"
            class="block w-full rounded-xl px-3 py-2 text-left text-sm font-black text-slate-200 transition hover:bg-rose-500/15 hover:text-rose-100"
            @click="submitReport(reason.key)"
          >
            {{ reason.label }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
