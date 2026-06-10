<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useVideoProgress } from '../composables/useVideoProgress'

const props = defineProps({
  videoId: {
    type: [Number, String],
    required: true,
  },
  src: {
    type: String,
    default: '',
  },
  poster: {
    type: String,
    default: '',
  },
  title: {
    type: String,
    default: 'Anime video',
  },
})

const emit = defineEmits(['ended', 'progress', 'ready', 'play'])

const playerRef = ref(null)
const videoRef = ref(null)
const currentTime = ref(0)
const duration = ref(0)
const isPlaying = ref(false)
const isLoading = ref(true)
const errorMessage = ref('')
const playbackRate = ref(1)
const isFullscreen = ref(false)
const canPictureInPicture = ref(false)

const { resume, save } = useVideoProgress(videoRef, computed(() => props.videoId), { saveEvery: 5000 })

let hls = null
let sourceToken = 0

const isHls = computed(() => /\.m3u8($|\?)/i.test(props.src || ''))
const progressPercent = computed(() => (duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0))

const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2]

const formatTime = (value) => {
  const seconds = Math.max(Math.floor(Number(value) || 0), 0)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60

  if (hours) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
  }

  return `${minutes}:${String(remainder).padStart(2, '0')}`
}

const destroyHls = () => {
  if (hls) {
    hls.destroy()
    hls = null
  }
}

const attachSource = async () => {
  const element = videoRef.value
  const source = props.src
  sourceToken += 1
  const token = sourceToken

  destroyHls()
  errorMessage.value = ''
  isLoading.value = true
  currentTime.value = 0
  duration.value = 0

  if (!element || !source) {
    errorMessage.value = 'No video source is available.'
    isLoading.value = false
    return
  }

  element.pause()
  element.removeAttribute('src')
  element.load()

  if (isHls.value) {
    const nativeHls = element.canPlayType('application/vnd.apple.mpegurl')

    if (nativeHls) {
      element.src = source
      element.load()
      return
    }

    try {
      const { default: Hls } = await import('hls.js/dist/hls.light.min.js')

      if (token !== sourceToken) return

      if (!Hls.isSupported()) {
        errorMessage.value = 'HLS playback is not supported in this browser.'
        isLoading.value = false
        return
      }

      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      })

      hls.attachMedia(element)
      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        hls?.loadSource(source)
      })
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data?.fatal) {
          errorMessage.value = 'The stream could not be played.'
          isLoading.value = false
        }
      })
    } catch (err) {
      errorMessage.value = 'Unable to load HLS playback support.'
      isLoading.value = false
    }

    return
  }

  element.src = source
  element.load()
}

const togglePlay = async () => {
  const element = videoRef.value

  if (!element) return

  if (element.paused) {
    await element.play().catch(() => {})
  } else {
    element.pause()
  }
}

const seekToPercent = (event) => {
  const element = videoRef.value
  const nextPercent = Number(event.target.value)

  if (!element || !duration.value) return

  element.currentTime = (nextPercent / 100) * duration.value
  currentTime.value = element.currentTime
  save()
}

const changeSpeed = () => {
  if (videoRef.value) {
    videoRef.value.playbackRate = playbackRate.value
  }
}

const toggleFullscreen = async () => {
  if (!playerRef.value) return

  if (!document.fullscreenElement) {
    await playerRef.value.requestFullscreen?.()
  } else {
    await document.exitFullscreen?.()
  }
}

const togglePictureInPicture = async () => {
  const element = videoRef.value

  if (!element || !document.pictureInPictureEnabled) return

  if (document.pictureInPictureElement) {
    await document.exitPictureInPicture()
  } else {
    await element.requestPictureInPicture()
  }
}

const handleLoadedMetadata = () => {
  duration.value = videoRef.value?.duration || 0
  canPictureInPicture.value = Boolean(document.pictureInPictureEnabled && !videoRef.value?.disablePictureInPicture)
  resume()
  emit('ready')
}

const handleTimeUpdate = () => {
  currentTime.value = videoRef.value?.currentTime || 0
  emit('progress', {
    currentTime: currentTime.value,
    duration: duration.value,
  })
}

const handleEnded = () => {
  isPlaying.value = false
  save()
  emit('ended')
}

const handlePlay = () => {
  isPlaying.value = true
  emit('play')
}

const handleFullscreenChange = () => {
  isFullscreen.value = Boolean(document.fullscreenElement)
}

watch(
  () => props.src,
  () => {
    attachSource()
  },
)

watch(playbackRate, changeSpeed)

onMounted(() => {
  attachSource()
  document.addEventListener('fullscreenchange', handleFullscreenChange)
})

onBeforeUnmount(() => {
  save()
  destroyHls()
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
})
</script>

<template>
  <section
    ref="playerRef"
    class="group relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
  >
    <video
      ref="videoRef"
      class="aspect-video w-full bg-black object-contain"
      :poster="poster"
      :aria-label="title"
      playsinline
      preload="metadata"
      @loadedmetadata="handleLoadedMetadata"
      @canplay="isLoading = false"
      @waiting="isLoading = true"
      @playing="isLoading = false; isPlaying = true"
      @play="handlePlay"
      @pause="isPlaying = false"
      @timeupdate="handleTimeUpdate"
      @ended="handleEnded"
      @error="errorMessage = 'The video file could not be loaded.'; isLoading = false"
    ></video>

    <div v-if="isLoading && !errorMessage" class="absolute inset-0 grid place-items-center bg-black/30">
      <div class="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-fuchsia-400"></div>
    </div>

    <div v-if="errorMessage" class="absolute inset-0 grid place-items-center bg-black/80 px-6 text-center">
      <p class="max-w-md text-sm font-black text-rose-100">{{ errorMessage }}</p>
    </div>

    <button
      type="button"
      class="absolute inset-0 grid place-items-center text-white transition focus:outline-none"
      aria-label="Toggle playback"
      @click="togglePlay"
    >
      <span
        v-if="!isPlaying && !errorMessage"
        class="grid h-16 w-16 place-items-center rounded-full border border-white/25 bg-black/45 pl-1 text-white shadow-[0_0_40px_rgba(217,70,239,0.45)] backdrop-blur transition group-hover:scale-105"
        aria-hidden="true"
      >
        <svg class="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5.2v13.6c0 .8.9 1.3 1.6.9l10.2-6.8c.6-.4.6-1.3 0-1.7L9.6 4.3C8.9 3.9 8 4.4 8 5.2Z" />
        </svg>
      </span>
    </button>

    <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent px-3 pb-3 pt-12 opacity-100 transition sm:px-4">
      <label class="sr-only" for="watch-progress">Playback progress</label>
      <input
        id="watch-progress"
        type="range"
        min="0"
        max="100"
        step="0.05"
        :value="progressPercent"
        class="player-range w-full"
        @input="seekToPercent"
      />

      <div class="mt-3 flex flex-wrap items-center gap-2 text-xs font-black text-white sm:gap-3">
        <button type="button" class="player-control" :aria-label="isPlaying ? 'Pause' : 'Play'" @click="togglePlay">
          <svg v-if="isPlaying" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 5h3v14H7V5Zm7 0h3v14h-3V5Z" />
          </svg>
          <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5.2v13.6c0 .8.9 1.3 1.6.9l10.2-6.8c.6-.4.6-1.3 0-1.7L9.6 4.3C8.9 3.9 8 4.4 8 5.2Z" />
          </svg>
        </button>

        <span class="min-w-[88px] text-slate-200">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>

        <div class="ml-auto flex items-center gap-2">
          <label class="sr-only" for="speed-control">Playback speed</label>
          <select
            id="speed-control"
            v-model.number="playbackRate"
            class="h-9 rounded-xl border border-white/10 bg-black/55 px-2 text-xs font-black text-white outline-none backdrop-blur"
          >
            <option v-for="speed in speedOptions" :key="speed" :value="speed">{{ speed }}x</option>
          </select>

          <button
            type="button"
            class="player-control disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Picture in picture"
            :disabled="!canPictureInPicture"
            @click="togglePictureInPicture"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none">
              <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Z" stroke="currentColor" stroke-width="2" />
              <path d="M12 13h5v4h-5v-4Z" fill="currentColor" />
            </svg>
          </button>

          <button type="button" class="player-control" :aria-label="isFullscreen ? 'Exit fullscreen' : 'Fullscreen'" @click="toggleFullscreen">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none">
              <path d="M8 4H4v4M16 4h4v4M20 16v4h-4M4 16v4h4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
