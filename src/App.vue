<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import fightVideo from '../Luffy_vs_Zoro_FULL_FIGHT_One_Piece.f399.mp4'

const navItems = ['Home', 'Trending', 'About', 'Follow']

const episodePages = ['2', '3']
const cardVideos = new Map()
const videoDurations = reactive({})
const videoTimes = reactive({})
const videoPlaybackActive = reactive({})
const watchVideo = ref(null)

const animeList = [
  {
    title: 'Neon Blade Saga',
    views: '9.8K',
    duration: '24:00',
    gradient: 'from-fuchsia-950 via-purple-950 to-indigo-950',
    accent: 'text-fuchsia-200',
  },
  {
    title: 'Moonlit Promise',
    views: '9.5K',
    duration: '12:00',
    gradient: 'from-purple-950 via-fuchsia-950 to-violet-950',
    accent: 'text-pink-100',
  },
  {
    title: 'Arcane Lotus',
    views: '9.7K',
    duration: '18:00',
    gradient: 'from-sky-950 via-cyan-950 to-slate-950',
    accent: 'text-cyan-200',
  },
  {
    title: 'Crimson Hollow',
    views: '9.2K',
    duration: '10:00',
    gradient: 'from-rose-950 via-red-950 to-zinc-950',
    accent: 'text-rose-200',
  },
  {
    title: 'Cafe Comet Club',
    views: '8.9K',
    duration: '26:00',
    gradient: 'from-lime-950 via-green-950 to-stone-950',
    accent: 'text-lime-200',
  },
  {
    title: 'Azure Expedition',
    views: '9.4K',
    duration: '36:00',
    gradient: 'from-cyan-950 via-sky-950 to-slate-950',
    accent: 'text-sky-200',
  },
  {
    title: 'Orbit Nine',
    views: '9.6K',
    duration: '16:00',
    gradient: 'from-slate-950 via-indigo-950 to-black',
    accent: 'text-violet-200',
  },
  {
    title: 'Paper Lantern Rain',
    views: '9.1K',
    duration: '14:00',
    gradient: 'from-pink-950 via-rose-950 to-zinc-950',
    accent: 'text-rose-100',
  },
]

const slugify = (title) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const getWatchHref = (anime) => `/watch/${slugify(anime.title)}`

const formatDuration = (duration) => {
  if (!Number.isFinite(duration) || duration < 0) return ''

  const totalSeconds = Math.floor(duration)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

const getVideoDurationLabel = (anime) => videoDurations[anime.title] || anime.duration

const getVideoTimeLabel = (anime) => {
  const currentTime = videoTimes[anime.title] || 0

  if (videoPlaybackActive[anime.title] || currentTime > 0) {
    return formatDuration(currentTime)
  }

  return getVideoDurationLabel(anime)
}

const saveVideoDuration = (anime, video) => {
  const formattedDuration = formatDuration(video.duration)

  if (formattedDuration) {
    videoDurations[anime.title] = formattedDuration
  }

  videoTimes[anime.title] = video.currentTime || 0
}

const saveVideoTime = (anime, video) => {
  videoTimes[anime.title] = video.currentTime || 0
}

const setVideoPlaybackActive = (anime, isActive) => {
  videoPlaybackActive[anime.title] = isActive
}

const setCardVideo = (title, video) => {
  if (video) {
    cardVideos.set(title, video)
  } else {
    cardVideos.delete(title)
  }
}

const pauseOtherCardVideos = (activeTitle) => {
  cardVideos.forEach((video, title) => {
    if (title !== activeTitle) {
      video.pause()
    }
  })
}

const playCardPreview = async (anime) => {
  const video = cardVideos.get(anime.title)

  if (!video) return

  video.muted = true
  pauseOtherCardVideos(anime.title)
  await video.play().catch(() => {})
}

const pauseCardPreview = (anime) => {
  const video = cardVideos.get(anime.title)

  if (!video) return

  video.pause()
  video.currentTime = 0
  saveVideoTime(anime, video)
  setVideoPlaybackActive(anime, false)
}

const openWatchPage = (anime) => {
  window.open(getWatchHref(anime), '_blank', 'noopener')
}

const currentSlug = window.location.pathname.replace(/^\/watch\/?/, '').replace(/\/$/, '')

const selectedAnime = computed(() =>
  window.location.pathname.startsWith('/watch')
    ? animeList.find((anime) => slugify(anime.title) === currentSlug) || animeList[0]
    : null,
)

onMounted(async () => {
  if (!selectedAnime.value || !watchVideo.value) return

  await watchVideo.value.play().catch(async () => {
    watchVideo.value.muted = true
    await watchVideo.value.play().catch(() => {})
  })
})
</script>

<template>
  <main class="min-h-screen overflow-hidden px-4 py-3 text-white sm:px-8 lg:px-14">
    <section v-if="selectedAnime" class="mx-auto max-w-[1180px]">
      <header
        class="flex min-h-20 flex-col gap-4 rounded-[8px] border border-white/10 bg-[#0e0d19]/85 px-5 py-4 shadow-glow backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6"
      >
        <a href="/" class="flex min-w-0 items-center gap-3">
          <span
            class="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[8px] border border-pink-300/25 bg-gradient-to-br from-fuchsia-500/25 to-cyan-400/15 p-1 shadow-[0_0_24px_rgba(236,72,153,0.35)]"
          >
            <img
              src="/thai%20logo.jpg"
              alt="TeensTH logo"
              class="h-full w-full rounded-[5px] object-contain"
            />
          </span>
          <span class="min-w-0">
            <span class="block text-xl font-black leading-5 tracking-normal">TeensTH</span>
            <span class="block truncate text-[11px] font-semibold text-slate-400">Thailand Anime Streaming</span>
          </span>
        </a>

        <a
          href="/"
          class="inline-flex h-11 items-center justify-center rounded-[7px] bg-white/[0.06] px-5 text-sm font-black text-slate-100 transition hover:bg-white/10"
        >
          Back
        </a>
      </header>

      <section class="py-10 sm:py-12">
        <div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <article>
            <div
              class="relative overflow-hidden rounded-[8px] bg-black shadow-[0_24px_70px_rgba(0,0,0,0.45)]"
            >
              <video
                ref="watchVideo"
                :src="fightVideo"
                class="aspect-video w-full bg-black object-contain"
                autoplay
                controls
                playsinline
                preload="metadata"
                :aria-label="`${selectedAnime.title} video player`"
                @loadedmetadata="saveVideoDuration(selectedAnime, $event.currentTarget)"
                @play="setVideoPlaybackActive(selectedAnime, true)"
                @pause="setVideoPlaybackActive(selectedAnime, false)"
                @timeupdate="saveVideoTime(selectedAnime, $event.currentTarget)"
                @seeked="saveVideoTime(selectedAnime, $event.currentTarget)"
              ></video>
              <span
                class="absolute bottom-4 right-4 min-w-24 rounded-[4px] bg-black/25 px-3 py-1.5 text-center text-xs font-black text-white shadow-[0_0_14px_rgba(0,0,0,0.18)]"
              >
                {{ getVideoTimeLabel(selectedAnime) }}
              </span>
            </div>

            <div class="mt-6">
              <p class="mb-2 text-sm font-black uppercase text-pink-200">Now Watching</p>
              <h1 class="text-3xl font-black leading-tight tracking-normal sm:text-4xl">
                {{ selectedAnime.title }}
              </h1>
              <div class="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p class="text-base font-black text-yellow-400">{{ selectedAnime.views }} views</p>

                <div class="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    class="inline-flex h-10 items-center gap-2 rounded-[7px] bg-white/[0.07] px-3 text-sm font-black text-white transition hover:bg-white/10"
                    aria-label="Like video"
                  >
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M7 10v10H4V10h3Zm3.2 10H17c1.1 0 2-.7 2.3-1.8l1.4-5.1A2.5 2.5 0 0 0 18.3 10H14l.7-3.4c.2-.8-.1-1.7-.7-2.3L13.2 3 8 9v10.1c.6.6 1.4.9 2.2.9Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
                    </svg>
                    Like
                  </button>
                  <button
                    type="button"
                    class="inline-flex h-10 items-center gap-2 rounded-[7px] bg-white/[0.07] px-3 text-sm font-black text-white transition hover:bg-white/10"
                    aria-label="Dislike video"
                  >
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M17 14V4h3v10h-3ZM13.8 4H7C5.9 4 5 4.7 4.7 5.8l-1.4 5.1A2.5 2.5 0 0 0 5.7 14H10l-.7 3.4c-.2.8.1 1.7.7 2.3l.8 1.3L16 15V4.9c-.6-.6-1.4-.9-2.2-.9Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
                    </svg>
                    Dislike
                  </button>
                  <button
                    type="button"
                    class="inline-flex h-10 items-center gap-2 rounded-[7px] bg-white/[0.07] px-3 text-sm font-black text-white transition hover:bg-white/10"
                    aria-label="Comment on video"
                  >
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M5 5h14v10H9l-4 4V5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
                    </svg>
                    Comment
                  </button>
                  <button
                    type="button"
                    class="inline-flex h-10 items-center gap-2 rounded-[7px] bg-white/[0.07] px-3 text-sm font-black text-white transition hover:bg-white/10"
                    aria-label="Share video"
                  >
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M16 5 8 12l8 7V5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
                      <path d="M8 12h13" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                    </svg>
                    Share
                  </button>
                </div>
              </div>
            </div>
          </article>

          <aside class="rounded-[8px] border border-white/10 bg-white/[0.04] p-5">
            <h2 class="text-lg font-black">Episodes</h2>
            <div class="mt-4 grid grid-cols-4 gap-3">
              <a
                v-for="episode in 12"
                :key="episode"
                href="#"
                :class="[
                  episode === 1
                    ? 'bg-gradient-to-br from-fuchsia-500 to-orange-400 shadow-[0_10px_26px_rgba(236,72,153,0.32)]'
                    : 'bg-white/[0.05] text-slate-200 hover:bg-white/10',
                  'grid h-11 place-items-center rounded-[7px] text-sm font-black transition',
                ]"
              >
                {{ episode }}
              </a>
            </div>
          </aside>
        </div>
      </section>
    </section>

    <section v-else class="mx-auto max-w-[1280px]">
      <header
        class="flex min-h-20 flex-col gap-4 rounded-[8px] border border-white/10 bg-[#0e0d19]/85 px-5 py-4 shadow-glow backdrop-blur md:flex-row md:items-center md:justify-between md:px-6"
      >
        <a href="#" class="flex min-w-0 items-center gap-3">
          <span
            class="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[8px] border border-pink-300/25 bg-gradient-to-br from-fuchsia-500/25 to-cyan-400/15 p-1 shadow-[0_0_24px_rgba(236,72,153,0.35)]"
          >
            <img
              src="/thai%20logo.jpg"
              alt="TeensTH logo"
              class="h-full w-full rounded-[5px] object-contain"
            />
          </span>
          <span class="min-w-0">
            <span class="block text-xl font-black leading-5 tracking-normal">TeensTH</span>
            <span class="block truncate text-[11px] font-semibold text-slate-400">Thailand Anime Streaming</span>
          </span>
        </a>

        <nav
          class="order-3 flex w-full items-center justify-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1 text-[12px] font-bold text-slate-300 md:order-none md:w-auto"
          aria-label="Primary navigation"
        >
          <a
            v-for="item in navItems"
            :key="item"
            href="#"
            class="rounded-full px-5 py-2 transition hover:bg-white/10 hover:text-white"
          >
            {{ item }}
          </a>
        </nav>

        <label
          class="flex h-11 w-full items-center gap-3 rounded-full border border-white/10 bg-white/[0.06] px-4 text-slate-500 md:w-64 lg:w-72"
        >
          <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="m20 20-4.2-4.2m1.7-5.1a6.8 6.8 0 1 1-13.6 0 6.8 6.8 0 0 1 13.6 0Z"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
          <input
            type="search"
            placeholder="Search anime..."
            class="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
          />
        </label>
      </header>

      <section class="py-14 sm:py-16">
        <div class="mb-7 flex items-end justify-between gap-4">
          <div>
            <p class="mb-2 flex items-center gap-2 text-sm font-black uppercase text-pink-100">
              <span class="text-pink-300" aria-hidden="true">HOT</span>
              Trending Now
            </p>
            <h1 class="text-3xl font-black leading-tight tracking-normal sm:text-4xl">
              Anime Everyone Is Watching
            </h1>
          </div>
          <a href="#" class="hidden shrink-0 text-sm font-black text-slate-200 hover:text-pink-200 sm:inline-flex">
            View all >
          </a>
        </div>

        <div class="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-6 sm:gap-y-10 xl:grid-cols-4">
          <article v-for="anime in animeList" :key="anime.title" class="group">
            <div
              class="relative cursor-pointer overflow-hidden rounded-[5px] bg-black shadow-[inset_0_-48px_90px_rgba(0,0,0,0.2)] transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_18px_40px_rgba(0,0,0,0.38)]"
              @click="openWatchPage(anime)"
              @mouseenter="playCardPreview(anime)"
              @mouseleave="pauseCardPreview(anime)"
            >
              <video
                :ref="(video) => setCardVideo(anime.title, video)"
                :src="fightVideo"
                class="aspect-[16/9] w-full bg-black object-cover"
                muted
                playsinline
                preload="metadata"
                :aria-label="`${anime.title} video preview`"
                @loadedmetadata="saveVideoDuration(anime, $event.currentTarget)"
                @play="setVideoPlaybackActive(anime, true)"
                @pause="setVideoPlaybackActive(anime, false)"
                @timeupdate="saveVideoTime(anime, $event.currentTarget)"
                @seeked="saveVideoTime(anime, $event.currentTarget)"
              ></video>
              <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-black/35"></div>
              <div class="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
                <span
                  class="grid h-11 w-11 place-items-center rounded-full border border-white/35 bg-black/50 text-white opacity-85 shadow-[0_0_26px_rgba(236,72,153,0.42)] ring-4 ring-white/10 backdrop-blur transition duration-300 group-hover:scale-110 group-hover:bg-pink-500/80 group-hover:opacity-100 sm:h-14 sm:w-14"
                  aria-hidden="true"
                >
                  <svg class="ml-0.5 h-5 w-5 sm:ml-1 sm:h-7 sm:w-7" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5.4v13.2c0 .8.9 1.3 1.6.8l10-6.6c.6-.4.6-1.3 0-1.7l-10-6.5C8.9 4.1 8 4.6 8 5.4Z" />
                  </svg>
                </span>
              </div>
              <div class="pointer-events-none absolute inset-x-0 bottom-0 px-2 pb-2 pt-8 sm:px-3 sm:pb-3">
                <h2 class="truncate text-xs font-black text-white sm:text-base">
                  {{ anime.title }}
                </h2>
              </div>
              <span
                class="absolute bottom-2 right-2 min-w-16 rounded-[4px] bg-black/25 px-1.5 py-0.5 text-center text-[9px] font-black text-white shadow-[0_0_12px_rgba(0,0,0,0.18)] sm:min-w-20 sm:px-2 sm:py-1 sm:text-[10px]"
              >
                {{ getVideoTimeLabel(anime) }}
              </span>
            </div>
            <h3 class="mt-2 truncate text-sm font-black text-white sm:mt-3 sm:text-base">{{ anime.title }}</h3>
            <p class="mt-1 text-xs font-black text-yellow-400 sm:text-sm">{{ anime.views }} views</p>
          </article>
        </div>

        <div class="mt-11 flex flex-wrap items-center justify-center gap-4">
          <a
            href="#"
            class="grid h-12 w-12 place-items-center rounded-[7px] bg-gradient-to-br from-fuchsia-500 to-orange-400 text-base font-black shadow-[0_10px_26px_rgba(236,72,153,0.32)]"
          >
            1
          </a>
          <a
            v-for="page in episodePages"
            :key="page"
            href="#"
            class="grid h-12 w-12 place-items-center rounded-[7px] bg-white/[0.04] text-base font-black text-slate-200 transition hover:bg-white/10"
          >
            {{ page }}
          </a>
          <a
            href="#"
            class="grid h-12 w-12 place-items-center rounded-[7px] bg-white/[0.04] text-base font-black text-slate-200 transition hover:bg-white/10"
          >
            ...
          </a>
          <a
            href="#"
            class="grid h-12 w-12 place-items-center rounded-[7px] bg-white/[0.04] text-base font-black text-slate-200 transition hover:bg-white/10"
          >
            48
          </a>
          <a
            href="#"
            class="grid h-12 min-w-24 place-items-center rounded-[7px] bg-white/[0.04] px-5 text-base font-black text-white transition hover:bg-white/10"
          >
            Next >
          </a>
        </div>
      </section>
    </section>
  </main>
</template>
