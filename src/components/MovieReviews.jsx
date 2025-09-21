import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getReviews, addOrUpdateMyReview, deleteMyReview } from '../lib/api/reviews';
import { useTranslation } from 'react-i18next';
import { useUser } from '../context/UserProvider';
import { toast } from 'react-toastify';

export default function MovieReviews({ movieId: propMovieId }) {
  const { t } = useTranslation('common');
  const routeParams = useParams();
  const movieId = Number(propMovieId ?? routeParams.id);

  const { authUser, token } = useUser(); // { id, email }, token (JWT)
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // форма моего отзыва
  const [myRating, setMyRating] = useState(0);
  const [myText, setMyText] = useState('');
  const [saving, setSaving] = useState(false);

  const myReview = useMemo(
    () => list.find(r => authUser && r.user_id === authUser.id),
    [list, authUser]
  );

  useEffect(() => {
    let ignore = false;
    setLoading(true); setErr('');
    getReviews(movieId)
      .then(rows => { if (!ignore) setList(rows || []); })
      .catch(e => { 
        if (!ignore) setErr(e.message || 'Failed to load reviews'); 
        toast.error(t('review.loadFailed', 'Arvostelujen lataus epäonnistui.'))
      })
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
  const tid = toast.loading(t('review.saving', 'Tallennetaan…'), { closeButton: true });
  const saved = await addOrUpdateMyReview(movieId, { rating: myRating, text: myText }, token);
      // Обновим список (либо refetch, либо локально)
  const next = list.filter(r => !(authUser && r.user_id === authUser.id));
  setList([{ ...saved, user_email: authUser.email, user_id: authUser.id }, ...next]);
  toast.update(tid, { render: t('review.saved', 'Arvostelu tallennettu.'), type: 'success', isLoading: false, autoClose: 2200, closeButton: true });
    } catch (e) {
      setErr(e.message || 'Failed to save');
  toast.error(t('review.saveFailed', 'Tallennus epäonnistui.'), { closeButton: true });
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!myReview) return;
    const ok = await confirmReviewDeleteToast(t);
    if (!ok) return;
    try {
      setSaving(true);
      setErr('');
  const tid = toast.loading(t('review.deleting', 'Poistetaan…'), { closeButton: true });
      await deleteMyReview(movieId, myReview.id, token);
      setList(list.filter(r => r.id !== myReview.id));
      setMyRating(0);
      setMyText('');
  toast.update(tid, { render: t('review.deleted', 'Arvostelu poistettu.'), type: 'success', isLoading: false, autoClose: 2200, closeButton: true });
    } catch (e) {
      setErr(e.message || 'Failed to delete');
  toast.error(t('review.deleteFailed', 'Poisto epäonnistui.'), { closeButton: true });
    } finally {
      setSaving(false);
    }
  }

  // Poista tietty listan arvostelu (vain omat)
  async function onDeleteItem(r) {
  if (!r || !authUser || r.user_id !== authUser.id) return;
    const ok = await confirmReviewDeleteToast(t);
    if (!ok) return;
    try {
  const tid = toast.loading(t('review.deleting', 'Poistetaan…'), { closeButton: true });
      await deleteMyReview(movieId, r.id, token);
      setList(prev => prev.filter(x => x.id !== r.id));
      // Jos poistettu on juuri oma "myReview", nollaa lomake
      if (myReview && myReview.id === r.id) {
        setMyRating(0);
        setMyText('');
      }
  toast.update(tid, { render: t('review.deleted', 'Arvostelu poistettu.'), type: 'success', isLoading: false, autoClose: 2200, closeButton: true });
    } catch (e) {
  toast.error(t('review.deleteFailed', 'Poisto epäonnistui.'), { closeButton: true });
    }
  }

  // Styled confirmation (same visual style as group/account delete toast)
  function confirmReviewDeleteToast(t) {
    return new Promise((resolve) => {
      let id
      id = toast(() => (
        <div className="space-y-3 w-[420px] max-w-[90vw]">
          <p className="font-semibold text-black">{t('review.deleteTitle', 'Poista arvostelu?')}</p>
          <p className="text-sm text-black">{t('review.deleteConfirm', 'Poistetaanko arvostelusi?')}</p>
          <div className="w-full flex justify-end gap-2 pt-1">
            <button onClick={() => { toast.dismiss(id); resolve(true) }} className="px-3 py-1.5 rounded-md bg-red-500/20 hover:bg-red-500/30 border border-red-600 text-red-600">
              {t('review.delete', 'Poista')}
            </button>
          </div>
        </div>
      ), { autoClose: false, closeOnClick: false, closeButton: true, draggable: false, hideProgressBar: true })
    })
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

      {/* Oma arvostelu: näytetään lomake vain jos käyttäjällä EI ole vielä arvostelua */}
  {!loading && authUser && !myReview ? (
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
              className="px-3 py-2 rounded-md bg-[#F18800] text-black font-medium disabled:opacity-50"
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
      ) : !authUser ? (
        <div className="mb-4 text-sm text-neutral-400">
          {t('review.loginHint', 'Kirjaudu sisään jättääksesi arvostelun.')}
        </div>
      ) : null}

      {/* Список всех отзывов к фильму */}
      {loading && <div className="text-neutral-400">{t('loading', 'Ladataan…')}</div>}
      {!loading && list.length === 0 && <div className="text-neutral-400">{t('reviewPage.empty', 'Ei arvosteluja vielä.')}</div>}
      <ul className="space-y-3">
        {list.map(r => (
          <li key={r.id} className="rounded-2xl bg-neutral-800/60 ring-1 ring-white/10 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-yellow-400">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
              {authUser?.id === r.user_id && (
                <button
                  onClick={() => onDeleteItem(r)}
                  className="px-3 py-2 rounded-md bg-red-500/20 hover:bg-red-500/30 border border-red-600 text-red-200 text-sm"
                >
                  {t('review.delete', 'Poista')}
                </button>
              )}
            </div>
            <div className="mt-2 text-white whitespace-pre-wrap">{r.text}</div>
            <div className="mt-1 text-sm text-neutral-300">{r.user_email}</div>
            <div className="mt-1 text-xs text-neutral-400">{new Date(r.created_at).toLocaleString()}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
