// src/pages/Reviews.jsx
import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchLatestReviews, deleteMyReview } from '../lib/api/reviews';
import { fetchMovie } from '../lib/api/movies';
import { useUser } from '../context/UserProvider';
import { toast } from 'react-toastify';

export default function Reviews() {
  const { t } = useTranslation('common');
  const location = useLocation();
  const { authUser, token } = useUser();
  const [sp, setSp] = useSearchParams();
  const page  = Math.max(1, Number(sp.get('page') || 1));
  const limit = Math.max(1, Math.min(50, Number(sp.get('limit') || 20)));

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    setLoading(true); setError('');
    fetchLatestReviews({ page, limit })
      .then(async d => {
        if (ignore) return;
        const items = Array.isArray(d.items) ? d.items : [];
        // Enrich each review with movie poster, title and year for better card layout
        const movies = await Promise.all(items.map(async (r) => {
          try {
            const m = await fetchMovie(r.movie_id);
            const year = m?.release_date ? new Date(m.release_date).getFullYear() : '';
            return { poster_path: m?.poster_path || '', title: m?.title || m?.name || '', year };
          } catch { return { poster_path: '', title: '', year: '' }; }
        }));
        const enriched = items.map((r, i) => ({ ...r, ...movies[i] }));
        setItems(enriched);
        setTotal(d.total || 0);
      })
      .catch(e => !ignore && setError(e.message || 'Failed to load latest reviews'))
      .finally(() => !ignore && setLoading(false));
    return () => { ignore = true; };
  }, [page, limit]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const setPage = (p) => setSp(prev => { const q = new URLSearchParams(prev); q.set('page', String(p)); q.set('limit', String(limit)); return q; });

  // Confirm review deletion (toast style, same visual language as groups)
  function confirmReviewDeleteToast() {
    return new Promise((resolve) => {
      let id
      id = toast(() => (
        <div className="space-y-3 w-[420px] max-w-[90vw]">
          <p className="font-semibold text-black">{t('review.deleteTitle', 'Poista arvostelu?')}</p>
          <p className="text-sm text-black">{t('review.deleteConfirm', 'Poistetaanko arvostelusi?')}</p>
          <div className="w-full flex justify-end gap-2 pt-1">
            <button onClick={() => { toast.dismiss(id); resolve(true) }} className="px-3 py-1.5 rounded-md bg-red-500/20 hover:bg-red-500/30 border border-red-600 text-red-600">{t('review.delete', 'Poista')}</button>
          </div>
        </div>
  ), { autoClose: false, closeOnClick: false, closeButton: true, draggable: false, hideProgressBar: true })
    })
  }

  async function onDelete(r) {
    if (!authUser || !token) return; // not allowed
    const ok = await confirmReviewDeleteToast();
    if (!ok) return;
  const tid = toast.loading(t('review.deleting', 'Poistetaan…'), { closeButton: true })
    try {
      await deleteMyReview(r.movie_id, r.id, token);
      setItems(prev => prev.filter(x => x.id !== r.id));
  toast.update(tid, { render: t('review.deleted', 'Arvostelu poistettu.'), type: 'success', isLoading: false, autoClose: 2200, closeButton: true });
    } catch (e) {
  toast.update(tid, { render: t('review.deleteFailed', 'Poisto epäonnistui.'), type: 'error', isLoading: false, autoClose: 3500, closeButton: true });
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">{t('reviewPage.title', 'Arvostelut')}</h1>

      {error && <div className="mb-4 rounded-xl bg-red-500/10 text-red-300 p-3">{error}</div>}
      {loading && <div className="text-neutral-400">{t('loading','Ladataan…')}</div>}
      {!loading && !error && items.length === 0 && (
        <div className="text-neutral-400">{t('reviewPage.empty','Ei arvosteluja vielä.')}</div>
      )}

      <ul className="space-y-3">
        {items.map(r => (
          <li key={r.id} className="rounded-2xl border border-white/10 bg-gray-900/60 p-4">
            <div className="flex items-start gap-4">
              {/* Poster thumbnail (clickable – opens movie page) */}
              <Link to={`/movies/${r.movie_id}`} state={{ from: location }} className="shrink-0">
                {r.poster_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w185${r.poster_path}`}
                    alt={(r.title || '')}
                    className="w-20 h-28 md:w-24 md:h-36 object-cover rounded-lg ring-1 ring-white/10 hover:opacity-90 transition"
                  />
                ) : (
                  <div className="w-20 h-28 md:w-24 md:h-36 rounded-lg bg-white/10 ring-1 ring-white/10 grid place-items-center text-white/70 text-xs cursor-pointer hover:bg-white/15">
                    {t('movie.noImage','No image')}
                  </div>
                )}
              </Link>
              <div className="flex-1 min-w-0">
                {/* Title */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={`/movies/${r.movie_id}`} state={{ from: location }} className="block text-white text-xl md:text-2xl font-semibold hover:underline">
                      {(r.title || t('movie.unknown','Tuntematon elokuva'))}{r.year ? ` (${r.year})` : ''}
                    </Link>
                    {/* Byline: email · date · stars */}
                    <div className="mt-1 text-sm text-white/70 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="truncate max-w-[60ch]">{t('reviewPage.by', { email: r.user_email })}</span>
                      <span>· {new Date(r.created_at).toLocaleString()}</span>
                      <span className="text-yellow-400">· {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                    </div>
                  </div>
                  {/* Own review delete */}
                  {authUser?.id === r.user_id && (
                    <button
                      onClick={() => onDelete(r)}
                      className="h-9 px-3 rounded-md bg-red-500/20 hover:bg-red-500/30 border border-red-600 text-red-200 text-sm self-start"
                    >
                      {t('review.delete')}
                    </button>
                  )}
                </div>

                {/* Comment */}
                {r.text && (
                  <div className="mt-3 text-base text-white whitespace-pre-wrap">{r.text}</div>
                )}

                {/* Actions */}
                <div className="mt-4 flex items-center gap-2">
                  <Link to={`/movies/${r.movie_id}`} state={{ from: location }} className="inline-flex items-center gap-2 rounded-md px-4 py-1.5 border border-white/10 bg-white/10 hover:bg-white/15 text-white text-sm">
                    {t('reviewPage.openMovie')}
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </Link>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center gap-3">
          <button onClick={() => setPage(page - 1)} disabled={page <= 1} className="px-3 py-2 rounded-xl bg-neutral-800/70 ring-1 ring-white/10 disabled:opacity-40">
            {t('pagination.prev','Edellinen')}
          </button>
          <span className="text-sm text-neutral-300">{page} / {totalPages}</span>
          <button onClick={() => setPage(page + 1)} disabled={page >= totalPages} className="px-3 py-2 rounded-xl bg-neutral-800/70 ring-1 ring-white/10 disabled:opacity-40">
            {t('pagination.next','Seuraava')}
          </button>
        </div>
      )}
    </div>
  );
}
