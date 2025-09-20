export async function getReviews(movieId) {
  const res = await fetch(`/api/movies/${movieId}/reviews`);
  if (!res.ok) throw new Error('Failed to load reviews');
  return res.json();
}

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

export async function fetchLatestReviews({ page=1, limit=20 } = {}) {
  const url = new URL('/api/reviews/latest', window.location.origin);
  url.searchParams.set('page', String(page));
  url.searchParams.set('limit', String(limit));
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || 'Failed to load latest reviews');
  return data;
}



