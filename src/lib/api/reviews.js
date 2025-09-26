import { api, buildUrl } from '../api'

// Get all reviews for a movie
export async function getReviews(movieId) {
  return api(`/api/movies/${movieId}/reviews`)
}

// Create or replace the current user's review for a movie
export async function addOrUpdateMyReview(movieId, { rating, text }, token) {
  return api(`/api/movies/${movieId}/reviews`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify({ rating, text }),
  })
}

// Partially update my review (sends JSON patch object)
export async function patchMyReview(movieId, reviewId, patch, token) {
  return api(`/api/movies/${movieId}/reviews/${reviewId}`, {
    method: 'PATCH',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(patch),
  })
}

// Delete my review; expects 204 No Content on success
export async function deleteMyReview(movieId, reviewId, token) {
  await api(`/api/movies/${movieId}/reviews/${reviewId}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  return true
}

// Fetch paginated latest reviews for public feed
export async function fetchLatestReviews({ page = 1, limit = 20 } = {}) {
  const url = buildUrl(`/api/reviews/latest?page=${encodeURIComponent(String(page))}&limit=${encodeURIComponent(String(limit))}`)
  return api(url)
}


