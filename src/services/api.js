const DEFAULT_API_URL = 'http://127.0.0.1:8075/api'
const GUEST_KEY_STORAGE = 'teenth_guest_key'
const CACHE_TTL = 60 * 1000

export const API_BASE_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/$/, '')
export const STORAGE_BASE_URL = API_BASE_URL.replace(/\/api$/, '/storage')

const memoryCache = new Map()

const clone = (value) => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }

  return JSON.parse(JSON.stringify(value))
}

export const getGuestKey = () => {
  const saved = localStorage.getItem(GUEST_KEY_STORAGE)

  if (saved) return saved

  const key = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
  localStorage.setItem(GUEST_KEY_STORAGE, key)

  return key
}

const getAuthToken = () =>
  localStorage.getItem('auth_token') ||
  localStorage.getItem('token') ||
  localStorage.getItem('access_token') ||
  ''

const buildUrl = (path, query = {}) => {
  const url = new URL(path.startsWith('http') ? path : `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`)

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value)
    }
  })

  return url
}

const unwrap = (payload) => {
  if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) {
    return payload.data
  }

  return payload
}

export const apiRequest = async (path, options = {}) => {
  const {
    method = 'GET',
    query,
    body,
    headers = {},
    cache = true,
    cacheTtl = CACHE_TTL,
    signal,
  } = options
  const normalizedMethod = method.toUpperCase()
  const url = buildUrl(path, query)
  const cacheKey = `${normalizedMethod}:${url.toString()}`

  if (normalizedMethod === 'GET' && cache && memoryCache.has(cacheKey)) {
    const entry = memoryCache.get(cacheKey)

    if (Date.now() - entry.createdAt < cacheTtl) {
      return clone(entry.value)
    }
  }

  const requestHeaders = {
    Accept: 'application/json',
    'X-Guest-Key': getGuestKey(),
    ...headers,
  }
  const token = getAuthToken()

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`
  }

  const requestOptions = {
    method: normalizedMethod,
    headers: requestHeaders,
    signal,
  }

  if (body !== undefined) {
    if (body instanceof FormData) {
      requestOptions.body = body
    } else {
      requestHeaders['Content-Type'] = requestHeaders['Content-Type'] || 'application/json'
      requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body)
    }
  }

  const response = await fetch(url, requestOptions)
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const error = new Error(payload?.message || `API failed with status ${response.status}`)
    error.status = response.status
    error.payload = payload
    throw error
  }

  const data = unwrap(payload)

  if (normalizedMethod === 'GET' && cache) {
    memoryCache.set(cacheKey, {
      createdAt: Date.now(),
      value: clone(data),
    })
  }

  return data
}

const collectionItems = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.data?.data)) return payload.data.data
  return []
}

export const storageUrl = (path) => {
  if (!path) return ''

  const value = String(path)

  if (value.startsWith('http')) return value
  if (value.startsWith('/storage/')) return `${API_BASE_URL.replace(/\/api$/, '')}${value}`

  return `${STORAGE_BASE_URL}/${value.replace(/^\/+/, '')}`
}

export const getThumbnailUrl = (video) => {
  if (!video) return '/placeholder.jpg'

  return storageUrl(video.thumbnail_url || video.thumbnail) || '/placeholder.jpg'
}

export const getVideoSourceUrl = (video) => {
  if (!video) return ''

  return storageUrl(
    video.stream_full_url ||
      video.compressed_video_full_url ||
      video.video_url ||
      video.stream_url ||
      video.compressed_video_url ||
      video.video_file,
  )
}

export const categoryName = (video) => {
  if (!video) return 'Uncategorized'
  if (typeof video.category === 'object' && video.category?.name) return video.category.name
  if (typeof video.category === 'string') return video.category

  return 'Uncategorized'
}

export const formatNumber = (value) => {
  const number = Number(value || 0)

  if (number >= 1_000_000_000) return `${(number / 1_000_000_000).toFixed(number >= 10_000_000_000 ? 0 : 1)}B`
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(number >= 10_000_000 ? 0 : 1)}M`
  if (number >= 1_000) return `${(number / 1_000).toFixed(number >= 10_000 ? 0 : 1)}K`

  return String(Math.floor(number))
}

export const formatDate = (value) => {
  if (!value) return 'Recently added'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Recently added'

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export const api = {
  getHome() {
    return apiRequest('/home')
  },

  getVideos(params = {}) {
    return apiRequest('/videos', { query: params })
  },

  async getAllVideos(params = {}) {
    const all = []
    const perPage = params.per_page || 100
    let page = params.page || 1
    let lastPage = 1

    do {
      const payload = await apiRequest('/videos', {
        query: { ...params, per_page: perPage, page },
      })

      all.push(...collectionItems(payload))
      lastPage = Number(payload?.meta?.last_page || page)
      page += 1
    } while (page <= lastPage)

    return all
  },

  getVideo(id) {
    return apiRequest(`/videos/${id}`, { cache: false })
  },

  getCategories(params = {}) {
    return apiRequest('/categories', { query: params })
  },

  getComments(id) {
    return apiRequest(`/videos/${id}/comments`, { cache: false })
  },

  recordView(id) {
    return apiRequest(`/videos/${id}/view`, { method: 'POST', cache: false })
  },

  likeVideo(id) {
    return apiRequest(`/videos/${id}/like`, { method: 'POST', cache: false })
  },

  dislikeVideo(id) {
    return apiRequest(`/videos/${id}/dislike`, { method: 'POST', cache: false })
  },

  favoriteVideo(id) {
    return apiRequest(`/videos/${id}/favorite`, { method: 'POST', cache: false })
  },

  reportVideo(id, reason, details = '') {
    return apiRequest(`/videos/${id}/report`, {
      method: 'POST',
      cache: false,
      body: { reason, details },
    })
  },
}
