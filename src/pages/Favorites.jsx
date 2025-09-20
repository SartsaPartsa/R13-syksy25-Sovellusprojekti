import { useContext, useEffect, useMemo, useState } from "react"
import { UserContext } from "../context/UserContext"
import { useTranslation } from "react-i18next"
import { Link, useLocation, useSearchParams } from "react-router-dom"
import { fetchMovie } from "../lib/api/movies"
import { api, FavoritesAPI } from "../lib/api"
import { toast } from 'react-toastify'

// Suosikkinäkymä näyttää käyttäjän suosikkielokuvat listana
// Vaatii kirjautumisen toimiakseen
export default function Favorites() {
  // Käännösfunktio monikielisyyttä varten
  const { t } = useTranslation('common')
  // Käyttäjän tiedot ja suosikkilista contextista
  const { authUser, favorites, setFavorites } = useContext(UserContext)
  // Lista elokuvista joista näytetään tarkemmat tiedot (posterit, nimet jne)
  const [movies, setMovies] = useState([])
  // Listojen valikon tila ja data
  const [listsOpen, setListsOpen] = useState(false)
  const [sharedLists, setSharedLists] = useState([])
  const [myShare, setMyShare] = useState({ is_shared: false, display_name: '', slug: null })
  const [loadingShared, setLoadingShared] = useState(false)
  const [errorShared, setErrorShared] = useState(null)
  const [sp, setSp] = useSearchParams()
  const shareSlug = sp.get('share') || null
  // Tarvitaan, jotta voidaan välittää tieto mistä tultiin (Suosikit)
  const location = useLocation()

  // Haetaan suosikkielokuvat kun sivu latautuu, käyttäjä vaihtuu tai katsellaan jaettua listaa
  useEffect(() => {
    async function loadOwnFavorites() {
      if (!authUser) { setMovies([]); return }
      try {
        const favoritesResponse = await api(`/api/favorites/${authUser.id}`)
        const movieIds = favoritesResponse.map(f => f.movie_id)
        setFavorites(new Set(movieIds))
        if (movieIds.length === 0) { setMovies([]); return }
        const results = await Promise.all(movieIds.map(async (id) => {
          try { return await fetchMovie(id) } catch { return null }
        }))
        setMovies(results.filter(Boolean))
      } catch (err) {
        console.error("Suosikkien lataus epäonnistui", err); setMovies([])
        try { toast.error(t('favoritesShare.fetchFavoritesFailed')) } catch {}
      }
    }

    async function loadSharedFavorites(slug) {
      try {
        const favs = await FavoritesAPI.sharedMovies(slug)
        const movieIds = (favs || []).map(f => f.movie_id)
        if (movieIds.length === 0) { setMovies([]); return }
        const results = await Promise.all(movieIds.map(async (id) => {
          try { return await fetchMovie(id) } catch { return null }
        }))
        setMovies(results.filter(Boolean))
      } catch (e) {
        console.error('Jaetun listan lataus epäonnistui', e)
        setMovies([])
        try { toast.error(t('favoritesShare.fetchSharedFailed')) } catch {}
      }
    }

    if (shareSlug) loadSharedFavorites(shareSlug)
    else loadOwnFavorites()
  }, [authUser, shareSlug])

  // Lataa jaetut listat ja oman jaon tila
  useEffect(() => {
    let ignore = false
    async function load() {
      setLoadingShared(true); setErrorShared(null)
      try {
        const [shared, mine] = await Promise.all([
          FavoritesAPI.sharedLists().catch(() => []),
          authUser ? FavoritesAPI.myShare().catch(() => ({ is_shared: false, display_name: '', slug: null })) : Promise.resolve({ is_shared: false, display_name: '', slug: null })
        ])
        if (!ignore) { setSharedLists(shared || []); setMyShare(mine || { is_shared: false, display_name: '', slug: null }) }
      } catch (e) {
        if (!ignore) setErrorShared(e.message)
        try { toast.error(t('favoritesShare.loadShareFailed')) } catch {}
      } finally { if (!ignore) setLoadingShared(false) }
    }
    load()
    return () => { ignore = true }
  }, [authUser])

  // Reaaliaikaiset päivitykset jaettujen listojen luetteloon (SSE)
  useEffect(() => {
    let es
    let retry
    let cancelled = false
    const start = () => {
      try {
        es = new EventSource('/api/favorites/stream')
        const reload = async () => {
          try {
            const shared = await FavoritesAPI.sharedLists().catch(() => [])
            if (!cancelled) setSharedLists(shared || [])
            // jos katsellaan jaettua listaa, varmista että se on yhä jaossa
            if (!cancelled && shareSlug) {
              const stillExists = (shared || []).some(s => s.slug === shareSlug)
              if (!stillExists) {
                // poistui jaosta -> palataan omiin
                setSp(prev => { const p = new URLSearchParams(prev); p.delete('share'); return p })
                try { toast.info(t('favoritesShare.listNoLongerShared')) } catch {}
              }
            }
          } catch {}
        }
        es.addEventListener('favorites-shared-changed', reload)
        es.onerror = () => { try { es?.close() } catch {}; if (!cancelled) retry = setTimeout(start, 3000) }
      } catch { if (!cancelled) retry = setTimeout(start, 3000) }
    }
    start()
    return () => { cancelled = true; try { es?.close() } catch {}; if (retry) clearTimeout(retry) }
  }, [shareSlug, setSp])

  const viewingLabel = useMemo(() => {
    if (!shareSlug) return null
    const match = sharedLists.find(s => s.slug === shareSlug)
    return match?.display_name || 'Jaettu suosikkilista'
  }, [shareSlug, sharedLists])

  if (!authUser) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 text-center">
        {t("favoritesPage.loginRequired")}
      </div>
    );
  }

  // Ei palauteta tässä vaikka lista olisi tyhjä, jotta yläosan "Listat"-paneeli on käytettävissä

  // Funktio elokuvan poistamiseksi suosikeista
  // - Poistaa elokuvan backendistä
  // - Päivittää paikallisen suosikkilistan
  // - Päivittää näytettävien elokuvien listan
  const removeFavorite = async (movieId) => {
    // Tarkistetaan että käyttäjä on kirjautunut
    if (!authUser) return;

    try {
      // Poistetaan elokuva backendistä
      const response = await fetch(`/api/favorites/${authUser.id}/${movieId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Poistetaan elokuva paikallisesta suosikkilistasta
        const newFavorites = new Set(favorites);
        newFavorites.delete(movieId);
        setFavorites(newFavorites);
        
        // Poistetaan elokuva näytettävien elokuvien listasta
        setMovies(movies.filter(m => m.id !== movieId));
      }
    } catch (error) {
      console.error('Virhe suosikin poistamisessa:', error);
      try { toast.error(t('favoritesShare.removeFailed')) } catch {}
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Title + compact controls */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t("favoritesPage.title")}</h1>
        <div className="flex items-center gap-2">
          {/* Lists toggle */}
          <button
            type="button"
            aria-expanded={listsOpen}
            onClick={() => setListsOpen(v => !v)}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 bg-neutral-800/70 hover:bg-neutral-700/70 ring-1 ring-white/10"
          >
            <svg className={`h-4 w-4 transition ${listsOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M8 12h8m-5 4h2" />
            </svg>
            <span className="text-sm">{t('favoritesShare.listsButton')}</span>
          </button>
        </div>
      </div>

      {/* Info rivit */}
      {shareSlug && (
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-neutral-300">
          <span>{t('favoritesShare.viewing')}: <span className="text-white font-medium">{viewingLabel}</span></span>
          <button
            className="px-3 py-1.5 rounded-xl bg-neutral-800/70 hover:bg-neutral-700/70 ring-1 ring-white/10"
            onClick={() => { setSp(prev => { const p = new URLSearchParams(prev); p.delete('share'); return p }) }}
          >{t('favoritesShare.backToMine')}</button>
        </div>
      )}

      {/* Lists panel */}
      <div
        className={`rounded-2xl bg-neutral-800/60 backdrop-blur-md ring-1 ring-white/10 transition-all overflow-hidden ${
          listsOpen ? 'max-h-[900px] opacity-100 p-4 mb-6' : 'max-h-0 opacity-0 p-0 mb-0'
        }`}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Jaetut listat */}
          <div>
            <div className="text-sm text-neutral-300 mb-2">{t('favoritesShare.sharedListsTitle')}</div>
            {loadingShared ? (
              <div className="text-neutral-400 text-sm">{t('favoritesShare.loadingShared')}</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(sharedLists || []).length === 0 && (
                  <div className="text-neutral-400 text-sm">{t('favoritesShare.noneSharedYet')}</div>
                )}
                {(sharedLists || []).map((s) => (
                  <button
                    key={s.slug}
                    type="button"
                    onClick={() => setSp(prev => { const p = new URLSearchParams(prev); p.set('share', s.slug); return p })}
                    className={`px-3 py-1.5 rounded-full text-sm border transition ${
                      shareSlug === s.slug
                        ? 'bg-[#F18800] text-black border-[#F18800]'
                        : 'bg-neutral-900/50 text-neutral-300 border-neutral-700 hover:border-neutral-500'
                    }`}
                    title={`${t('favoritesShare.showListPrefix')} ${s.display_name}`}
                  >
                    {s.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Oma jako */}
          <div className="md:justify-self-end w-full">
            <div className="text-sm text-neutral-300 mb-2">{t('favoritesShare.myShareTitle')}</div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <label className="text-sm text-neutral-300">{t('favoritesShare.nameLabel')}</label>
                <input
                  type="text"
                  className="flex-1 rounded-md bg-neutral-900/60 px-3 py-2 ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#F18800]"
                  value={myShare.display_name || ''}
                  onChange={(e) => setMyShare((prev) => ({ ...prev, display_name: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-neutral-300">{t('favoritesShare.sharingLabel')}</label>
                <button
                  type="button"
                  className={`px-3 py-1.5 rounded-full text-sm border transition ${
                    myShare.is_shared ? 'bg-[#F18800] text-black border-[#F18800]' : 'bg-neutral-900/50 text-neutral-300 border-neutral-700 hover:border-neutral-500'
                  }`}
                  onClick={async () => {
                    try {
                      const updated = await FavoritesAPI.updateShare({ is_shared: !myShare.is_shared, display_name: myShare.display_name })
                      setMyShare(updated)
                      const updatedShared = await FavoritesAPI.sharedLists().catch(() => [])
                      setSharedLists(updatedShared)
                      // Toast: sharing toggled
                      try { toast.success(t(updated.is_shared ? 'favoritesShare.shareEnabled' : 'favoritesShare.shareDisabled')) } catch {}
                    } catch (e) { console.error(e); try { toast.error(t('favoritesShare.updateFailed')) } catch {} }
                  }}
                >
                  {myShare.is_shared ? t('favoritesShare.sharingOn') : t('favoritesShare.sharingOff')}
                </button>
              </div>
              {myShare.is_shared && (
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    className="flex-1 rounded-md bg-neutral-900/60 px-3 py-2 ring-1 ring-white/10 text-sm"
                    value={`${window.location.origin}/shared/${myShare.slug}`}
                  />
                  <button
                    className="px-3 py-2 rounded-xl bg-neutral-800/70 hover:bg-neutral-700/70 ring-1 ring-white/10 text-sm"
                    onClick={async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/shared/${myShare.slug}`); try { toast.success(t('favoritesShare.linkCopied')) } catch {} } catch { try { toast.error(t('favoritesShare.copyFailed')) } catch {} } }}
                  >{t('favoritesShare.copyLink')}</button>
                  <button
                    className="px-3 py-2 rounded-xl bg-neutral-800/70 hover:bg-neutral-700/70 ring-1 ring-white/10 text-sm"
                    onClick={async () => {
                      try {
                        const updated = await FavoritesAPI.updateShare({ is_shared: true, display_name: myShare.display_name })
                        setMyShare(updated)
                        const updatedShared = await FavoritesAPI.sharedLists().catch(() => [])
                        setSharedLists(updatedShared)
                        try { toast.success(t('favoritesShare.nameSaved')) } catch {}
                      } catch { try { toast.error(t('favoritesShare.updateFailed')) } catch {} }
                    }}
                  >{t('favoritesShare.saveName')}</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {movies.length === 0 ? (
        <div className="text-center text-neutral-300 py-8">{shareSlug ? t('favoritesShare.emptyShared') : t("favoritesPage.empty")}</div>
      ) : (
      <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {movies.map((m) => (
          <li key={m.id}
            className="relative group bg-neutral-800/60 rounded-2xl overflow-hidden ring-1 ring-white/10 hover:ring-[#F18800]/60 transition"
          >
            <Link to={`/movies/${m.id}`} state={{ from: location }} className="block">
              <div className="relative">
                {m.poster_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w342${m.poster_path}`}
                    alt={m.title}
                    className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-[1.02]"/>
                ) : (
                  <div className="w-full h-64 bg-neutral-700 flex items-center justify-center text-neutral-400">
                    {t("movie.noImage")}
                  </div>
                )}
                <div className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white ring-1 ring-white/10">
                  ⭐ {m.vote_average ?? "–"}
                </div>
              </div>
              {!shareSlug && (
                <button
                  onClick={(e) => { e.preventDefault(); removeFavorite(m.id); }}
                  className="absolute top-2 right-2 p-2 text-red-500 hover:text-red-600 transition-colors"
                  aria-label="Poista suosikeista"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-6 h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                    />
                  </svg>
                </button>
              )}
              <div className="p-3">
                <div className="font-medium text-white line-clamp-1">{m.title}</div>
                <div className="text-sm text-neutral-400">
                  {(m.release_date || "").slice(0, 4)}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      )}
    </div>
  )
}

