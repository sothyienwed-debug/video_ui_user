import { computed, onBeforeUnmount, onMounted, unref, watch } from 'vue'

const PREFIX = 'teenth_watch_progress'

const storageKey = (videoId) => `${PREFIX}:${videoId}`

const readJson = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null')
  } catch (err) {
    return null
  }
}

const writeJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    // Local storage can be unavailable in private browsing modes.
  }
}

export const getProgressForVideo = (videoId) => {
  if (!videoId) return null

  return readJson(storageKey(videoId))
}

export const clearProgressForVideo = (videoId) => {
  if (!videoId) return

  localStorage.removeItem(storageKey(videoId))
}

export function useVideoProgress(videoRef, videoIdRef, options = {}) {
  const saveEvery = options.saveEvery || 5000
  const key = computed(() => {
    const videoId = unref(videoIdRef)
    return videoId ? storageKey(videoId) : ''
  })
  const savedProgress = computed(() => (key.value ? readJson(key.value) : null))
  let interval = null

  const save = () => {
    const element = unref(videoRef)
    const videoId = unref(videoIdRef)

    if (!element || !videoId || !Number.isFinite(element.duration) || element.duration <= 0) {
      return
    }

    const duration = element.duration
    const currentTime = Math.min(element.currentTime || 0, duration)
    const watched = currentTime / duration >= 0.9 || duration - currentTime <= 45

    writeJson(storageKey(videoId), {
      videoId,
      currentTime,
      duration,
      watched,
      updatedAt: new Date().toISOString(),
    })
  }

  const resume = () => {
    const element = unref(videoRef)
    const progress = savedProgress.value

    if (!element || !progress?.currentTime || !Number.isFinite(element.duration)) {
      return
    }

    const shouldResume = progress.currentTime > 8 && progress.currentTime < element.duration - 30

    if (shouldResume) {
      element.currentTime = progress.currentTime
    }
  }

  const start = () => {
    stop()
    interval = window.setInterval(save, saveEvery)
  }

  const stop = () => {
    if (interval) {
      clearInterval(interval)
      interval = null
    }
  }

  const clear = () => {
    const videoId = unref(videoIdRef)
    clearProgressForVideo(videoId)
  }

  onMounted(() => {
    start()
    window.addEventListener('beforeunload', save)
  })

  onBeforeUnmount(() => {
    save()
    stop()
    window.removeEventListener('beforeunload', save)
  })

  watch(key, () => {
    start()
  })

  return {
    clear,
    progress: savedProgress,
    resume,
    save,
  }
}
