// Get all reviews for a movie
export async function getReviews(movieId) {
  const res = await fetch(`/api/movies/${movieId}/reviews`);
  if (!res.ok) throw new Error('Failed to load reviews');
  return res.json();
}

// Create or replace the current user's review for a movie
export async function addOrUpdateMyReview(movieId, { rating, text }, token) {
  const res = await fetch(`/api/movies/${movieId}/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ rating, text }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || 'Failed to save review');
  return data;
}

// Partially update my review (sends JSON patch object)
export async function patchMyReview(movieId, reviewId, patch, token) {
  const res = await fetch(`/api/movies/${movieId}/reviews/${reviewId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(patch),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || 'Failed to update review');
  return data;
}

// Delete my review; expects 204 No Content on success
export async function deleteMyReview(movieId, reviewId, token) {
  const res = await fetch(`/api/movies/${movieId}/reviews/${reviewId}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status !== 204) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || data.message || 'Failed to delete review');
  }
  return true;
}

// Fetch paginated latest reviews for public feed
export async function fetchLatestReviews({ page = 1, limit = 20 } = {}) {
  const url = new URL('/api/reviews/latest', window.location.origin);
  url.searchParams.set('page', String(page));
  url.searchParams.set('limit', String(limit));
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || 'Failed to load latest reviews');
  return data;
}


