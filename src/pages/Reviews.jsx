// src/pages/Reviews.jsx
import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchLatestReviews } from '../lib/api/reviews';

export default function Reviews() {
  const { t } = useTranslation('common');
  const location = useLocation();
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
      .then(d => { if (!ignore) { setItems(d.items || []); setTotal(d.total || 0); } })
      .catch(e => !ignore && setError(e.message || 'Failed to load latest reviews'))
      .finally(() => !ignore && setLoading(false));
    return () => { ignore = true; };
  }, [page, limit]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const setPage = (p) => setSp(prev => { const q = new URLSearchParams(prev); q.set('page', String(p)); q.set('limit', String(limit)); return q; });

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
          <li key={r.id} className="rounded-2xl bg-neutral-800/60 ring-1 ring-white/10 p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-neutral-300">{r.user_email}</div>
              <div className="text-yellow-400">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
            </div>
            <div className="mt-2 text-white whitespace-pre-wrap">{r.text}</div>
            <div className="mt-1 text-xs text-neutral-400">{new Date(r.created_at).toLocaleString()}</div>
            <div className="mt-2">
              <Link to={`/movies/${r.movie_id}`} state={{ from: location }} className="inline-flex items-center gap-2 text-sm underline text-[#F18800] hover:opacity-90">
                {t('reviewPage.openMovie', 'Avaa elokuvan sivu')}
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </Link>
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
