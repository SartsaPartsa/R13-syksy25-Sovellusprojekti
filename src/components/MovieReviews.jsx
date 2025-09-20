// src/components/MovieReviews.jsx
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getReviews, addOrUpdateMyReview, deleteMyReview } from '../lib/api/reviews';
import { useTranslation } from 'react-i18next';
// предположим, что в UserProvider у тебя есть useUser() / useAuth() с { user, token }
import { useUser } from '../context/UserProvider'; // если хук называется иначе — подставь свой

export default function MovieReviews({ movieId: propMovieId }) {
  const { t } = useTranslation('common');
  const routeParams = useParams();
  const movieId = Number(propMovieId ?? routeParams.id);

  const { user, token } = useUser(); // { id, email }, token (JWT)
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // форма моего отзыва
  const [myRating, setMyRating] = useState(0);
  const [myText, setMyText] = useState('');
  const [saving, setSaving] = useState(false);

  const myReview = useMemo(
    () => list.find(r => user && r.user_id === user.id),
    [list, user]
  );

  useEffect(() => {
    let ignore = false;
    setLoading(true); setErr('');
    getReviews(movieId)
      .then(rows => { if (!ignore) setList(rows || []); })
      .catch(e => { if (!ignore) setErr(e.message || 'Failed to load reviews'); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [movieId]);

  // предзаполняем форму, если свой отзыв уже есть
  useEffect(() => {
    if (myReview) {
      setMyRating(myReview.rating);
      setMyText(myReview.text ?? '');
    } else {
      setMyRating(0);
      setMyText('');
    }
  }, [myReview]);

  async function onSave() {
    try {
      setSaving(true);
      setErr('');
      const saved = await addOrUpdateMyReview(movieId, { rating: myRating, text: myText }, token);
      // Обновим список (либо refetch, либо локально)
      const next = list.filter(r => !(user && r.user_id === user.id));
      setList([{ ...saved, user_email: user.email, user_id: user.id }, ...next]);
    } catch (e) {
      setErr(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!myReview) return;
    if (!confirm(t('review.deleteConfirm', 'Poistetaanko arvostelusi?'))) return;
    try {
      setSaving(true);
      setErr('');
      await deleteMyReview(movieId, myReview.id, token);
      setList(list.filter(r => r.id !== myReview.id));
      setMyRating(0);
      setMyText('');
    } catch (e) {
      setErr(e.message || 'Failed to delete');
    } finally {
      setSaving(false);
    }
  }

  function Star({ value }) {
    const active = value <= (myRating || 0);
    return (
      <button
        type="button"
        onClick={() => setMyRating(value)}
        className={`text-lg ${active ? 'text-yellow-400' : 'text-neutral-500'} hover:opacity-80`}
        aria-label={`${value} / 5`}
      >
        ★
      </button>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-medium mb-2">{t('moviePage.reviews', 'Arvostelut')}</h3>

      {/* Мой отзыв (только если залогинен) */}
      {user ? (
        <div className="rounded-2xl ring-1 ring-white/10 bg-neutral-800/50 p-3 mb-4">
          <div className="text-sm text-neutral-300 mb-1">{t('review.myReview', 'Oma arvostelu')}</div>
          <div className="flex items-center gap-1 mb-2">
            {[1,2,3,4,5].map(v => <Star key={v} value={v} />)}
          </div>
          <textarea
            className="w-full rounded-xl bg-neutral-900/60 ring-1 ring-white/10 p-2 outline-none focus:ring-[#F18800]"
            rows={3}
            placeholder={t('review.placeholder', 'Kirjoita kommentti…')}
            value={myText}
            onChange={e => setMyText(e.target.value)}
          />
          <div className="mt-2 flex items-center gap-3">
            <button
              onClick={onSave}
              disabled={saving || myRating < 1 || !myText.trim()}
              className="px-3 py-2 rounded-xl bg-[#F18800] text-black font-medium disabled:opacity-50"
            >
              {t('review.save', 'Tallenna')}
            </button>
            {myReview && (
              <button
                onClick={onDelete}
                disabled={saving}
                className="px-3 py-2 rounded-xl bg-red-500/70 text-white font-medium disabled:opacity-50"
              >
                {t('review.delete', 'Poista')}
              </button>
            )}
            {err && <div className="text-red-300 text-sm">{err}</div>}
          </div>
        </div>
      ) : (
        <div className="mb-4 text-sm text-neutral-400">
          {t('review.loginHint', 'Kirjaudu sisään jättääksesi arvostelun.')}
        </div>
      )}

      {/* Список всех отзывов к фильму */}
      {loading && <div className="text-neutral-400">{t('loading', 'Ladataan…')}</div>}
      {!loading && list.length === 0 && <div className="text-neutral-400">{t('reviewPage.empty', 'Ei arvosteluja vielä.')}</div>}
      <ul className="space-y-3">
        {list.map(r => (
          <li key={r.id} className="rounded-2xl bg-neutral-800/60 ring-1 ring-white/10 p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-neutral-300">{r.user_email}</div>
              <div className="text-yellow-400">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
            </div>
            <div className="mt-2 text-white whitespace-pre-wrap">{r.text}</div>
            <div className="mt-1 text-xs text-neutral-400">{new Date(r.created_at).toLocaleString()}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
