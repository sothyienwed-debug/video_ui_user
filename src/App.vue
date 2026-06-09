<script setup>
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  api,
  categoryName,
  formatDate,
  formatNumber,
  getThumbnailUrl,
  getVideoSourceUrl,
} from './services/api'
import { getProgressForVideo } from './composables/useVideoProgress'

const VideoPlayer = defineAsyncComponent(() => import('./components/VideoPlayer.vue'))
const EpisodeSidebar = defineAsyncComponent(() => import('./components/EpisodeSidebar.vue'))
const VideoActions = defineAsyncComponent(() => import('./components/VideoActions.vue'))
const RelatedVideos = defineAsyncComponent(() => import('./components/RelatedVideos.vue'))
const BannerAd = defineAsyncComponent(() => import('./components/Ads/BannerAd.vue'))
const OverlayAd = defineAsyncComponent(() => import('./components/Ads/OverlayAd.vue'))
const PopupAd = defineAsyncComponent(() => import('./components/Ads/PopupAd.vue'))

const COMMENTS_PER_PAGE = 6
const SESSION_POPUP_KEY = 'teenth_session_popup_seen'
const EPISODE_CHANGE_KEY = 'teenth_episode_change_count'
const HOME_CATEGORY_ALL = 'all'

const videos = ref([])
const categories = ref([])
const video = ref(null)
const homeCategoryId = ref(HOME_CATEGORY_ALL)
const homeSearch = ref('')
const homeSort = ref('latest')
const loading = ref(true)
const videoLoading = ref(false)
const relatedLoading = ref(true)
const error = ref('')
const toastMessage = ref('')
const commentsRef = ref(null)
const commentsLoaded = ref(false)
const commentsLoading = ref(false)
const commentsError = ref('')
const allComments = ref([])
const commentsPage = ref(1)
const progressVersion = ref(0)
const showSessionPopup = ref(false)
const showEpisodePopup = ref(false)
const pendingEpisode = ref(null)
const episodeChangeCount = ref(Number(sessionStorage.getItem(EPISODE_CHANGE_KEY) || 0))
const stats = ref({
  likes: 0,
  dislikes: 0,
  liked: false,
  disliked: false,
  favorited: false,
  views: 0,
})

let toastTimer = null
let commentsObserver = null

const parseVideoIdFromUrl = () => {
  const match = window.location.pathname.match(/^\/watch\/([^/?#]+)/)
  return match?.[1] ? decodeURIComponent(match[1]) : ''
}

const initialVideoId = parseVideoIdFromUrl()
const selectedVideoId = ref(initialVideoId)
const currentView = ref(initialVideoId ? 'watch' : 'home')

const isHomeView = computed(() => currentView.value === 'home')
const isWatchView = computed(() => currentView.value === 'watch')
const currentVideoId = computed(() => video.value?.id || selectedVideoId.value)
const posterUrl = computed(() => getThumbnailUrl(video.value))
const sourceUrl = computed(() => getVideoSourceUrl(video.value))
const currentCategory = computed(() => categoryName(video.value))
const createdDate = computed(() => formatDate(video.value?.created_at || video.value?.published_at))
const primaryAdUrl = computed(() => video.value?.ad_link || video.value?.ads?.[0]?.url || '')
const totalEpisodes = computed(() => episodes.value.length)
const visibleComments = computed(() => allComments.value.slice(0, commentsPage.value * COMMENTS_PER_PAGE))
const commentsHasMore = computed(() => visibleComments.value.length < allComments.value.length)

const normalizeText = (value) => String(value || '').trim().toLowerCase()

const videoTimestamp = (item) => {
  const date = new Date(item?.published_at || item?.created_at || 0)

  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

const uniqueById = (items) => {
  const seen = new Set()

  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false

    seen.add(item.id)
    return true
  })
}

const categoryKey = (category) => {
  if (!category) return ''
  if (category.id !== undefined && category.id !== null && category.id !== '') return `id:${category.id}`
  if (category.slug) return `slug:${category.slug}`

  return `name:${normalizeText(category.name)}`
}

const inferCategoriesFromVideos = (items) => {
  const grouped = new Map()

  items.forEach((item) => {
    const name = categoryName(item)
    const source = typeof item?.category === 'object' && item.category ? item.category : {}
    const category = {
      id: item?.category_id || source.id || name,
      name,
      slug: source.slug || normalizeText(name).replace(/\s+/g, '-'),
      color: source.color || '#22d3ee',
      video_count: 0,
      status: source.status || 'active',
    }
    const key = categoryKey(category)
    const saved = grouped.get(key) || category

    saved.video_count = Number(saved.video_count || 0) + 1
    grouped.set(key, saved)
  })

  return Array.from(grouped.values())
}

const videoMatchesCategory = (item, category) => {
  if (!category || category.id === HOME_CATEGORY_ALL) return true

  if (category.id && item?.category_id) {
    return String(item.category_id) === String(category.id)
  }

  if (category.slug && typeof item?.category === 'object' && item.category?.slug) {
    return item.category.slug === category.slug
  }

  return normalizeText(categoryName(item)) === normalizeText(category.name)
}

const sortVideoList = (items, mode = homeSort.value) => {
  return items.slice().sort((first, second) => {
    if (mode === 'popular') {
      return Number(second.views || 0) - Number(first.views || 0)
    }

    if (mode === 'title') {
      return String(first.title || '').localeCompare(String(second.title || ''))
    }

    return videoTimestamp(second) - videoTimestamp(first)
  })
}

const homeCategories = computed(() => {
  const inferred = inferCategoriesFromVideos(videos.value)
  const merged = new Map()

  categories.value.forEach((category) => {
    if (!category?.name) return
    merged.set(categoryKey(category), { ...category })
  })

  inferred.forEach((category) => {
    const key = categoryKey(category)
    const saved = merged.get(key)

    merged.set(key, {
      ...category,
      ...saved,
      video_count: Math.max(Number(saved?.video_count || saved?.videos_count || 0), Number(category.video_count || 0)),
    })
  })

  return [
    {
      id: HOME_CATEGORY_ALL,
      name: 'All Anime',
      color: '#22d3ee',
      video_count: videos.value.length,
    },
    ...Array.from(merged.values())
      .filter((category) => category.name && (Number(category.video_count || category.videos_count || 0) > 0 || videos.value.length === 0))
      .sort((first, second) => String(first.name).localeCompare(String(second.name))),
  ]
})

const selectedHomeCategory = computed(() =>
  homeCategories.value.find((category) => String(category.id) === String(homeCategoryId.value)) || homeCategories.value[0],
)

const homeVideos = computed(() => {
  const query = normalizeText(homeSearch.value)
  const selectedCategory = selectedHomeCategory.value

  return sortVideoList(
    videos.value.filter((item) => {
      const matchesCategory = videoMatchesCategory(item, selectedCategory)
      const matchesSearch = !query || normalizeText(`${item.title} ${item.description} ${categoryName(item)}`).includes(query)

      return matchesCategory && matchesSearch
    }),
  )
})

const featuredVideo = computed(() => {
  const featured = videos.value.filter((item) => item.featured)

  return sortVideoList(featured.length ? featured : videos.value, featured.length ? 'popular' : 'latest')[0] || null
})

const episodes = computed(() => {
  progressVersion.value

  if (!video.value) return []

  const sameSeries = videos.value.filter((item) => {
    if (!item?.id) return false

    if (video.value.category_id && item.category_id) {
      return item.category_id === video.value.category_id
    }

    return categoryName(item) === currentCategory.value
  })

  const list = sameSeries.some((item) => item.id === video.value.id)
    ? sameSeries
    : [video.value, ...sameSeries]

  return list
    .slice()
    .sort((first, second) => {
      const firstSeason = Number(first.season || 1)
      const secondSeason = Number(second.season || 1)
      const firstEpisode = Number(first.episode || first.id || 0)
      const secondEpisode = Number(second.episode || second.id || 0)

      if (firstSeason !== secondSeason) return firstSeason - secondSeason
      if (firstEpisode !== secondEpisode) return firstEpisode - secondEpisode

      return Number(first.id || 0) - Number(second.id || 0)
    })
    .map((item, index) => {
      const progress = getProgressForVideo(item.id)
      const duration = Number(progress?.duration || item.duration || 0)
      const currentTime = Number(progress?.currentTime || 0)
      const progressPercent = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0

      return {
        ...item,
        episodeNumber: item.episode || index + 1,
        watched: Boolean(progress?.watched),
        progressPercent,
      }
    })
})

const relatedVideos = computed(() => {
  if (!video.value) return []

  return videos.value
    .filter((item) => item.id !== video.value.id)
    .slice()
    .sort((first, second) => {
      const firstSameCategory = Number(categoryName(first) === currentCategory.value)
      const secondSameCategory = Number(categoryName(second) === currentCategory.value)

      if (firstSameCategory !== secondSameCategory) {
        return secondSameCategory - firstSameCategory
      }

      return Number(second.views || 0) - Number(first.views || 0)
    })
    .slice(0, 10)
})

const showToast = (message) => {
  toastMessage.value = message

  if (toastTimer) {
    clearTimeout(toastTimer)
  }

  toastTimer = window.setTimeout(() => {
    toastMessage.value = ''
  }, 2400)
}

const syncStats = (payload) => {
  stats.value = {
    likes: Number(payload?.likes || 0),
    dislikes: Number(payload?.dislikes || 0),
    liked: Boolean(payload?.liked),
    disliked: Boolean(payload?.disliked),
    favorited: Boolean(payload?.favorited),
    views: Number(payload?.views || stats.value.views || 0),
  }
}

const resetComments = () => {
  commentsLoaded.value = false
  commentsLoading.value = false
  commentsError.value = ''
  commentsPage.value = 1
  allComments.value = []
}

const loadComments = async () => {
  if (!video.value || commentsLoaded.value || commentsLoading.value) return

  commentsLoading.value = true
  commentsError.value = ''

  try {
    const response = await api.getComments(video.value.id)
    allComments.value = response?.comments || []
    commentsLoaded.value = true
  } catch (err) {
    commentsError.value = 'Comments are unavailable right now.'
  } finally {
    commentsLoading.value = false
  }
}

const loadMoreComments = () => {
  commentsPage.value += 1
}

const observeComments = () => {
  commentsObserver?.disconnect()

  if (!commentsRef.value) return

  if (!('IntersectionObserver' in window)) {
    loadComments()
    return
  }

  commentsObserver = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting) {
        loadComments()
      }
    },
    { rootMargin: '280px 0px' },
  )

  commentsObserver.observe(commentsRef.value)
}

const loadCatalog = async () => {
  relatedLoading.value = true

  const [videoResult, homeResult, categoryResult] = await Promise.allSettled([
    api.getAllVideos({ per_page: 100 }),
    api.getHome(),
    api.getCategories({ status: 'active' }),
  ])

  const homePayload = homeResult.status === 'fulfilled' ? homeResult.value : null
  const homeVideoLists = [
    ...(homePayload?.featured_videos || []),
    ...(homePayload?.latest_videos || []),
    ...(homePayload?.popular_videos || []),
  ]

  if (videoResult.status === 'fulfilled' || homeVideoLists.length) {
    videos.value = uniqueById([
      ...homeVideoLists,
      ...(videoResult.status === 'fulfilled' ? videoResult.value : []),
    ])
  }

  if (categoryResult.status === 'fulfilled' && categoryResult.value?.length) {
    categories.value = categoryResult.value
  } else if (Array.isArray(homePayload?.categories)) {
    categories.value = homePayload.categories
  } else {
    categories.value = inferCategoriesFromVideos(videos.value)
  }

  relatedLoading.value = false
}

const maybeShowSessionPopup = () => {
  if (sessionStorage.getItem(SESSION_POPUP_KEY)) return

  showSessionPopup.value = true
  sessionStorage.setItem(SESSION_POPUP_KEY, '1')
}

const loadCurrentVideo = async (id) => {
  const fallbackId = id || videos.value[0]?.id

  if (!fallbackId) {
    error.value = 'No videos are available yet.'
    return
  }

  videoLoading.value = true
  error.value = ''

  try {
    const payload = await api.getVideo(fallbackId)
    video.value = payload
    selectedVideoId.value = payload.id
    currentView.value = 'watch'
    syncStats(payload)
    resetComments()
    progressVersion.value += 1
    maybeShowSessionPopup()

    api.recordView(payload.id)
      .then(() => {
        stats.value = { ...stats.value, views: stats.value.views + 1 }
      })
      .catch(() => {})

    await nextTick()
    observeComments()
  } catch (err) {
    error.value = 'Cannot load this anime episode.'
  } finally {
    videoLoading.value = false
  }
}

const initialize = async () => {
  loading.value = true
  error.value = ''

  try {
    await loadCatalog()

    if (isWatchView.value) {
      await loadCurrentVideo(selectedVideoId.value)
    } else {
      video.value = null
      resetComments()
    }
  } catch (err) {
    error.value = 'Cannot load videos.'
  } finally {
    loading.value = false
  }
}

const watchHref = (item) => `/watch/${encodeURIComponent(item?.id || '')}`

const navigateHome = () => {
  if (window.location.pathname !== '/') {
    window.history.pushState({ view: 'home' }, '', '/')
  }

  currentView.value = 'home'
  selectedVideoId.value = ''
  video.value = null
  error.value = ''
  showEpisodePopup.value = false
  pendingEpisode.value = null
  commentsObserver?.disconnect()
  resetComments()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const openVideo = async (item) => {
  if (!item?.id) return

  const href = watchHref(item)

  if (window.location.pathname !== href) {
    window.history.pushState({ videoId: item.id }, '', href)
  }

  selectedVideoId.value = item.id
  currentView.value = 'watch'
  window.scrollTo({ top: 0, behavior: 'smooth' })
  await loadCurrentVideo(item.id)
}

const selectHomeCategory = (category) => {
  homeCategoryId.value = category?.id || HOME_CATEGORY_ALL
}

const commitEpisodeChange = async (episode) => {
  if (!episode?.id || episode.id === currentVideoId.value) return

  showEpisodePopup.value = false
  pendingEpisode.value = null
  currentView.value = 'watch'
  window.history.pushState({ videoId: episode.id }, '', `/watch/${episode.id}`)
  selectedVideoId.value = episode.id
  window.scrollTo({ top: 0, behavior: 'smooth' })
  await loadCurrentVideo(episode.id)
}

const requestEpisodeChange = (episode) => {
  if (!episode?.id || episode.id === currentVideoId.value) return

  episodeChangeCount.value += 1
  sessionStorage.setItem(EPISODE_CHANGE_KEY, String(episodeChangeCount.value))

  if (episodeChangeCount.value % 3 === 0) {
    pendingEpisode.value = episode
    showEpisodePopup.value = true
    return
  }

  commitEpisodeChange(episode)
}

const continuePendingEpisode = () => {
  if (pendingEpisode.value) {
    commitEpisodeChange(pendingEpisode.value)
  } else {
    showEpisodePopup.value = false
  }
}

const updateReactionState = (payload) => {
  stats.value = {
    ...stats.value,
    likes: Number(payload?.likes ?? stats.value.likes),
    dislikes: Number(payload?.dislikes ?? stats.value.dislikes),
    liked: Boolean(payload?.liked),
    disliked: Boolean(payload?.disliked),
  }
}

const toggleLike = async () => {
  if (!video.value) return

  const previous = { ...stats.value }
  const nextLiked = !stats.value.liked

  stats.value = {
    ...stats.value,
    liked: nextLiked,
    disliked: nextLiked ? false : stats.value.disliked,
    likes: Math.max(stats.value.likes + (nextLiked ? 1 : -1), 0),
    dislikes: nextLiked && stats.value.disliked ? Math.max(stats.value.dislikes - 1, 0) : stats.value.dislikes,
  }

  try {
    const response = await api.likeVideo(video.value.id)
    updateReactionState(response)
    showToast(response?.liked ? 'Liked' : 'Like removed')
  } catch (err) {
    stats.value = previous
    showToast('Unable to update like')
  }
}

const toggleDislike = async () => {
  if (!video.value) return

  const previous = { ...stats.value }
  const nextDisliked = !stats.value.disliked

  stats.value = {
    ...stats.value,
    disliked: nextDisliked,
    liked: nextDisliked ? false : stats.value.liked,
    dislikes: Math.max(stats.value.dislikes + (nextDisliked ? 1 : -1), 0),
    likes: nextDisliked && stats.value.liked ? Math.max(stats.value.likes - 1, 0) : stats.value.likes,
  }

  try {
    const response = await api.dislikeVideo(video.value.id)
    updateReactionState(response)
    showToast(response?.disliked ? 'Disliked' : 'Dislike removed')
  } catch (err) {
    stats.value = previous
    showToast('Unable to update dislike')
  }
}

const addFavorite = async () => {
  if (!video.value) return

  const previous = { ...stats.value }
  stats.value = { ...stats.value, favorited: true }

  try {
    const response = await api.favoriteVideo(video.value.id)
    stats.value = { ...stats.value, favorited: Boolean(response?.favorited) }
    showToast('Added to favorites')
  } catch (err) {
    stats.value = previous
    showToast('Unable to update favorite')
  }
}

const shareVideo = async () => {
  try {
    await navigator.clipboard.writeText(window.location.href)
  } catch (err) {
    const textArea = document.createElement('textarea')
    textArea.value = window.location.href
    textArea.setAttribute('readonly', '')
    textArea.style.position = 'fixed'
    textArea.style.opacity = '0'
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
  }

  showToast('Link copied')
}

const reportVideo = async (reason) => {
  if (!video.value) return

  try {
    await api.reportVideo(video.value.id, reason)
    showToast('Report submitted')
  } catch (err) {
    showToast('Unable to submit report')
  }
}

const handleProgressUpdate = () => {
  progressVersion.value += 1
}

const handlePopState = () => {
  const id = parseVideoIdFromUrl()
  selectedVideoId.value = id

  if (id) {
    currentView.value = 'watch'
    loadCurrentVideo(id)
    return
  }

  currentView.value = 'home'
  video.value = null
  error.value = ''
  commentsObserver?.disconnect()
  resetComments()
}

watch(
  () => video.value?.id,
  () => {
    nextTick(observeComments)
  },
)

onMounted(() => {
  window.addEventListener('popstate', handlePopState)
  initialize()
})

onBeforeUnmount(() => {
  commentsObserver?.disconnect()
  window.removeEventListener('popstate', handlePopState)

  if (toastTimer) {
    clearTimeout(toastTimer)
  }
})
</script>

<template>
  <main class="min-h-screen bg-[#070712] text-slate-100">
    <div class="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 lg:px-8">
      <header class="flex min-h-16 items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.055] px-4 shadow-[0_18px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl sm:px-5">
        <a href="/" class="flex min-w-0 items-center gap-3" @click.prevent="navigateHome">
          <span class="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-fuchsia-300/25 bg-white/10 p-1">
            <img src="/thai%20logo.jpg" alt="TeensTH logo" class="h-full w-full rounded-lg object-contain" />
          </span>
          <span class="min-w-0">
            <span class="block text-lg font-black leading-5 text-white">TeensTH</span>
            <span class="block truncate text-xs font-semibold text-slate-400">Anime Watch</span>
          </span>
        </a>

        <div class="hidden items-center gap-2 text-xs font-bold text-slate-400 sm:flex">
          <span>{{ Math.max(homeCategories.length - 1, 0) || 'Live' }} categories</span>
          <span class="h-1 w-1 rounded-full bg-fuchsia-300"></span>
          <span>{{ videos.length }} episodes</span>
        </div>
      </header>

      <section v-if="loading" class="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div class="aspect-video animate-pulse rounded-2xl border border-white/10 bg-white/[0.07]"></div>
        <div class="h-[520px] animate-pulse rounded-2xl border border-white/10 bg-white/[0.07]"></div>
      </section>

      <section v-else-if="error && !video" class="mt-5 rounded-2xl border border-rose-300/20 bg-rose-500/10 px-5 py-12 text-center">
        <p class="text-sm font-black text-rose-100">{{ error }}</p>
      </section>

      <template v-else-if="isHomeView">
        <section class="mt-5 grid items-start gap-5 xl:grid-cols-[290px_minmax(0,1fr)]">
          <aside class="rounded-2xl border border-white/10 bg-white/[0.055] p-4 shadow-[0_18px_70px_rgba(0,0,0,0.3)] backdrop-blur-xl xl:sticky xl:top-4">
            <div class="rounded-xl border border-white/10 bg-black/20 p-4">
              <p class="text-xs font-black uppercase tracking-[0.18em] text-cyan-100">Browse</p>
              <h1 class="mt-2 text-2xl font-black leading-tight text-white">Anime Library</h1>
              <p class="mt-2 text-sm font-semibold leading-6 text-slate-400">
                {{ formatNumber(videos.length) }} episodes across {{ Math.max(homeCategories.length - 1, 0) }} categories
              </p>
            </div>

            <div class="mt-4 space-y-2">
              <button
                v-for="category in homeCategories"
                :key="categoryKey(category)"
                type="button"
                :class="[
                  String(selectedHomeCategory?.id) === String(category.id)
                    ? 'border-cyan-300/40 bg-cyan-400/15 text-white'
                    : 'border-white/10 bg-black/20 text-slate-300 hover:border-fuchsia-300/30 hover:bg-white/[0.07] hover:text-white',
                  'flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border px-3 text-left text-sm font-black transition',
                ]"
                @click="selectHomeCategory(category)"
              >
                <span class="flex min-w-0 items-center gap-3">
                  <span
                    class="h-2.5 w-2.5 shrink-0 rounded-full"
                    :style="{ backgroundColor: category.color || '#22d3ee' }"
                  ></span>
                  <span class="truncate">{{ category.name }}</span>
                </span>
                <span class="shrink-0 text-xs text-slate-400">
                  {{ formatNumber(category.video_count || category.videos_count || 0) }}
                </span>
              </button>
            </div>
          </aside>

          <div class="min-w-0 space-y-5">
            <section v-if="featuredVideo" class="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055] shadow-[0_18px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl">
              <a
                :href="watchHref(featuredVideo)"
                class="grid min-h-[260px] md:grid-cols-[minmax(0,1.18fr)_minmax(280px,0.82fr)]"
                @click.prevent="openVideo(featuredVideo)"
              >
                <span class="relative block min-h-[260px] overflow-hidden bg-black">
                  <img
                    :src="getThumbnailUrl(featuredVideo)"
                    :alt="featuredVideo.title"
                    decoding="async"
                    class="h-full w-full object-cover"
                    @error="$event.currentTarget.src = '/placeholder.jpg'"
                  />
                  <span class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent"></span>
                  <span class="absolute bottom-4 left-4 rounded-full border border-white/10 bg-black/55 px-3 py-1 text-xs font-black text-white backdrop-blur">
                    EP {{ featuredVideo.episode || 1 }}
                  </span>
                </span>
                <span class="flex min-w-0 flex-col justify-center p-5 sm:p-6">
                  <span class="text-xs font-black uppercase tracking-[0.18em] text-fuchsia-200">
                    {{ categoryName(featuredVideo) }}
                  </span>
                  <span class="mt-3 block text-3xl font-black leading-tight text-white lg:text-4xl">
                    {{ featuredVideo.title }}
                  </span>
                  <span class="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-slate-300">
                    <span>{{ formatNumber(featuredVideo.views) }} views</span>
                    <span class="h-1 w-1 rounded-full bg-slate-500"></span>
                    <span>{{ formatDate(featuredVideo.published_at || featuredVideo.created_at) }}</span>
                  </span>
                  <span class="mt-5 inline-flex w-max rounded-xl border border-cyan-300/25 bg-cyan-400/10 px-4 py-2 text-sm font-black text-cyan-100">
                    Watch now
                  </span>
                </span>
              </a>
            </section>

            <section class="rounded-2xl border border-white/10 bg-white/[0.055] p-4 shadow-[0_18px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-5">
              <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 class="text-2xl font-black leading-tight text-white">
                    {{ selectedHomeCategory?.name || 'All Anime' }}
                  </h2>
                  <p class="mt-1 text-sm font-semibold text-slate-400">
                    {{ formatNumber(homeVideos.length) }} episodes
                  </p>
                </div>

                <div class="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_160px] lg:min-w-[440px]">
                  <input
                    v-model="homeSearch"
                    type="search"
                    placeholder="Search anime"
                    class="min-h-11 rounded-xl border border-white/10 bg-black/25 px-3 text-sm font-bold text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/40 focus:bg-black/35"
                  />
                  <select
                    v-model="homeSort"
                    class="min-h-11 rounded-xl border border-white/10 bg-black/25 px-3 text-sm font-bold text-white outline-none transition focus:border-cyan-300/40 focus:bg-black/35"
                  >
                    <option value="latest">Latest</option>
                    <option value="popular">Popular</option>
                    <option value="title">A to Z</option>
                  </select>
                </div>
              </div>

              <div v-if="!homeVideos.length" class="mt-5 rounded-xl border border-white/10 bg-black/20 px-4 py-10 text-center text-sm font-bold text-slate-400">
                No videos found.
              </div>

              <div v-else class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                <article v-for="item in homeVideos" :key="item.id" class="group min-w-0">
                  <a :href="watchHref(item)" class="block min-w-0 text-left" @click.prevent="openVideo(item)">
                    <span class="relative block overflow-hidden rounded-xl border border-white/10 bg-black">
                      <img
                        :src="getThumbnailUrl(item)"
                        :alt="item.title"
                        loading="lazy"
                        decoding="async"
                        class="aspect-video w-full object-cover transition duration-300 group-hover:scale-105"
                        @error="$event.currentTarget.src = '/placeholder.jpg'"
                      />
                      <span class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></span>
                      <span class="absolute left-2 top-2 max-w-[calc(100%-1rem)] truncate rounded-full bg-black/55 px-2 py-1 text-[11px] font-black text-white backdrop-blur">
                        {{ categoryName(item) }}
                      </span>
                      <span class="absolute bottom-2 left-2 rounded-full bg-cyan-400/90 px-2 py-1 text-[11px] font-black text-slate-950">
                        EP {{ item.episode || 1 }}
                      </span>
                    </span>
                    <span class="mt-3 block truncate text-sm font-black text-white">{{ item.title }}</span>
                    <span class="mt-1 block text-xs font-bold text-slate-400">
                      {{ formatNumber(item.views) }} views
                    </span>
                  </a>
                </article>
              </div>
            </section>
          </div>
        </section>
      </template>

      <template v-else-if="isWatchView">
        <section class="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div class="min-w-0">
            <div v-if="videoLoading" class="aspect-video animate-pulse rounded-2xl border border-white/10 bg-white/[0.07]"></div>
            <VideoPlayer
              v-else
              :video-id="currentVideoId"
              :src="sourceUrl"
              :poster="posterUrl"
              :title="video?.title"
              @progress="handleProgressUpdate"
            />
          </div>

          <aside class="space-y-4 lg:sticky lg:top-4">
            <EpisodeSidebar
              :episodes="episodes"
              :active-id="currentVideoId"
              :loading="videoLoading"
              @select="requestEpisodeChange"
            />
            <BannerAd :ad-url="primaryAdUrl" />
          </aside>
        </section>

        <section class="mt-5 rounded-2xl border border-white/10 bg-white/[0.055] p-4 shadow-[0_18px_70px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:p-5">
          <div class="flex gap-4">
            <img
              :src="posterUrl"
              :alt="video?.title"
              loading="lazy"
              decoding="async"
              class="hidden h-28 w-44 shrink-0 rounded-xl border border-white/10 object-cover sm:block"
              @error="$event.currentTarget.src = '/placeholder.jpg'"
            />
            <div class="min-w-0 flex-1">
              <p class="text-xs font-black uppercase tracking-[0.2em] text-fuchsia-200">
                {{ currentCategory }}
              </p>
              <h1 class="mt-2 text-2xl font-black leading-tight text-white sm:text-3xl lg:text-4xl">
                {{ video?.title }}
              </h1>
              <p class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-slate-300">
                <span>{{ formatNumber(stats.views) }} views</span>
                <span class="h-1 w-1 rounded-full bg-slate-500"></span>
                <span>{{ formatNumber(stats.likes) }} likes</span>
                <span class="h-1 w-1 rounded-full bg-slate-500"></span>
                <span>{{ createdDate }}</span>
              </p>

              <dl class="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div class="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <dt class="text-xs font-bold text-slate-500">Category</dt>
                  <dd class="mt-1 truncate font-black text-slate-100">{{ currentCategory }}</dd>
                </div>
                <div class="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <dt class="text-xs font-bold text-slate-500">Episodes</dt>
                  <dd class="mt-1 font-black text-slate-100">{{ totalEpisodes }}</dd>
                </div>
                <div class="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <dt class="text-xs font-bold text-slate-500">Season</dt>
                  <dd class="mt-1 font-black text-slate-100">{{ video?.season || 1 }}</dd>
                </div>
                <div class="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <dt class="text-xs font-bold text-slate-500">Created</dt>
                  <dd class="mt-1 font-black text-slate-100">{{ createdDate }}</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        <VideoActions
          class="mt-4"
          :stats="stats"
          @like="toggleLike"
          @dislike="toggleDislike"
          @favorite="addFavorite"
          @share="shareVideo"
          @report="reportVideo"
        />

        <section class="mt-4 rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-[0_18px_70px_rgba(0,0,0,0.26)] backdrop-blur-xl">
          <h2 class="text-lg font-black text-white">Description</h2>
          <p class="mt-3 whitespace-pre-line text-sm leading-7 text-slate-300">
            {{ video?.description || 'No description has been added for this episode.' }}
          </p>
        </section>

        <section ref="commentsRef" class="mt-4 rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-[0_18px_70px_rgba(0,0,0,0.26)] backdrop-blur-xl">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-lg font-black text-white">Comments</h2>
              <p class="mt-1 text-sm font-semibold text-slate-400">
                {{ allComments.length ? `${allComments.length} reactions from viewers` : 'Viewer conversation loads when this section enters view.' }}
              </p>
            </div>
            <button
              v-if="!commentsLoaded && !commentsLoading"
              type="button"
              class="rounded-xl border border-fuchsia-300/25 bg-fuchsia-500/15 px-4 py-2 text-sm font-black text-fuchsia-100 transition hover:bg-fuchsia-500/25"
              @click="loadComments"
            >
              Load comments
            </button>
          </div>

          <div v-if="commentsLoading" class="mt-5 space-y-3">
            <div v-for="item in 3" :key="item" class="flex animate-pulse gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
              <div class="h-10 w-10 rounded-full bg-white/10"></div>
              <div class="flex-1 space-y-2">
                <div class="h-3 w-32 rounded-full bg-white/10"></div>
                <div class="h-3 w-full rounded-full bg-white/10"></div>
              </div>
            </div>
          </div>

          <p v-else-if="commentsError" class="mt-5 rounded-xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-100">
            {{ commentsError }}
          </p>

          <div v-else-if="commentsLoaded && !allComments.length" class="mt-5 rounded-xl border border-white/10 bg-black/20 px-4 py-6 text-sm font-bold text-slate-400">
            No comments yet.
          </div>

          <div v-else class="mt-5 space-y-3">
            <article
              v-for="comment in visibleComments"
              :key="comment.id"
              class="flex gap-3 rounded-xl border border-white/10 bg-black/20 p-4"
            >
              <div class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 to-cyan-400 text-sm font-black text-white">
                {{ (comment.author || 'A').slice(0, 1).toUpperCase() }}
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="font-black text-white">{{ comment.author || 'Anime Fan' }}</p>
                  <span class="text-xs font-bold text-slate-500">{{ formatDate(comment.created_at) }}</span>
                </div>
                <p class="mt-2 text-sm leading-6 text-slate-300">{{ comment.body }}</p>
                <button type="button" class="mt-3 text-xs font-black uppercase tracking-[0.14em] text-fuchsia-200 transition hover:text-white">
                  Reply
                </button>
              </div>
            </article>

            <div v-if="commentsHasMore" class="pt-2 text-center">
              <button
                type="button"
                class="rounded-xl border border-white/10 bg-white/10 px-5 py-2 text-sm font-black text-white transition hover:border-fuchsia-300/35 hover:bg-fuchsia-500/20"
                @click="loadMoreComments"
              >
                Load more
              </button>
            </div>
          </div>
        </section>

        <RelatedVideos
          class="mt-4"
          :videos="relatedVideos"
          :loading="relatedLoading"
          @select="requestEpisodeChange"
        />
      </template>
    </div>

    <OverlayAd v-if="isWatchView" :video-id="currentVideoId" :ad-url="primaryAdUrl" />

    <PopupAd
      v-if="isWatchView"
      :visible="showSessionPopup"
      variant="session"
      :skip-delay="3"
      :ad-url="primaryAdUrl"
      @close="showSessionPopup = false"
    />

    <PopupAd
      v-if="isWatchView"
      :visible="showEpisodePopup"
      variant="episode"
      :skip-delay="5"
      :ad-url="primaryAdUrl"
      @close="continuePendingEpisode"
    />

    <div
      v-if="toastMessage"
      class="fixed bottom-5 left-1/2 z-[80] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-fuchsia-300/30 bg-[#141421]/95 px-4 py-3 text-center text-sm font-black text-fuchsia-100 shadow-[0_18px_50px_rgba(217,70,239,0.28)] backdrop-blur-xl"
    >
      {{ toastMessage }}
    </div>
  </main>
</template>
