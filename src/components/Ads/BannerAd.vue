<script setup>
defineProps({
  adUrl: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <a
    :href="adUrl || '#'"
    target="_blank"
    rel="noopener"
    class="mx-auto block aspect-[6/5] w-full max-w-[300px] overflow-hidden rounded-2xl border border-fuchsia-300/20 bg-gradient-to-br from-[#251238] via-[#101828] to-[#2b1334] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.36)] transition hover:-translate-y-0.5 hover:border-fuchsia-300/40"
  >
    <span class="flex h-full flex-col justify-between rounded-xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur">
      <span>
        <span class="inline-flex rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-cyan-100">Sponsored</span>
        <span class="mt-4 block text-2xl font-black leading-tight text-white">Anime Night Picks</span>
        <span class="mt-2 block text-sm font-semibold leading-6 text-slate-300">Premium streaming gear, figures, and fan drops.</span>
      </span>
      <span class="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-500 px-4 py-2 text-sm font-black text-white">
        Open Offer
      </span>
    </span>
  </a>
</template>
