// Movie-related API helpers used by the app
export async function fetchMovie(id, language = 'fi-FI') {
  const res = await fetch(`/api/movies/${id}?language=${encodeURIComponent(language)}`)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Movie fetch failed (${res.status}): ${text}`)
  }
  return res.json()
}

export async function fetchPopularToday(language = 'fi-FI') {
  // Get today's popular list (backend proxies TMDB)
  const res = await fetch(`/api/movies/popular/today?language=${encodeURIComponent(language)}`)
  if (res.status === 204) return null
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Popular fetch failed (${res.status}): ${text}`)
  }
  return res.json()
}

