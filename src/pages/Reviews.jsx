
import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchMovies, fetchGenres } from '../lib/api/search';
import '../components/RatingModal'

const Review = () => {
  const location = useLocation();
  const { t, i18n } = useTranslation('common');
  const langToTMDB = (lng) => (lng?.startsWith('fi') ? 'fi-FI' : 'en-US');
  const language = langToTMDB(i18n.language);

  const [sp, setSp] = useSearchParams();
  const q = sp.get('q') || '';
  const page = Number(sp.get('page') || 1);
  const genreParam = sp.get('genre') || '';
  const minRating = Number(sp.get('minRating') || 0);
  const yearFrom = Number(sp.get('yearFrom') || 0);
  const yearTo = Number(sp.get('yearTo') || 0);
  const sort = sp.get('sort') || '';

  const [genres, setGenres] = useState([]);
  const [data, setData] = useState({ page, total_pages: 0, total_results: 0, results: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);


  useEffect(() => {
    fetchGenres(language)
      .then((d) => setGenres(d.genres || []))
      .catch(() => setGenres([]));
  }, [language]);

  
  useEffect(() => {
    if (!q) return;
    setLoading(true);
    setError(null);

    fetchMovies({ q, page, language, genre: genreParam, minRating, yearFrom, yearTo, sort })
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [q, page, language, genreParam, minRating, yearFrom, yearTo, sort]);

  const updateParams = (updates) => {
    setSp((prev) => {
      const p = new URLSearchParams(prev);
      Object.entries(updates).forEach(([k, v]) => {
        if (v === '' || v === undefined || v === null) p.delete(k);
        else p.set(k, String(v));
      });
      p.set('page', '1'); 
      return p;
    });
  };

  const selectedGenreIds = new Set(genreParam.split(',').map(Number).filter((n) => !Number.isNaN(n)));

  const toggleGenre = (id) => {
    const next = new Set(selectedGenreIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    const value = Array.from(next).sort((a, b) => a - b).join(',');
    updateParams({ genre: value });
  };


  const genreNameById = new Map();
  genres.forEach((g) => genreNameById.set(g.id, g.name));

  return (
    <div>
      <h1>{t('reviewPage.title')}</h1>

     
      <div>
        <label>{t('filters.genre')}</label>
        <div>
          {genres.map((g) => (
            <button key={g.id} onClick={() => toggleGenre(g.id)}>
              {g.name}
            </button>
          ))}
        </div>
        <label>{t('filters.minRating')}</label>
        <input
          type="range"
          min={0}
          max={10}
          step={0.5}
          value={minRating}
          onChange={(e) => updateParams({ minRating: Number(e.target.value) })}
        />
        <span>{minRating}</span>
      </div>

    
      <div>
        {loading && <p>{t('loading')}</p>}
        {error && <p>{error}</p>}
        {!loading && !data.results.length && <p>{t('noResults')}</p>}
        <div>
          {data.results.map((m) => (
            <div key={m.id}>
              <Link to={`/movies/${m.id}`} state={{ from: location }}>
                <img src={`https://image.tmdb.org/t/p/w342${m.poster_path}`} alt={m.title} />
                <h2>{m.title}</h2>
                <p>{m.release_date}</p>
                <p>⭐ {m.vote_average}</p>
              </Link>
            </div>
          ))}
        </div>
      </div>

    
      <div>
        {data.total_pages > 1 && (
          <div>
            <button onClick={() => updateParams({ page: Math.max(1, page - 1) })}>Previous</button>
            <span>{page} / {data.total_pages}</span>
            <button onClick={() => updateParams({ page: Math.min(data.total_pages, page + 1) })}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Review;