import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchMovie } from '../lib/api/movies';
import FavoriteButton from '../components/FavoriteButton';
import MovieReviews from '../components/MovieReviews';

export default function MovieDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation('common');
  const tmdbLang = i18n.language?.startsWith('fi') ? 'fi-FI' : 'en-US';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;
    setLoading(true); setError(null);
    // load movie data from TMDB
    fetchMovie(id, tmdbLang)
      .then(d => { if (!ignore) setData(d); })
      .catch(e => { if (!ignore) setError(e.message); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [id, tmdbLang]);

  useEffect(() => {
    if (data?.title) {
      const year = (data.release_date || '').slice(0, 4);
      // set page title
      document.title = `${data.title}${year ? ` (${year})` : ''} – Movie App`;
    }
  }, [data]);

  const year = (data?.release_date || '').slice(0, 4);
  const runtimeText = useMemo(
    // format runtime
    () => (data?.runtime ? minsToHhMm(data.runtime, i18n.language) : ''),
    [data, i18n.language]
  );
  const trailerUrl = data?.trailer?.key ? `https://www.youtube.com/watch?v=${data.trailer.key}` : null;

  function goBack() {
    const from = location.state?.from;
    if (from && window.history.length > 1) { navigate(-1); return; }
    if (from?.pathname) { navigate(from.pathname + (from.search || '')); return; }
    navigate('/search');
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="animate-pulse h-64 rounded-2xl bg-neutral-800/60 mb-6" />
        <div className="animate-pulse h-6 w-1/2 rounded bg-neutral-800/60 mb-2" />
        <div className="animate-pulse h-4 w-2/3 rounded bg-neutral-800/60" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <button onClick={goBack} className="mb-4 inline-flex items-center gap-2 text-sm text-neutral-300 hover:text-white">
          ← {t('moviePage.back')}
        </button>
        <div className="rounded-2xl bg-red-500/10 text-red-300 p-4">{error}</div>
      </div>
    );
  }
  if (!data) return null;

  return (
    <div>
      {/* HERO */}
      <div className="relative">
        {data.backdrop_path && (
          <img
            src={`https://image.tmdb.org/t/p/w1280${data.backdrop_path}`}
            alt=""
            className="h-72 w-full object-cover opacity-60"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1220] via-[#0b1220]/70 to-transparent" />
      </div>

      <div className="mx-auto max-w-6xl px-4 -mt-24 relative">
        <div className="rounded-2xl bg-neutral-900/70 ring-1 ring-white/10 backdrop-blur-md p-4 md:p-6">
          <button onClick={goBack} className="mb-4 inline-flex items-center gap-2 text-sm text-neutral-300 hover:text-white">
            ← {t('moviePage.back')}
          </button>

          <div className="grid grid-cols-1 md:grid-cols-[220px,1fr] gap-6">
            {/* Poster */}
            <div>
              {data.poster_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w342${data.poster_path}`}
                  alt={data.title}
                  className="w-[220px] h-[330px] object-cover rounded-xl ring-1 ring-white/10"
                />
              ) : (
                <div className="w-[220px] h-[330px] bg-neutral-800 rounded-xl grid place-items-center text-neutral-400">
                  {t('movie.noImage', 'No image')}
                </div>
              )}
              {trailerUrl && (
                <a
                  href={trailerUrl}
                  target="_blank" rel="noreferrer"
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#F18800] text-black font-medium py-2 hover:opacity-90"
                >
                  ▶ {t('moviePage.trailer')}
                </a>
              )}
            </div>

            {/* Content */}
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-white">
                {data.title} {year && <span className="text-white/70">({year})</span>}
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-neutral-300">
                {runtimeText && <span>{runtimeText}</span>}
                {data.certification && <span className="rounded border border-white/20 px-1.5 py-0.5">{data.certification}</span>}
                {data.genres?.length > 0 && (
                  <span className="flex flex-wrap gap-2">
                    {data.genres.map(g => (
                      <span key={g.id} className="rounded-full bg-neutral-800/70 px-2 py-0.5 ring-1 ring-white/10">{g.name}</span>
                    ))}
                  </span>
                )}
                <span className="inline-flex items-center gap-2">
                  ⭐ {data.vote_average ?? '–'}
                  <FavoriteButton movieId={Number(id)} inline className="ml-1" />
                </span>
              </div>

              {data.overview && (
                <>
                  <h2 className="mt-4 text-lg font-medium">{t('moviePage.overview')}</h2>
                  <p className="mt-1 text-neutral-300 leading-relaxed">{data.overview}</p>
                </>
              )}

              {data.directors?.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm text-neutral-400">{t('moviePage.director')}</div>
                  <div className="text-neutral-200">{data.directors.map(d => d.name).join(', ')}</div>
                </div>
              )}
            </div>
          </div>

          {/* Cast */}
          {data.cast?.length > 0 && (
            <section className="mt-6">
              <h3 className="text-lg font-medium mb-2">{t('moviePage.cast')}</h3>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                {data.cast.map(p => (
                  <div key={p.id} className="shrink-0 w-28">
                    {p.profile_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w185${p.profile_path}`}
                        alt={p.name}
                        className="w-28 h-36 object-cover rounded-xl ring-1 ring-white/10"
                      />
                    ) : (
                      <div className="w-28 h-36 bg-neutral-800 rounded-xl grid place-items-center text-neutral-500">—</div>
                    )}
                    <div className="mt-1 text-sm text-white line-clamp-1">{p.name}</div>
                    <div className="text-xs text-neutral-400 line-clamp-1">{p.character}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Reviews block */}
          <section className="mt-8">
            <MovieReviews />
          </section>

          {/* Recommendations */}
          {data.recommendations?.length > 0 && (
            <section className="mt-8">
              <h3 className="text-lg font-medium mb-3">{t('moviePage.recommendations')}</h3>
              <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {data.recommendations.map(m => (
                  <li key={m.id} className="group bg-neutral-800/60 rounded-2xl overflow-hidden ring-1 ring-white/10 hover:ring-[#F18800]/60 transition">
                    <Link to={`/movies/${m.id}`} state={{ from: location }} className="block">
                      {m.poster_path ? (
                        <img src={`https://image.tmdb.org/t/p/w342${m.poster_path}`} alt={m.title} className="w-full h-64 object-cover group-hover:scale-[1.02] transition-transform" />
                      ) : (
                        <div className="w-full h-64 bg-neutral-700 grid place-items-center text-neutral-400">{t('movie.noImage', 'No image')}</div>
                      )}
                      <div className="p-3">
                        <div className="font-medium text-white line-clamp-1">{m.title}</div>
                        <div className="text-sm text-neutral-400">
                          {(m.release_date || '').slice(0, 4)} • ⭐ {m.vote_average ?? '–'}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper functions
function minsToHhMm(mins, lang = 'en') {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (lang.startsWith('fi')) return `${h} h ${m} min`;
  return `${h}h ${m}m`;
}
