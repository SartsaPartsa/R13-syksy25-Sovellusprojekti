import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { GroupsAPI, getAuthToken } from '../lib/api'
import { fetchMovies } from '../lib/api/search'
import { XMLParser } from 'fast-xml-parser'
import { useUser } from '../context/useUser'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import FancySelect from '../components/FancySelect'

export default function GroupPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { t } = useTranslation('common')
    const [group, setGroup] = useState(null)
    const [members, setMembers] = useState([])
    const [err, setErr] = useState('')
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState('members')
    const [movies, setMovies] = useState([])
    // removed manual add form (TMDB ID/Title)
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
    const isOwner = !!(group && likelyUserId && likelyUserId === group.owner_id)
    const me = members.find(m => m.user_id === likelyUserId)
    const myStatus = me?.status

    useEffect(() => {
        let cancelled = false
        ; (async () => {
            try {
                const g = await GroupsAPI.get(id)
                if (!cancelled) setGroup(g)
            } catch (e) {
                if (!cancelled) setErr(e.message || 'Failed to load group')
            } finally {
                if (!cancelled) setLoading(false)
            }
        })()
        return () => { cancelled = true }
    }, [id])

    useEffect(() => {
        if (!tokenExists || !group) return
        // Kokeile hakea jäsenet; jos ei lupaa (403), hae oman jäsenyyden tila, jotta UI tietää pending/approved
        GroupsAPI.members(id).then(setMembers).catch(async () => {
            try {
                const mine = await GroupsAPI.myMembership(id)
                if (mine) setMembers([{ user_id: likelyUserId, email: (authUser?.email), status: mine.status, role: mine.role }])
            } catch {}
        })
        GroupsAPI.movies(id).then(setMovies).catch(() => { })

        // Reaaliaikaiset päivitykset SSE:llä
                try {
                        const tk = getAuthToken()
                        if (!tk) return
                        let es
                        let retry
                        const start = () => {
                            try {
                                es = new EventSource(`/api/groups/${id}/stream?token=${encodeURIComponent(tk)}`)
                                es.addEventListener('members-changed', async () => {
                const ok = await GroupsAPI.members(id).then(m=>{ setMembers(m); return true }).catch(()=>false)
                if (!ok) {
                    try {
                        const mine = await GroupsAPI.myMembership(id)
                        if (mine) setMembers([{ user_id: likelyUserId, email: (authUser?.email), status: mine.status, role: mine.role }])
                    } catch {}
                }
                                })
                                es.addEventListener('movies-changed', () => {
                                        GroupsAPI.movies(id).then(setMovies).catch(() => { })
                                })
                                es.addEventListener('group-deleted', () => {
                                        GroupsAPI.get(id).then(setGroup).catch(() => {})
                                })
                                es.onerror = () => { try { es?.close() } catch {}; retry = setTimeout(() => start(), 3000) }
                            } catch { retry = setTimeout(() => start(), 3000) }
                        }
                        start()
                        return () => { try { es?.close() } catch {}; if (retry) clearTimeout(retry) }
        } catch {}
    }, [id, tokenExists, group])

    const requestJoin = async () => {
        setErr('')
        if (!isLoggedIn) {
            setErr('Sign in to request to join')
            return
        }
        try {
            await GroupsAPI.requestJoin(id)
            // Päivitä oma tila pendingiksi
            setMembers(prev => {
                const exists = prev.find(m => m.user_id === likelyUserId)
                if (exists) return prev.map(m => m.user_id === likelyUserId ? { ...m, status: 'PENDING' } : m)
                return [...prev, { user_id: likelyUserId, email: authUser?.email, status: 'PENDING', role: 'MEMBER' }]
            })
            // varmistus: jos stream ei ole vielä auki, haetaan membership
            try { const mine = await GroupsAPI.myMembership(id); if (mine) setMembers([{ user_id: likelyUserId, email: authUser?.email, status: mine.status, role: mine.role }]) } catch {}
            toast.success(t('groupsPage.joinRequested'))
        } catch (e) {
            setErr(e.message || 'Failed to send join request')
            toast.error(e?.message || t('groupsPage.joinFailed'))
        }
    }

    const approve = async (u) => {
        try {
            await GroupsAPI.approve(id, u.user_id)
            setMembers(prev => prev.map(m => m.user_id === u.user_id ? { ...m, status: 'APPROVED' } : m))
            toast.success(t('groupsPage.approved'))
        } catch (e) { setErr(e.message || 'Failed to approve'); toast.error(e?.message || t('groupsPage.approveFailed')) }
    }
    const reject = async (u) => {
        try {
            await GroupsAPI.reject(id, u.user_id)
            setMembers(prev => prev.map(m => m.user_id === u.user_id ? { ...m, status: 'REJECTED' } : m))
            toast.success(t('groupsPage.rejected'))
        } catch (e) { setErr(e.message || 'Failed to reject'); toast.error(e?.message || t('groupsPage.rejectFailed')) }
    }
    const leave = async () => {
        try {
            await GroupsAPI.leave(id)
            setMembers(prev => prev.filter(m => m.user_id !== likelyUserId))
            toast.success(t('groupsPage.left'))
        } catch (e) { setErr(e.message || 'Failed to leave'); toast.error(e?.message || t('groupsPage.leaveFailed')) }
    }

    // movie add happens via search or theaters flows

    const addShowtime = async (gmId, payload) => {
        try {
            const st = await GroupsAPI.addShowtime(id, gmId, payload)
            setMovies(prev => prev.map(m => m.id === gmId ? { ...m, showtimes: [...(m.showtimes || []), st] } : m))
            toast.success(t('groupsPage.showtimeAdded'))
        } catch (e) { setErr(e.message || 'Failed to add showtime'); toast.error(e?.message || t('groupsPage.showtimeAddFailed')) }
    }

    const deleteShowtime = async (gmId, sid) => {
        try { await GroupsAPI.deleteShowtime(id, gmId, sid);
            setMovies(prev => prev.map(m => m.id === gmId ? { ...m, showtimes: (m.showtimes || []).filter(s => s.id !== sid) } : m))
            toast.success(t('groupsPage.showtimeDeleted'))
        } catch (e) { setErr(e.message || 'Failed to delete showtime'); toast.error(e?.message || t('groupsPage.showtimeDeleteFailed')) }
    }

    // --- Search modal handlers ---
    const runSearch = async (page = 1) => {
        if (!q.trim()) { setSearchRes({ results: [], page: 1, total_pages: 0 }); return }
        setSearchLoading(true)
        try {
            const r = await fetchMovies({ q, page, language: 'fi-FI' })
            setSearchRes(r)
        } catch (e) { setErr(e.message || 'Search failed') }
        finally { setSearchLoading(false) }
    }
    const addFromSearch = async (movie) => {
        try {
            const gm = await GroupsAPI.addMovie(id, movie.id, movie.title)
            setMovies(prev => {
                const exists = prev.find(x => x.id === gm.id)
                return exists ? prev : [gm, ...prev]
            })
            toast.success(t('groupsPage.movieAdded'))
    } catch (e) { setErr(e.message || 'Failed to add movie'); toast.error(e?.message || t('groupsPage.movieAddFailed')) }
    }

    // --- Finnkino modal handlers ---
    const FINNKINO_API = 'https://www.finnkino.fi/xml'
    const ensureDate = () => {
        if (selectedDate) return selectedDate
        const d = new Date();
        const s = `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`
        setSelectedDate(s); return s
    }
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
                    .map(t => ({ id: t.ID, name: t.Name }))
            } catch (e) {
                parsedList = []
            }
            setTheaters(parsedList)
        } catch (e) { setErr(e.message || 'Failed to fetch theaters'); try { toast.error(e?.message || 'Failed to fetch theaters') } catch {} }
        finally { setFinnkinoLoading(false) }
    }
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
                TheatreAuditorium: s.TheatreAuditorium
            })))
        } catch (e) { setErr(e.message || 'Failed to fetch shows') }
        finally { setFinnkinoLoading(false) }
    }
    const addShowFromFinnkino = async (show) => {
        try {
            // 1) varmista elokuva ryhmässä
            const gm = await GroupsAPI.addMovie(id, Number(show.EventID), show.Title)
            // 2) lisää näytösaika
            await addShowtime(gm.id, {
                starts_at: new Date(show.dttmShowStart).toISOString(),
                theater: show.Theatre,
                auditorium: show.TheatreAuditorium
            })
            toast.success(t('groupsPage.movieAdded'))
        } catch (e) { setErr(e.message || 'Failed to add showtime') }
    }

    // Auto-load theaters when opening the Finnkino modal
    useEffect(() => {
        if (!openFinnkino) return
        loadFinnkinoTheaters()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [openFinnkino])

    return (
        <section className="min-h-[60vh] px-3 py-6">
            <Link to="/groups" className="text-white/80 hover:underline">&larr; Back to groups</Link>

            {err && (
                <div className="mt-4 rounded-xl bg-red-900/40 border border-red-500/30 px-4 py-3 text-red-200">
                    {err}
                </div>
            )}

            {loading ? (
                <div className="rounded-2xl border border-white/10 bg-gray-900/60 p-6 animate-pulse mt-4">
                    <div className="h-6 w-48 bg-white/10 rounded mb-4" />
                    <div className="h-4 w-64 bg-white/10 rounded" />
                </div>
            ) : group && (
                <>
                    <div className="rounded-2xl border border-white/10 bg-gray-900/60 p-6 mt-4">
                        <h1 className="text-3xl font-semibold text-white">{group.name}</h1>
                        <p className="text-white/60 mt-1">Members: {group.members_count}</p>

                        {/* Oma toiminto */}
                        {!isOwner && (
                            <div className="mt-4 flex gap-2">
                                {!isLoggedIn ? (
                                    <span className="text-white/70 text-sm">Sign in to request to join</span>
                                ) : myStatus === 'APPROVED' ? (
                                    <button
                                        onClick={leave}
                                        className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white"
                                    >
                                        Leave group
                                    </button>
                                ) : myStatus === 'PENDING' ? (
                                    <span className="px-3 py-2 rounded-xl border border-white/10 text-white/70">Request pending…</span>
                                ) : (
                                    <button
                                        onClick={requestJoin}
                                        className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white"
                                    >
                                        Request to join
                                    </button>
                                )}
                            </div>
                        )}
                        {isOwner && (
                            <div className="mt-4">
                                <button
                                    onClick={() => {
                                        if (!confirm(t('groupsPage.deleteConfirm'))) return
                                        GroupsAPI.delete(id)
                                            .then(() => { toast.success(t('groupsPage.deleteSuccess')); navigate('/groups') })
                                            .catch(e => { setErr(e.message || t('groupsPage.deleteFailed')); toast.error(e?.message || t('groupsPage.deleteFailed')) })
                                    }}
                                    className="px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-200"
                                >
                                    Delete group
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Välilehti: Members – vain jäsen/omistaja näkee listan */}
                    <div className="rounded-2xl border border-white/10 bg-gray-900/60 p-6 mt-6">
                        <div className="flex gap-2 mb-4">
                            <button
                                className={`px-3 py-1.5 rounded-xl border border-white/10 ${tab === 'members' ? 'bg-white/15' : 'bg-white/10'}`}
                                onClick={() => setTab('members')}
                            >
                                Members
                            </button>
                            <button
                                className={`px-3 py-1.5 rounded-xl border border-white/10 ${tab === 'movies' ? 'bg-white/15' : 'bg-white/10'}`}
                                onClick={() => setTab('movies')}
                            >
                                Movies
                            </button>
                        </div>

                        {tab === 'members' && (isOwner || myStatus === 'APPROVED') ? (
                            <ul className="space-y-2">
                                {members.map((m) => (
                                    <li key={m.user_id} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-3">
                                        <div className="text-white/90">
                                            <div className="text-sm">{m.email || m.user_id}</div>
                                            <div className="text-xs text-white/60">{m.role} · {m.status}</div>
                                        </div>
                                        {(isOwner || (me?.role === 'MODERATOR' && myStatus === 'APPROVED')) && m.user_id !== likelyUserId && (
                                            <div className="flex gap-2">
                                                {m.status !== 'APPROVED' && (
                                                    <button onClick={() => approve(m)} className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white text-sm">
                                                        Approve
                                                    </button>
                                                )}
                                                {m.status !== 'REJECTED' && (
                                                    <button onClick={() => reject(m)} className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white text-sm">
                                                        Reject
                                                    </button>
                                                )}
                                                {(isOwner || me?.role === 'MODERATOR') && m.status === 'APPROVED' && (
                                                    <button onClick={() => GroupsAPI.removeMember(id, m.user_id).then(() => { setMembers(prev => prev.filter(x => x.user_id !== m.user_id)); toast.success(t('groupsPage.removed')) }).catch(e => { setErr(e.message); toast.error(e?.message || t('groupsPage.removeFailed')) })} className="px-2 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-200 text-sm">
                                                        Remove
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </li>
                                ))}
                                {members.length === 0 && <p className="text-white/60">No members yet.</p>}
                            </ul>
                        ) : tab === 'members' ? (
                            <p className="text-white/70">Only members can view this section.</p>
                        ) : null}

                        {tab === 'movies' && (isOwner || myStatus === 'APPROVED') && (
                            <div className="space-y-5">
                                <div className="flex gap-2 flex-wrap">
                                    <button onClick={() => { setOpenSearch(true); }} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white">Add from search</button>
                                    <button onClick={() => { setOpenFinnkino(true); loadFinnkinoTheaters(); }} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white">Add from theaters</button>
                                </div>
                                {/* Manual add form removed; use Add from search / Add from theaters */}

                                {movies.length === 0 ? (
                                    <p className="text-white/70">No movies yet.</p>
                                ) : (
                                    <ul className="space-y-4">
                                        {movies.map(m => (
                                            <li key={m.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <div className="text-white font-medium">{m.title || `Movie #${m.movie_id}`}</div>
                                                        <div className="text-white/60 text-sm">TMDB: {m.movie_id}</div>
                                                    </div>
                                                    {(isOwner || me?.role === 'MODERATOR') && (
                                                        <button onClick={() => GroupsAPI.deleteMovie(id, m.id).then(() => { setMovies(prev => prev.filter(x => x.id !== m.id)); toast.success(t('groupsPage.movieDeleted')) }).catch(e => { setErr(e.message); toast.error(e?.message || t('groupsPage.movieDeleteFailed')) })} className="px-2 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-200 text-sm">Delete</button>
                                                    )}
                                                </div>
                                                <Showtimes
                                                    showtimes={m.showtimes || []}
                                                    canEdit={isOwner || me?.role === 'MODERATOR'}
                                                    onAdd={(payload) => addShowtime(m.id, payload)}
                                                    onDelete={(sid) => deleteShowtime(m.id, sid)}
                                                />
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Hakumodaali (TMDB-haku) */}
            {openSearch && (
                <Modal title="Add movie from search" closeLabel={t('close')} onClose={() => setOpenSearch(false)}>
                    <form onSubmit={(e) => { e.preventDefault(); runSearch(1) }} className="flex gap-2 mb-4">
                        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search movies" className="flex-1 px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-white" />
                        <button className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white">Search</button>
                    </form>
                    {searchLoading ? (
                        <div className="text-white/70">Searching…</div>
                    ) : (
                        <ul className="grid gap-2 max-h-[60vh] overflow-auto">
                            {(searchRes.results || []).map(m => (
                                <li key={m.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3">
                                    <div className="text-white/90">{m.title} {m.release_date ? <span className="text-white/60 text-sm">({m.release_date?.slice(0,4)})</span> : null}</div>
                                    <button onClick={() => addFromSearch(m)} className="px-2 py-1 rounded bg-white/10 text-white text-sm">Add</button>
                                </li>
                            ))}
                            {(searchRes.results || []).length === 0 && <li className="text-white/60">No results</li>}
                        </ul>
                    )}
                </Modal>
            )}

            {/* Finnkino-modaali (näytösaikojen lisääminen) */}
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
                                                                                                                    buttonClassName="relative w-full h-10 inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white px-3 pr-8 focus:outline-none focus:ring-2 focus:ring-[#F18800]"
                                                                                            panelClassName="absolute z-50 mt-2 top-full left-0 min-w-[14rem] bg-gray-900/95 backdrop-blur-md border border-white/10 rounded-lg shadow-lg p-1"
                                                                                        />
                                                                                        <input type="date" value={selectedDate ? selectedDate.split('.').reverse().join('-') : ''} onChange={(e) => { const [y,m,d] = e.target.value.split('-'); setSelectedDate(`${d}.${m}.${y}`) }} className="px-3 h-10 rounded-xl bg-black/30 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-[#F18800]" />
                                                                                        <button onClick={loadFinnkinoShows} className="px-3 h-10 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white">{t('groupsPage.loadShows')}</button>
                                                                                </div>
                    {finnkinoLoading ? (
                        <div className="text-white/70">{t('loading')}</div>
                    ) : (
                        <ul className="grid gap-2 max-h-[60vh] overflow-auto">
                            {shows.map((s, i) => (
                                <li key={`${s.EventID}-${i}`} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3">
                                    <div className="text-white/90 text-sm">
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

function Showtimes({ showtimes, canEdit, onAdd, onDelete }) {
    const [time, setTime] = useState('')
    const [theater, setTheater] = useState('')
    const [auditorium, setAuditorium] = useState('')
    return (
        <div className="mt-4">
            <h3 className="text-white/90 mb-2">Showtimes</h3>
            {showtimes.length === 0 ? (
                <p className="text-white/60">No showtimes</p>
            ) : (
                <ul className="space-y-2">
                    {showtimes.map(s => (
                        <li key={s.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                            <div className="text-white/90 text-sm">
                                {new Date(s.starts_at).toLocaleString('fi-FI')} {s.theater && `· ${s.theater}`} {s.auditorium && `· ${s.auditorium}`}
                            </div>
                            {canEdit && <button onClick={() => onDelete(s.id)} className="px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-200 text-xs">Delete</button>}
                        </li>
                    ))}
                </ul>
            )}
            {canEdit && (
                <form onSubmit={(e) => { e.preventDefault(); if (!time) return; onAdd({ starts_at: new Date(time).toISOString(), theater, auditorium }); setTime(''); setTheater(''); setAuditorium(''); }} className="mt-3 flex flex-col sm:flex-row gap-2">
                    <input type="datetime-local" value={time} onChange={e => setTime(e.target.value)} className="px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-white" />
                    <input type="text" placeholder="Theater" value={theater} onChange={e => setTheater(e.target.value)} className="px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-white" />
                    <input type="text" placeholder="Auditorium" value={auditorium} onChange={e => setAuditorium(e.target.value)} className="px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-white" />
                    <button className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white">Add showtime</button>
                </form>
            )}
        </div>
    )
}

// --- Moodaaleja ---
 function Modal({ title, onClose, children, closeLabel = 'Close' }) {
    return (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />
            <div className="absolute inset-0 grid place-items-center p-4">
                <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-gray-900/90 p-5">
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
