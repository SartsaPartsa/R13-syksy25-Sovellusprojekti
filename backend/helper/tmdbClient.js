// backend/helper/tmdbClient.js
const BASE_URL =
  (process.env.TMDB_BASE_URL ? process.env.TMDB_BASE_URL.replace(/\/+$/, '') : '') ||
  'https://api.themoviedb.org/3';

const TOKEN = process.env.TMDB_V4_TOKEN;


if (!TOKEN) {
  throw new Error('TMDB_V4_TOKEN puuttuu .env:stä (V4 Bearer -token tarvitaan).');
}

// ———————————————————————————————————————————————————————————————————————

async function tmdbGet(path, params = {}, { timeoutMs = 10000 } = {}) {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${TOKEN}`, 
        accept: 'application/json',
      },
      signal: ctrl.signal,
    });
  } catch (netErr) {
    clearTimeout(timer);
    
    throw new Error(`TMDB network error: ${netErr?.message || netErr}`);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    
    let body = '';
    try { body = await res.text(); } catch {}
    const hint =
      res.status === 401
        ? ' (check TMDB_V4_TOKEN — wrong/expired?)'
        : res.status === 404
        ? ' (resource not found)'
        : '';
    throw new Error(
      `TMDB error ${res.status} ${res.statusText} at ${url.pathname}${hint}${body ? `: ${body}` : ''}`
    );
  }

  return res.json();
}
// ———————————————————————————————————————————————————————————————————————

/**
 
 * @param {Object} options
 * @param {string} options.query - 
 * @param {number} [options.page=1] - 1..500
 * @param {string} [options.language='fi-FI']
 * @param {boolean} [options.includeAdult=false]
 */
export async function searchMovies({
  query,
  page = 1,
  language = 'fi-FI',
  includeAdult = false,
}) {
  const q = String(query || '').trim();
  if (!q) throw new Error('query parameter is required');

  const p = Number(page);
  if (!Number.isInteger(p) || p < 1 || p > 500) {
    throw new Error('page must be an integer between 1 and 500');
  }

  return tmdbGet('/search/movie', {
    query: q,
    include_adult: includeAdult ? 'true' : 'false',
    language,
    page: p,
  });
}

/**
 * 
 * @param {string} [language='fi-FI']
 */
export async function fetchGenres(language = 'fi-FI') {
  return tmdbGet('/genre/movie/list', { language });
}

/**

 
 * @param {number|string} id 
 * @param {string} [language='fi-FI']
 */
export async function getMovieDetails(id, language = 'fi-FI') {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error('movie id is required and must be a positive integer');
  }

  return tmdbGet(`/movie/${n}`, {
    language,
    
    append_to_response: 'videos,credits,release_dates,recommendations',
  });
}
