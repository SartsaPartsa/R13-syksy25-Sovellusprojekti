export async function fetchMovie(id, language = 'fi-FI') {
  const res = await fetch(`/api/movies/${id}?language=${encodeURIComponent(language)}`)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Movie fetch failed (${res.status}): ${text}`)
  }
  return res.json()
}


