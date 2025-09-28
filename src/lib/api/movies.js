// Movie-related API helpers used by the app
import { api } from '../api'

export async function fetchMovie(id, language = 'fi-FI') {
  return api(`/api/movies/${id}?language=${encodeURIComponent(language)}`)
}

export async function fetchPopularToday(language = 'fi-FI') {
  // Get today's popular list (backend proxies TMDB)
  return api(`/api/movies/popular/today?language=${encodeURIComponent(language)}`)
}

