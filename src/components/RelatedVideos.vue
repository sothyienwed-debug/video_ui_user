<script setup>
import { formatNumber, getThumbnailUrl } from '../services/api'

defineProps({
  videos: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['select'])
</script>

<template>
  <section class="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-[0_18px_70px_rgba(0,0,0,0.26)] backdrop-blur-xl">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-black text-white">Related Anime</h2>
        <p class="mt-1 text-sm font-semibold text-slate-400">More episodes and series from the same mood.</p>
      </div>
    </div>

    <div v-if="loading" class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <div v-for="item in 5" :key="item" class="space-y-3">
        <div class="aspect-video animate-pulse rounded-xl bg-white/10"></div>
        <div class="h-3 w-4/5 animate-pulse rounded-full bg-white/10"></div>
      </div>
    </div>

    <div v-else-if="!videos.length" class="mt-5 rounded-xl border border-white/10 bg-black/20 px-4 py-6 text-sm font-bold text-slate-400">
      No related anime found.
    </div>

    <div v-else class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <article v-for="video in videos" :key="video.id" class="group min-w-0">
        <button type="button" class="block w-full text-left" @click="emit('select', video)">
          <span class="relative block overflow-hidden rounded-xl border border-white/10 bg-black">
            <img
              :src="getThumbnailUrl(video)"
              :alt="video.title"
              loading="lazy"
              decoding="async"
              class="aspect-video w-full object-cover transition duration-300 group-hover:scale-105"
              @error="$event.currentTarget.src = '/placeholder.jpg'"
            />
            <span class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></span>
            <span class="absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-1 text-[11px] font-black text-white backdrop-blur">
              EP {{ video.episode || 1 }}
            </span>
          </span>
          <span class="mt-3 block truncate text-sm font-black text-white">{{ video.title }}</span>
          <span class="mt-1 block text-xs font-bold text-slate-400">
            {{ formatNumber(video.views) }} views
          </span>
        </button>
      </article>
    </div>
  </section>
</template>
