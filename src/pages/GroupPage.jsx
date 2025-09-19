import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { GroupsAPI, getAuthToken } from '../lib/api'
import { fetchMovies } from '../lib/api/search'
import { fetchMovie } from '../lib/api/movies'
import { XMLParser } from 'fast-xml-parser'
import { useUser } from '../context/useUser'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import FancySelect from '../components/FancySelect'

export default function GroupPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const location = useLocation()
    const { t } = useTranslation('common')
    // Data state
    const [group, setGroup] = useState(null)
    const [members, setMembers] = useState([])
    const [err, setErr] = useState('')
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState('movies')
    const [movies, setMovies] = useState([])
    const [posters, setPosters] = useState({}) // { [movie_id]: url }
    // UI state: modals
    const [openSearch, setOpenSearch] = useState(false)
    const [openFinnkino, setOpenFinnkino] = useState(false)
    // Search modal state
    const [q, setQ] = useState('')
    const [searchRes, setSearchRes] = useState({ results: [], page: 1, total_pages: 0 })
    const [searchLoading, setSearchLoading] = useState(false)
    // Finnkino modal state
    const [theaters, setTheaters] = useState([])
    const [selectedTheater, setSelectedTheater] = useState('')
    const [selectedDate, setSelectedDate] = useState('')
    const [shows, setShows] = useState([])
    const [finnkinoLoading, setFinnkinoLoading] = useState(false)

    const tokenExists = !!getAuthToken()
    const { authUser } = useUser()
    const likelyUserId =
        authUser?.id ||
        (JSON.parse(localStorage.getItem('auth') || 'null')?.user?.id) ||
        (JSON.parse(sessionStorage.getItem('user') || 'null')?.id) ||
        null
    const isLoggedIn = tokenExists
    // Derived flags
    const isOwner = !!(group && likelyUserId && likelyUserId === group.owner_id)
    const me = members.find(m => m.user_id === likelyUserId)
    const myStatus = me?.status

    // Live members count: approved count if visible, else server-provided count
    const liveMembersCount = (isOwner || myStatus === 'APPROVED')
        ? members.filter(m => m.status === 'APPROVED').length
        : (group?.members_count ?? 0)

    // Background: load posters for movies
    useEffect(() => {
        let cancelled = false
            ; (async () => {
                const missing = (movies || []).filter(m => m.movie_id && !posters[m.movie_id])
                for (const m of missing) {
                    try {
                        const data = await fetchMovie(m.movie_id, 'fi-FI')
                        const p = data?.poster_path ? `https://image.tmdb.org/t/p/w154${data.poster_path}` : ''
                        if (p) {
                            if (!cancelled) setPosters(prev => ({ ...prev, [m.movie_id]: p }))
                            continue
                        }
                        // Fallback: try Finnkino API Events/?eventID=
                        const FINN = 'https://www.finnkino.fi/xml'
                        try {
                            const resp = await fetch(`${FINN}/Events/?eventID=${m.movie_id}`)
                            const xml = await resp.text()
                            const parser = new XMLParser({ ignoreAttributes: false })
                            const data2 = parser.parse(xml)
                            let ev = data2?.Events?.Event
                            if (ev && !Array.isArray(ev)) ev = [ev]
                            const img = ev && ev[0] ? (ev[0].Images?.EventSmallImagePortrait || ev[0].EventSmallImagePortrait || '') : ''
                            if (!cancelled) setPosters(prev => ({ ...prev, [m.movie_id]: img || '' }))
                        } catch {
                            if (!cancelled) setPosters(prev => ({ ...prev, [m.movie_id]: '' }))
                        }
                    } catch {
                        if (!cancelled) setPosters(prev => ({ ...prev, [m.movie_id]: '' }))
                    }
                }
            })()
        return () => { cancelled = true }
    }, [movies])

    // Load group details
    useEffect(() => {
        let cancelled = false
            ; (async () => {
                try {
                    const g = await GroupsAPI.get(id)
                    if (!cancelled) setGroup(g)
                } catch (e) {
                    if (!cancelled) {
                        if (e?.status === 404) {
                            // If the group does not exist, go back to list
                            toast?.info?.(t('groupsPage.deletedRedirect'))
                            navigate('/groups')
                        } else {
                            setErr(e.message || 'Failed to load group')
                        }
                    }
                } finally {
                    if (!cancelled) setLoading(false)
                }
            })()
        return () => { cancelled = true }
    }, [id])

    // Load members & movies and set up SSE for realtime updates
    useEffect(() => {
        if (!tokenExists || !group) return
        // Helper: after membership changes, retry movie fetch briefly to avoid race conditions
        const refreshMoviesWithRetry = async (attempts = 5, delayMs = 300) => {
            for (let i = 0; i < attempts; i++) {
                try {
                    const d = await GroupsAPI.movies(id)
                    setMovies(d)
                    return
                } catch (e) {
                    const status = e?.status
                    if (status === 403 || status === 404) {
                        // likely not yet approved or visibility not propagated; retry shortly
                        await new Promise(r => setTimeout(r, delayMs))
                        continue
                    }
                    // other errors: stop
                    break
                }
            }
        }
        // Try to load members; if forbidden, fetch only my membership
        GroupsAPI.members(id).then(setMembers).catch(async () => {
            try {
                const mine = await GroupsAPI.myMembership(id)
                if (mine) setMembers([{ user_id: likelyUserId, email: (authUser?.email), status: mine.status, role: mine.role }])
                else setMembers([])
            } catch {
                setMembers([])
            }
        })
        // Load movies for the group
        GroupsAPI.movies(id).then(setMovies).catch(() => { })

        // SSE: realtime updates for members/movies/group deletion
        try {
            const tk = getAuthToken()
            if (!tk) return
            let es
            let retry
            const start = () => {
                try {
                    es = new EventSource(`/api/groups/${id}/stream?token=${encodeURIComponent(tk)}`)
                    es.addEventListener('members-changed', async () => {
                        const ok = await GroupsAPI.members(id).then(m => { setMembers(m); return true }).catch(() => false)
                        if (!ok) {
                            try {
                                const mine = await GroupsAPI.myMembership(id)
                                if (mine) {
                                    setMembers([{ user_id: likelyUserId, email: (authUser?.email), status: mine.status, role: mine.role }])
                                } else {
                                    setMembers([])
                                    setMovies([])
                                    return
                                }
                            } catch {
                                setMembers([])
                                setMovies([])
                                return
                            }
                        }
                        // Try fetching movies regardless; will succeed if approved/owner, 403 otherwise
                        // Fetch movies; if approval just happened, we may need to retry briefly
                        refreshMoviesWithRetry()
                    })
                    es.addEventListener('movies-changed', () => {
                        // Refresh movies on change
                        GroupsAPI.movies(id).then(setMovies).catch(() => { })
                    })
                    es.addEventListener('group-deleted', () => {
                        // Group was deleted while this page is open → redirect to list
                        toast?.info?.(t('groupsPage.deletedRedirect'))
                        navigate('/groups')
                    })
                    es.onerror = () => { try { es?.close() } catch { }; retry = setTimeout(() => start(), 3000) }
                } catch { retry = setTimeout(() => start(), 3000) }
            }
            start()
            return () => { try { es?.close() } catch { }; if (retry) clearTimeout(retry) }
        } catch { }
    }, [id, tokenExists, group])

    // Request to join the group
    const requestJoin = async () => {
        setErr('')
        if (!isLoggedIn) {
            setErr(t('groupsPage.signInToRequestJoin'))
            return
        }
        try {
            await GroupsAPI.requestJoin(id)
            // Mark my membership as pending locally
            setMembers(prev => {
                const exists = prev.find(m => m.user_id === likelyUserId)
                if (exists) return prev.map(m => m.user_id === likelyUserId ? { ...m, status: 'PENDING' } : m)
                return [...prev, { user_id: likelyUserId, email: authUser?.email, status: 'PENDING', role: 'MEMBER' }]
            })
            // Fallback: fetch my membership if SSE not open yet
            try { const mine = await GroupsAPI.myMembership(id); if (mine) setMembers([{ user_id: likelyUserId, email: authUser?.email, status: mine.status, role: mine.role }]) } catch { }
            toast.success(t('groupsPage.joinRequested'))
        } catch (e) {
            setErr(e.message || 'Failed to send join request')
            toast.error(e?.message || t('groupsPage.joinFailed'))
        }
    }

    // Approve a pending member
    const approve = async (u) => {
        try {
            await GroupsAPI.approve(id, u.user_id)
            setMembers(prev => prev.map(m => m.user_id === u.user_id ? { ...m, status: 'APPROVED' } : m))
            toast.success(t('groupsPage.approved'))
        } catch (e) { setErr(e.message || t('groupsPage.approveFailed')); toast.error(e?.message || t('groupsPage.approveFailed')) }
    }
    // Reject or remove a member
    const reject = async (u) => {
        try {
            await GroupsAPI.reject(id, u.user_id)
            setMembers(prev => {
                const current = prev.find(m => m.user_id === u.user_id)
                if (current?.status === 'PENDING') {
                    return prev.filter(m => m.user_id !== u.user_id)
                }
                return prev.map(m => m.user_id === u.user_id ? { ...m, status: 'REJECTED' } : m)
            })
            toast.success(t('groupsPage.rejected'))
        } catch (e) { setErr(e.message || t('groupsPage.rejectFailed')); toast.error(e?.message || t('groupsPage.rejectFailed')) }
    }
    // Leave the group
    const leave = async () => {
        try {
            await GroupsAPI.leave(id)
            setMembers(prev => prev.filter(m => m.user_id !== likelyUserId))
            toast.success(t('groupsPage.left'))
        } catch (e) { setErr(e.message || t('groupsPage.leaveFailed')); toast.error(e?.message || t('groupsPage.leaveFailed')) }
    }

    // Movies are added via TMDB search or Finnkino flows below

    // Add a showtime to a group movie
    const addShowtime = async (gmId, payload) => {
        try {
            const st = await GroupsAPI.addShowtime(id, gmId, payload)
            setMovies(prev => prev.map(m => m.id === gmId ? { ...m, showtimes: [...(m.showtimes || []), st] } : m))
            toast.success(t('groupsPage.showtimeAdded'))
        } catch (e) { setErr(e.message || t('groupsPage.showtimeAddFailed')); toast.error(e?.message || t('groupsPage.showtimeAddFailed')) }
    }

    // Delete a showtime from a group movie
    const deleteShowtime = async (gmId, sid) => {
        try {
            await GroupsAPI.deleteShowtime(id, gmId, sid);
            setMovies(prev => prev.map(m => m.id === gmId ? { ...m, showtimes: (m.showtimes || []).filter(s => s.id !== sid) } : m))
            toast.success(t('groupsPage.showtimeDeleted'))
        } catch (e) { setErr(e.message || t('groupsPage.showtimeDeleteFailed')); toast.error(e?.message || t('groupsPage.showtimeDeleteFailed')) }
    }

    // --- Search modal handlers ---
    const runSearch = async (page = 1) => {
        if (!q.trim()) { setSearchRes({ results: [], page: 1, total_pages: 0 }); return }
        setSearchLoading(true)
        try {
            const r = await fetchMovies({ q, page, language: 'fi-FI' })
            setSearchRes(r)
        } catch (e) { setErr(e.message || t('groupsPage.searchFailed')) }
        finally { setSearchLoading(false) }
    }
    // Add movie to group from TMDB search
    const addFromSearch = async (movie) => {
        try {
            const gm = await GroupsAPI.addMovie(id, movie.id, movie.title)
            setMovies(prev => {
                const exists = prev.find(x => x.id === gm.id)
                return exists ? prev : [gm, ...prev]
            })
            toast.success(t('groupsPage.movieAdded'))
        } catch (e) { setErr(e.message || t('groupsPage.movieAddFailed')); toast.error(e?.message || t('groupsPage.movieAddFailed')) }
    }

    // --- Finnkino modal handlers ---
    const FINNKINO_API = 'https://www.finnkino.fi/xml'
    // Ensure selectedDate is set (defaults to today)
    const ensureDate = () => {
        if (selectedDate) return selectedDate
        const d = new Date();
        const s = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
        setSelectedDate(s); return s
    }
    // Load theater list from Finnkino
    const loadFinnkinoTheaters = async () => {
        try {
            setFinnkinoLoading(true)
            const resp = await fetch(`${FINNKINO_API}/TheatreAreas/`, { headers: { 'Accept': 'text/xml,application/xml;q=0.9,*/*;q=0.8' } })
            const xml = await resp.text()
            let parsedList = []
            try {
                const parser = new XMLParser({ ignoreAttributes: false })
                const data = parser.parse(xml)
                let list = data?.TheatreAreas?.TheatreArea ?? []
                if (!Array.isArray(list)) list = [list]
                parsedList = list
                    .filter(t => t && t.ID && t.Name)
                    .filter(t => !/valitse\s+alue\/?teatteri/i.test(t.Name) && !/choose\s+area\/?theater/i.test(t.Name))
                    .map(t => {
                        let name = t.Name
                        if (typeof name === 'string' && name.startsWith('Pääkaupunkiseutu')) {
                            name = 'Pääkaupunkiseutu'
                        }
                        return { id: t.ID, name }
                    })
            } catch (e) {
                parsedList = []
            }
            setTheaters(parsedList)
        } catch (e) { setErr(e.message || t('groupsPage.fetchTheatersFailed')); try { toast.error(e?.message || t('groupsPage.fetchTheatersFailed')) } catch { } }
        finally { setFinnkinoLoading(false) }
    }
    // Load shows for selected theater and date
    const loadFinnkinoShows = async () => {
        if (!selectedTheater) return
        const dt = ensureDate()
        try {
            setFinnkinoLoading(true)
            const resp = await fetch(`${FINNKINO_API}/Schedule/?area=${selectedTheater}&dt=${dt}`)
            const xml = await resp.text()
            const parser = new XMLParser({ ignoreAttributes: false })
            const data = parser.parse(xml)
            let showList = data?.Schedule?.Shows?.Show || []
            if (!Array.isArray(showList)) showList = [showList]
            setShows(showList.map(s => ({
                EventID: s.EventID,
                Title: s.Title,
                dttmShowStart: s.dttmShowStart,
                Theatre: s.Theatre,
                TheatreAuditorium: s.TheatreAuditorium,
                Image: (s.Images && (s.Images.EventSmallImagePortrait || s.Images.EventSmallImagePortraitURL)) || s.EventSmallImagePortrait || ''
            })))
        } catch (e) { setErr(e.message || t('groupsPage.fetchShowsFailed')) }
        finally { setFinnkinoLoading(false) }
    }
    // Add movie and showtime from Finnkino show object
    const addShowFromFinnkino = async (show) => {
        try {
            const gm = await GroupsAPI.addMovie(id, Number(show.EventID), show.Title)
            if (show.Images || show.Image) {
                const img = (show.Images?.EventSmallImagePortrait || show.Image || '')
                const safe = typeof img === 'string' ? img.replace(/^http:\/\//i, 'https://') : ''
                if (safe) setPosters(prev => ({ ...prev, [Number(show.EventID)]: safe }))
            }
            await addShowtime(gm.id, {
                starts_at: new Date(show.dttmShowStart).toISOString(),
                theater: show.Theatre,
                auditorium: show.TheatreAuditorium
            })
            toast.success(t('groupsPage.movieAdded'))
        } catch (e) { setErr(e.message || t('groupsPage.showtimeAddFailed')) }
    }

    // Auto-load theaters when Finnkino modal opens
    useEffect(() => {
        if (!openFinnkino) return
        ensureDate()
        loadFinnkinoTheaters()
    }, [openFinnkino])

    return (
        <section className="min-h-[60vh] px-3 py-6">
            {/* Back to groups list */}
            <Link to="/groups" className="text-white/80 hover:underline">&larr; {t('groupsPage.backToGroups')}</Link>

            {/* Error banner */}
            {err && (
                <div className="mt-4 rounded-xl bg-red-900/40 border border-red-500/30 px-4 py-3 text-red-200">
                    {err}
                </div>
            )}

            {/* Loading state */}
            {loading ? (
                <div className="rounded-2xl border border-white/10 bg-gray-900/60 p-6 animate-pulse mt-4">
                    <div className="h-6 w-48 bg-white/10 rounded mb-4" />
                    <div className="h-4 w-64 bg-white/10 rounded" />
                </div>
            ) : group && (
                <>
                    <div className="rounded-2xl border border-white/10 bg-gray-900/60 p-6 mt-4">
                        <h1 className="text-3xl font-semibold text-white">{group.name}</h1>
                        <p className="text-white/60 mt-1">{t('groupsPage.members')}: {liveMembersCount}</p>

                        {/* User actions (join/leave/request) */}
                        {!isOwner && (
                            <div className="mt-4 flex gap-2">
                                {!isLoggedIn ? (
                                    <span className="text-white/70 text-sm">{t('groupsPage.signInToRequestJoin')}</span>
                                ) : myStatus === 'APPROVED' ? (
                                    <button
                                        onClick={async () => { const ok = await confirmLeaveGroupToast(t); if (!ok) return; leave() }}
                                        className="px-3 py-2 rounded-md bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-200"
                                    >
                                        {t('groupsPage.leaveGroup')}
                                    </button>
                                ) : myStatus === 'PENDING' ? (
                                    <span className="px-3 py-2 rounded-xl border border-white/10 text-white/70">{t('groupsPage.requestPending')}</span>
                                ) : (
                                    <button
                                        onClick={requestJoin}
                                        className="px-3 py-2 rounded-md bg-white/10 hover:bg-white/15 border border-white/10 text-white"
                                    >
                                        {t('groupsPage.requestToJoin')}
                                    </button>
                                )}
                            </div>
                        )}
                        {isOwner && (
                            <div className="mt-4">
                                <button
                                    onClick={async () => {
                                        const ok = await confirmGroupDeleteToast(t)
                                        if (!ok) return
                                        GroupsAPI.delete(id)
                                            .then(() => { toast.success(t('groupsPage.deleteSuccess')); navigate('/groups') })
                                            .catch(e => { setErr(e.message || t('groupsPage.deleteFailed')); toast.error(e?.message || t('groupsPage.deleteFailed')) })
                                    }}
                                    className="px-3 py-2 rounded-md bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-200"
                                >
                                    {t('groupsPage.delete')}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Tabs: members and movies */}
                    <div className="rounded-2xl border border-white/10 bg-gray-900/60 p-6 mt-6">
                        <div className="flex gap-2 mb-4">
                            <button
                                className={`px-3 py-1.5 rounded-md border border-white/10 ${tab === 'movies' ? 'bg-white/15' : 'bg-white/10'}`}
                                onClick={() => setTab('movies')}
                            >
                                {t('groupsPage.moviesTab')}
                            </button>
                            <button
                                className={`px-3 py-1.5 rounded-md border border-white/10 ${tab === 'members' ? 'bg-white/15' : 'bg-white/10'}`}
                                onClick={() => setTab('members')}
                            >
                                {t('groupsPage.membersTab')}
                            </button>
                        </div>

                        {/* Members tab content */}
                        {tab === 'members' && (isOwner || myStatus === 'APPROVED') ? (
                            <ul className="space-y-2">
                                {members.filter(m => m.status !== 'REJECTED').map((m) => (
                                    <li key={m.user_id} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-3">
                                        <div className="text-white/90">
                                            <div className="text-sm">{m.email || m.user_id}</div>
                                            <div className="text-xs text-white/60">{t(`groupsPage.role.${m.role}`)} · {t(`groupsPage.status.${m.status}`)}</div>
                                        </div>
                                        {(isOwner || (me?.role === 'MODERATOR' && myStatus === 'APPROVED')) && m.user_id !== likelyUserId && (
                                            <div className="flex gap-2">
                                                {m.status !== 'REJECTED' && (
                                                    <button onClick={async () => { const ok = await confirmMemberActionToast(t, { mode: m.status === 'APPROVED' ? 'remove' : 'reject', email: m.email || m.user_id }); if (!ok) return; reject(m) }} className="px-2 py-1 rounded-md bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-200 text-sm">
                                                        {m.status === 'APPROVED' ? t('groupsPage.deleteAction') : t('groupsPage.rejectBtn')}
                                                    </button>
                                                )}
                                                {m.status !== 'APPROVED' && (
                                                    <button onClick={() => approve(m)} className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/15 border border-white/10 text-white text-sm">
                                                        {t('groupsPage.approveBtn')}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </li>
                                ))}
                                {members.filter(m => m.status !== 'REJECTED').length === 0 && <p className="text-white/60">{t('groupsPage.noMembersYet')}</p>}
                            </ul>
                        ) : tab === 'members' ? (
                            <p className="text-white/70">{t('groupsPage.membersOnlySection')}</p>
                        ) : null}

                        {/* Movies tab content */}
                        {tab === 'movies' && (isOwner || myStatus === 'APPROVED') ? (
                            <div className="space-y-5">
                                <div className="flex gap-2 flex-wrap">
                                    <button onClick={() => { setOpenSearch(true); }} className="px-3 py-2 rounded-md bg-white/10 hover:bg-white/15 border border-white/10 text-white">{t('groupsPage.addFromSearchCta')}</button>
                                    <button onClick={() => { setOpenFinnkino(true); loadFinnkinoTheaters(); }} className="px-3 py-2 rounded-md bg-white/10 hover:bg-white/15 border border-white/10 text-white">{t('groupsPage.addFromTheatersCta')}</button>
                                </div>
                                {/* Manual add removed; use search or theaters */}

                                {movies.length === 0 ? (
                                    <p className="text-white/70">{t('groupsPage.noMoviesYet')}</p>
                                ) : (
                                    <ul className="space-y-4">
                                        {movies.map(m => (
                                            <li key={m.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    {/* Clickable movie block navigates to details */}
                                                    <Link to={`/movies/${m.movie_id}`} state={{ from: location }} className="flex gap-3 hover:opacity-95">
                                                        {/* Movie thumbnail */}
                                                        {posters[m.movie_id] ? (
                                                            <img src={posters[m.movie_id]} alt={m.title} className="w-12 h-[72px] object-cover rounded-md flex-shrink-0" loading="lazy" />
                                                        ) : (
                                                            <div className="w-12 h-[72px] rounded-md bg-white/10 border border-white/10 flex-shrink-0" />
                                                        )}
                                                        <div>
                                                            <div className="text-white font-medium">{m.title || t('groupsPage.movieNumber', { id: m.movie_id })}</div>
                                                            <div className="text-white/60 text-sm">{t('groupsPage.tmdbShort')} {m.movie_id}</div>
                                                        </div>
                                                    </Link>
                                                    {m.added_by === likelyUserId && (
                                                        <button onClick={async () => { const ok = await confirmMovieDeleteToast(t, { title: m.title }); if (!ok) return; GroupsAPI.deleteMovie(id, m.id).then(() => { setMovies(prev => prev.filter(x => x.id !== m.id)); toast.success(t('groupsPage.movieDeleted')) }).catch(e => { setErr(e.message); toast.error(e?.message || t('groupsPage.movieDeleteFailed')) }) }} className="px-2 py-1 rounded-md bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-200 text-sm">{t('groupsPage.deleteAction')}</button>
                                                    )}
                                                </div>
                                                <Showtimes
                                                    showtimes={m.showtimes || []}
                                                    canAdd={m.added_by === likelyUserId}
                                                    currentUserId={likelyUserId}
                                                    onAdd={(payload) => addShowtime(m.id, payload)}
                                                    onDelete={(sid) => deleteShowtime(m.id, sid)}
                                                />
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ) : tab === 'movies' ? (
                            <p className="text-white/70">{t('groupsPage.membersOnlySection')}</p>
                        ) : null}
                    </div>
                </>
            )}

            {/* Search modal (TMDB search) */}
            {openSearch && (
                <Modal title={t('groupsPage.addFromSearchTitle')} closeLabel={t('close')} onClose={() => setOpenSearch(false)}>
                    <form onSubmit={(e) => { e.preventDefault(); runSearch(1) }} className="flex gap-2 mb-4">
                        <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('groupsPage.searchMoviesPlaceholder')} className="flex-1 px-3 py-2 rounded-md bg-black/30 border border-white/10 text-white" />
                        <button className="px-3 py-2 rounded-md bg-white/10 hover:bg-white/15 border border-white/10 text-white">{t('groupsPage.searchAction')}</button>
                    </form>
                    {searchLoading ? (
                        <div className="text-white/70">{t('groupsPage.searching')}</div>
                    ) : (
                        <ul className="grid gap-2 max-h-[60vh] overflow-auto">
                            {(searchRes.results || []).map(m => (
                                <li key={m.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3 gap-3">
                                    {/* TMDB thumbnail */}
                                    {m.poster_path ? (
                                        <img src={`https://image.tmdb.org/t/p/w92${m.poster_path}`} alt={m.title} className="w-10 h-14 object-cover rounded-md flex-shrink-0" loading="lazy" />
                                    ) : (
                                        <div className="w-10 h-14 rounded-md bg-white/10 border border-white/10 flex-shrink-0" />
                                    )}
                                    <div className="text-white/90 flex-1 min-w-0">{m.title} {m.release_date ? <span className="text-white/60 text-sm">({m.release_date?.slice(0, 4)})</span> : null}</div>
                                    <button onClick={() => addFromSearch(m)} className="px-2 py-1 rounded-md bg-white/10 text-white text-sm">{t('groupsPage.addToGroup')}</button>
                                </li>
                            ))}
                            {(searchRes.results || []).length === 0 && <li className="text-white/60">{t('groupsPage.noSearchResults')}</li>}
                        </ul>
                    )}
                </Modal>
            )}

            {/* Finnkino modal (add show from theaters) */}
            {openFinnkino && (
                <Modal title={t('groupsPage.addShowFromTheatersTitle')} closeLabel={t('close')} onClose={() => setOpenFinnkino(false)}>
                    <div className="flex flex-col sm:flex-row gap-2 mb-3">
                        <FancySelect
                            value={selectedTheater}
                            onChange={setSelectedTheater}
                            options={theaters.map(t => ({ value: t.id, label: t.name }))}
                            placeholder={t('chooseTheater')}
                            align="left"
                            className="flex-1"
                            buttonClassName="relative w-full h-10 inline-flex items-center gap-2 rounded-md bg-white/10 hover:bg-white/15 border border-white/10 text-white px-3 pr-8 focus:outline-none focus:ring-2 focus:ring-[#F18800]"
                            panelClassName="absolute z-50 mt-2 top-full left-0 min-w-[14rem] bg-gray-900/95 backdrop-blur-md border border-white/10 rounded-lg shadow-lg p-1"
                        />
                        <input type="date" value={selectedDate ? selectedDate.split('.').reverse().join('-') : ''} onChange={(e) => { const [y, m, d] = e.target.value.split('-'); setSelectedDate(`${d}.${m}.${y}`) }} className="date-input px-3 h-10 rounded-xl bg-white text-black border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#F18800]" />
                        <button onClick={loadFinnkinoShows} className="px-3 h-10 rounded-md bg-white/10 hover:bg-white/15 border border-white/10 text-white">{t('groupsPage.loadShows')}</button>
                    </div>
                    {finnkinoLoading ? (
                        <div className="text-white/70">{t('loading')}</div>
                    ) : (
                        <ul className="grid gap-2 max-h-[60vh] overflow-auto">
                            {shows.map((s, i) => (
                                <li key={`${s.EventID}-${i}`} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3 gap-3">
                                    {/* Thumbnail */}
                                    {s.Image ? (
                                        <img src={s.Image} alt={s.Title} className="w-10 h-14 object-cover rounded-md flex-shrink-0" loading="lazy" />
                                    ) : (
                                        <div className="w-10 h-14 rounded-md bg-white/10 border border-white/10 flex-shrink-0" />
                                    )}
                                    <div className="text-white/90 text-sm flex-1 min-w-0">
                                        <div className="font-medium">{s.Title}</div>
                                        <div className="text-white/60">{new Date(s.dttmShowStart).toLocaleString('fi-FI')} · {s.Theatre} · {s.TheatreAuditorium}</div>
                                    </div>
                                    <button onClick={() => addShowFromFinnkino(s)} className="px-2 py-1 rounded bg-white/10 text-white text-sm">{t('groupsPage.addToGroup')}</button>
                                </li>
                            ))}
                            {shows.length === 0 && <li className="text-white/60">{t('groupsPage.chooseTheaterAndDate')}</li>}
                        </ul>
                    )}
                </Modal>
            )}
        </section>
    )
}

// Showtimes: renders showtimes list and optional add form
function Showtimes({ showtimes, canAdd, currentUserId, onAdd, onDelete }) {
    const [time, setTime] = useState('')
    const [theater, setTheater] = useState('')
    const [auditorium, setAuditorium] = useState('')
    const { t } = useTranslation('common')
    return (
        <div className="mt-4">
            {/* Showtimes list and add form */}
            <h3 className="text-white/90 mb-2">{t('groupsPage.showtimesTitle', 'Showtimes')}</h3>
            {showtimes.length === 0 ? (
                <p className="text-white/60">{t('groupsPage.noShowtimes', 'No showtimes')}</p>
            ) : (
                <ul className="space-y-2">
                    {showtimes.map(s => (
                        <li key={s.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                            <div className="text-white/90 text-sm">
                                {new Date(s.starts_at).toLocaleString('fi-FI')} {s.theater && `· ${s.theater}`} {s.auditorium && `· ${s.auditorium}`}
                            </div>
                            {s.added_by === currentUserId && (
                                <button onClick={async () => { const ok = await confirmShowtimeDeleteToast(t, { startsAt: s.starts_at, theater: s.theater, auditorium: s.auditorium }); if (!ok) return; onDelete(s.id) }} className="px-2 py-1 rounded-md bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-200 text-xs">{t('groupsPage.deleteAction')}</button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
            {/* Add showtime form (visible if user can add) */}
            {canAdd && (
                <form onSubmit={(e) => { e.preventDefault(); if (!time) return; onAdd({ starts_at: new Date(time).toISOString(), theater, auditorium }); setTime(''); setTheater(''); setAuditorium(''); }} className="mt-3 flex flex-col sm:flex-row gap-2">
                    <input type="datetime-local" value={time} onChange={e => setTime(e.target.value)} className="px-3 py-2 rounded-md bg-black/30 border border-white/10 text-white" />
                    <input type="text" placeholder={t('groupsPage.theaterPlaceholder', 'Theater')} value={theater} onChange={e => setTheater(e.target.value)} className="px-3 py-2 rounded-md bg-black/30 border border-white/10 text-white" />
                    <input type="text" placeholder={t('groupsPage.auditoriumPlaceholder', 'Auditorium')} value={auditorium} onChange={e => setAuditorium(e.target.value)} className="px-3 py-2 rounded-md bg-black/30 border border-white/10 text-white" />
                    <button className="px-3 py-2 rounded-md bg-white/10 hover:bg-white/15 border border-white/10 text-white">{t('groupsPage.addShowtime')}</button>
                </form>
            )}
        </div>
    )
}

// --- Modals ---
// Simple centered modal used by search and Finnkino flows
function Modal({ title, onClose, children, closeLabel = 'Close' }) {
    return (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/70" onClick={onClose} />
            <div className="absolute inset-0 grid place-items-center p-4">
                <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-gray-900/95 p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-white text-lg font-medium">{title}</h3>
                        <button onClick={onClose} className="px-2 py-1 rounded bg-white/10 text-white">{closeLabel}</button>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    )
}

// Confirm group deletion (toast confirmation)
function confirmGroupDeleteToast(t) {
    return new Promise((resolve) => {
        let id
        id = toast(({ closeToast }) => (
            <div className="space-y-3">
                <p className="font-semibold text-black">
                    {t('groupsPage.deleteTitle')}
                </p>
                <p className="text-sm text-black">
                    {t('groupsPage.deleteConfirm')}
                </p>
                <div className="flex justify-end gap-2 pt-1">
                    <button
                        onClick={() => { toast.dismiss(id); resolve(true) }}
                        className="px-3 py-1.5 rounded-md bg-red-500/20 hover:bg-red-500/30 border border-red-600 text-red-600"
                    >
                        {t('groupsPage.delete')}
                    </button>
                </div>
            </div>
        ), { autoClose: false, closeOnClick: false, draggable: false, hideProgressBar: true })
    })
}

// Confirm member reject/remove (toast modal)
function confirmMemberActionToast(t, { mode = 'reject', email = '' } = {}) {
    const isRemove = mode === 'remove'
    return new Promise((resolve) => {
        let id
        id = toast(() => (
            <div className="space-y-3">
                <p className="font-semibold text-black">
                    {isRemove ? t('groupsPage.memberDeleteTitle') : t('groupsPage.memberRejectTitle')}
                </p>
                <p className="text-sm text-black">
                    {isRemove ? t('groupsPage.memberDeleteConfirm', { email }) : t('groupsPage.memberRejectConfirm', { email })}
                </p>
                <div className="flex justify-end gap-2 pt-1">
                    <button onClick={() => { toast.dismiss(id); resolve(true) }} className="px-3 py-1.5 rounded-md bg-red-500/20 hover:bg-red-500/30 border border-red-600 text-red-600">
                        {isRemove ? t('groupsPage.deleteAction') : t('groupsPage.rejectBtn')}
                    </button>
                </div>
            </div>
        ), { autoClose: false, closeOnClick: false, draggable: false, hideProgressBar: true })
    })
}

// Confirm movie deletion (toast modal)
function confirmMovieDeleteToast(t, { title = '' } = {}) {
    return new Promise((resolve) => {
        let id
        id = toast(() => (
            <div className="space-y-3">
                <p className="font-semibold text-black">{t('groupsPage.movieDeleteTitle')}</p>
                <p className="text-sm text-black">{t('groupsPage.movieDeleteConfirm', { title })}</p>
                <div className="flex justify-end gap-2 pt-1">
                    <button onClick={() => { toast.dismiss(id); resolve(true) }} className="px-3 py-1.5 rounded-md bg-red-500/20 hover:bg-red-500/30 border border-red-600 text-red-600">{t('groupsPage.deleteAction')}</button>
                </div>
            </div>
        ), { autoClose: false, closeOnClick: false, draggable: false, hideProgressBar: true })
    })
}

// Confirm showtime deletion (toast modal)
function confirmShowtimeDeleteToast(t, { startsAt, theater, auditorium } = {}) {
    return new Promise((resolve) => {
        let id
        id = toast(() => (
            <div className="space-y-3">
                <p className="font-semibold text-black">{t('groupsPage.showtimeDeleteTitle')}</p>
                <p className="text-sm text-black">{t('groupsPage.showtimeDeleteConfirm')}</p>
                <div className="flex justify-end gap-2 pt-1">
                    <button onClick={() => { toast.dismiss(id); resolve(true) }} className="px-3 py-1.5 rounded-md bg-red-500/20 hover:bg-red-500/30 border border-red-600 text-red-600">{t('groupsPage.deleteAction')}</button>
                </div>
            </div>
        ), { autoClose: false, closeOnClick: false, draggable: false, hideProgressBar: true })
    })
}

// Confirm leaving the group (toast modal)
function confirmLeaveGroupToast(t) {
    return new Promise((resolve) => {
        let id
        id = toast(() => (
            <div className="space-y-3">
                <p className="font-semibold text-black">{t('groupsPage.leaveGroupTitle')}</p>
                <p className="text-sm text-black">{t('groupsPage.leaveGroupConfirm')}</p>
                <div className="flex justify-end gap-2 pt-1">
                    <button onClick={() => { toast.dismiss(id); resolve(true) }} className="px-3 py-1.5 rounded-md bg-red-500/20 hover:bg-red-500/30 border border-red-600 text-red-600">{t('groupsPage.leaveGroup')}</button>
                </div>
            </div>
        ), { autoClose: false, closeOnClick: false, draggable: false, hideProgressBar: true })
    })
}
