const BASE_URL = process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3';
const TOKEN = process.env.TMDB_V4_TOKEN;

if (!TOKEN) {
  throw new Error('TMDB_V4_TOKEN puuttuu .env:stä');
}

export async function searchMovies({ query, page = 1, language = 'fi-FI' }) {
  if (!query) throw new Error('query parameter is required');

  const url = new URL(`${BASE_URL}/search/movie`);
  url.searchParams.set('query', query);
  url.searchParams.set('include_adult', 'false');
  url.searchParams.set('language', language);
  url.searchParams.set('page', String(page));

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      accept: 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`TMDB error ${res.status}: ${text}`);
  }

  return res.json();
}

export async function fetchGenres(language = 'fi-FI') {
  const url = new URL(`${BASE_URL}/genre/movie/list`)
  url.searchParams.set('language', language)

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      accept: 'application/json',
    },
  })

  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`TMDB genres error ${res.status}: ${t}`)
  }
  
  return res.json()
}

export async function getMovieDetails(id, language = 'fi-FI') {
  if (!id) throw new Error('movie id is required')

  const url = new URL(`${BASE_URL}/movie/${id}`)
  url.searchParams.set('language', language)
  url.searchParams.set('append_to_response', 'credits,videos,images,recommendations,release_dates')

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}`, accept: 'application/json' },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`TMDB detail error ${res.status}: ${text}`)
  }

  return res.json()
}
