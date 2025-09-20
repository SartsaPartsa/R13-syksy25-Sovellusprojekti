import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useUser } from '../context/useUser'
import FancySelect from './FancySelect'

// Navbar: responsive top bar with navigation, search, language and theater pickers

// Navigation links used by both desktop and mobile menus
// Navigation links always visible
const LINKS = [
  { to: '/', key: 'home' },
  { to: '/theaters', key: 'theaters' },
  { to: '/reviews', key: 'reviews' },
  { to: '/groups', key: 'groups' },
  { to: '/favorites', key: 'favorites' },
]

// Links visible only when user is logged in
const AUTH_LINKS = [ { to: '/account', key: 'myAccount' } ]

// Navbar: responsive top navigation with search, language and theater selectors
export function Navbar() {
  const [open, setOpen] = useState(false) // mobile menu
  const [searchOpen, setSearchOpen] = useState(false) // floating search panel
  const searchPanelRef = useRef(null)
  const searchBtnDesktopRef = useRef(null)
  const searchBtnMobileRef = useRef(null)
  const { t, i18n } = useTranslation('common')
  const navigate = useNavigate()
  const { isAuthenticated, logout: ctxLogout } = useUser()
  const location = useLocation()
  const [term, setTerm] = useState('')
  const langToTMDB = (lng) => (lng?.startsWith('fi') ? 'fi-FI' : 'en-US')
  const [userLoggedIn, setUserLoggedIn] = useState(false)
  const visibleLinks = userLoggedIn ? [...LINKS, ...AUTH_LINKS] : LINKS

  // Theater quick-select (Finnkino) state
  const [theaters, setTheaters] = useState([])
  const [theatersLoading, setTheatersLoading] = useState(false)
  const [selectedTheater, setSelectedTheater] = useState('')

  // Keep login state in sync with auth context
  useEffect(() => { 
    setUserLoggedIn(isAuthenticated) 
  }, [isAuthenticated])

  // Logout and redirect to home
   function logout() {
     ctxLogout()
     navigate('/')
   }

  // Perform global search and close popovers
  function submitSearch() {
    const q = term.trim()
    if (!q) return
    const tmdbLang = langToTMDB(i18n.language)
    navigate(`/search?q=${encodeURIComponent(q)}&page=1&language=${tmdbLang}`)
    setSearchOpen(false)
    setOpen(false)
  }

  // Change UI language
  const changeLang = (lng) => {
    i18n.changeLanguage(lng)
    try { localStorage.setItem('lang', lng) } catch {}
  }

  // Global keyboard/resize handlers
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { setOpen(false); setSearchOpen(false) }
    }
    const onResize = () => window.innerWidth >= 768 && setOpen(false)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  // Close floating search when clicking outside
  useEffect(() => {
    if (!searchOpen) return
    const handler = (e) => {
      const t = e.target
      const panel = searchPanelRef.current
      const b1 = searchBtnDesktopRef.current
      const b2 = searchBtnMobileRef.current
      if (panel && !panel.contains(t) && !(b1 && b1.contains(t)) && !(b2 && b2.contains(t))) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [searchOpen])

  // Fetch theaters once (Finnkino XML API)
  useEffect(() => {
    let aborted = false
    async function load() {
      try {
        setTheatersLoading(true)
        const r = await fetch('https://www.finnkino.fi/xml/TheatreAreas/', { headers: { 'Accept': 'text/xml,application/xml;q=0.9,*/*;q=0.8' } })
        if (!r.ok) throw new Error(r.status)
        const xml = await r.text()
        if (aborted) return
        const doc = new window.DOMParser().parseFromString(xml, 'text/xml')
        const nodes = Array.from(doc.getElementsByTagName('TheatreArea'))
        const list = nodes
          .map(n => ({ id: n.getElementsByTagName('ID')[0]?.textContent, name: n.getElementsByTagName('Name')[0]?.textContent }))
          .filter(x => x.id && x.name && x.id !== '-1')
          // Remove placeholder entries (Finnish/English)
          .filter(x => !/valitse\s+alue\/?teatteri/i.test(x.name) && !/choose\s+area\/?theater/i.test(x.name))
        setTheaters(list)
  } catch {
        // Silent in navbar; Theaters page remains usable
      } finally {
        if (!aborted) setTheatersLoading(false)
      }
    }
    load()
    return () => { aborted = true }
  }, [])

  // Sync selected theater with URL param
  useEffect(() => {
    const sp = new URLSearchParams(location.search)
    const area = sp.get('area') || ''
    if (area !== selectedTheater) setSelectedTheater(area)
  }, [location.search])

  // Pretty theater names
  const cleanTheaterName = (name) =>
    name?.replace(/\s*\((?:pl\.?|excl\.?)\s*Espoo\)\s*$/i, '') || ''
  const theaterOptions = theaters.map(t => ({ value: t.id, label: cleanTheaterName(t.name) }))

  // Navigate to theater page on select
  function onSelectTheater(id) {
    setSelectedTheater(id)
    navigate(`/theaters?area=${encodeURIComponent(id)}`)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-gray-900/90 backdrop-blur relative">
      <nav className="flex h-16 w-full items-center justify-between px-4 md:px-8 max-w-7xl mx-auto relative">
        {/* App logo/title */}
        <Link
          to="/"
          className="group inline-flex items-center gap-3"
          aria-label={t('home')}
          onClick={() => { setOpen(false); setSearchOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
        >
          <span className="inline-grid h-10 w-10 place-items-center rounded-full bg-[#F18800] text-black font-bold shadow-sm transition group-hover:scale-105" aria-hidden>
            <span className="text-2xl">🎥</span>
          </span>
          <span className="text-lg font-semibold tracking-tight text-white">{t('appName')}</span>
        </Link>

        {/* Desktop navigation + actions */}
        <div className="hidden md:flex items-center">
          <ul className="flex list-none items-center gap-1 mr-3">
            {visibleLinks.map(l => (
              <li key={l.key}>
                <NavLink
                  to={(!userLoggedIn && l.to === '/favorites') ? '/shared' : l.to}
                  end={l.to === '/'}
                  onClick={() => { setOpen(false); setSearchOpen(false) }}
                  className={({ isActive }) =>
                    `block rounded-md px-4 py-2 transition-colors font-medium ${
                      isActive ? 'bg-white/15 text-white' : 'text-gray-100 hover:text-white hover:bg-white/10'
                    }`
                  }
                >
                  {t(l.key)}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3">
            {/* Theater select (shared FancySelect) */}
            <FancySelect
              value={selectedTheater}
              onChange={onSelectTheater}
              placeholder={theatersLoading ? '…' : t('chooseTheater')}
              options={theaterOptions}
              align="left"
              labelClassName="truncate max-w-[12ch]"
            />
            {/* Language (shared FancySelect) */}
            <FancySelect
              value={i18n.language}
              onChange={(lng) => changeLang(lng)}
              options={[{ value: 'fi', label: 'FIN' }, { value: 'en', label: 'ENG' }]}
              labelClassName="truncate max-w-[11rem]"
            />

            {/* Auth button */}
              {userLoggedIn ? (
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center bg-[#F18800] hover:bg-[#F18800]/90 text-black font-medium px-4 rounded-md h-10 transition-colors shadow-sm ring-1 ring-black/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F18800]/60"
                >
                  {t('logout')}
                </button>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex items-center bg-[#F18800] hover:bg-[#F18800]/90 text-black font-medium px-4 rounded-md h-10 transition-colors shadow-sm ring-1 ring-black/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F18800]/60"
                >
                  {t('login')}
                </Link>
              )}

            {/* Search (desktop) */}
            <button
              type="button"
              aria-label="Search"
              className="inline-flex items-center justify-center rounded-full p-2 text-white hover:bg-white/10 ring-1 ring-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F18800]"
              ref={searchBtnDesktopRef}
              onClick={() => setSearchOpen(v => !v)}
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile: search button + burger */}
        <div className="md:hidden flex items-center gap-1">
          <button
            type="button"
            aria-label="Search"
            className="md:hidden inline-flex items-center justify-center rounded-lg p-2 text-white hover:bg-gray-800"
            ref={searchBtnMobileRef}
            onClick={() => setSearchOpen(v => !v)}
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z" />
            </svg>
          </button>

          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen(v => !v)}
            className="md:hidden inline-flex items-center justify-center rounded-lg p-2 text-white hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F18800]"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              {open ? (
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M3 12h18M3 18h18" />
              )}
            </svg>
          </button>
        </div>

        {/* Floating search panel */}
        {searchOpen && (
          <div className="absolute right-0 top-16 z-50">
            <div
              ref={searchPanelRef}
              className="bg-gray-900/95 backdrop-blur-md border border-white/10 rounded-lg shadow-lg p-3 w-[calc(100vw-2rem)] max-w-sm"
            >
              <form
                onSubmit={(e) => { e.preventDefault(); submitSearch() }}
                className="flex items-center gap-2"
              >
                <label className="sr-only" htmlFor="global-search">{t('search')}</label>
                <input
                  id="global-search"
                      type="text"
                      placeholder={t('search')}
                      autoFocus
                      value={term}
                      onChange={(e) => setTerm(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitSearch() } }}
                      className="w-full rounded-md bg-gray-800/60 text-white placeholder-gray-400 px-3 py-2 ring-1 ring-white/10 focus:ring-2 focus:ring-[#F18800] outline-none"
                    />
                    <button
                      type="submit"
                      aria-label={t('search')}
                      className="inline-flex items-center justify-center rounded-md px-3 py-2 bg-white/10 hover:bg-white/20 ring-1 ring-white/10"
                    >
                   <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                     <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z" />
                   </svg>
                 </button>
               </form>
            </div>
          </div>
        )}
      </nav>

      {/* Mobile dropdown panel */}
      <div className={`md:hidden absolute inset-x-0 top-16 bg-gray-900/98 backdrop-blur-xl backdrop-saturate-200 shadow-lg border-b border-white/10 ${open ? 'block' : 'hidden'}`}>
        <ul className="list-none px-4 py-2 md:px-8 divide-y divide-white/5">
          {visibleLinks.map(l => (
            <li key={l.key}>
              <NavLink
                to={(!userLoggedIn && l.to === '/favorites') ? '/shared' : l.to}
                end={l.to === '/'}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-3 transition-colors ${
                    isActive ? 'bg-white/10 text-white' : 'text-white hover:bg-white/5'
                  }`
                }
              >
                {t(l.key)}
              </NavLink>
            </li>
          ))}

          {/* Mobile selectors */}
          <li className="px-1 pt-3">
            <div className="relative">
              <select
                className="w-full appearance-none bg-gray-800/60 text-white ring-1 ring-white/10 hover:ring-white/20 focus:outline-none focus:ring-2 focus:ring-[#F18800] rounded-md px-3 pr-8 h-10"
                value={selectedTheater}
                onChange={(e) => { const v = e.target.value; if (v) onSelectTheater(v) }}
              >
                {theaterOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.17l3.71-2.94a.75.75 0 1 1 .94 1.16l-4.24 3.36a.75.75 0 0 1-.94 0L5.21 8.39a.75.75 0 0 1 .02-1.18z"/></svg>
            </div>
          </li>
          <li className="px-1 pt-3">
            <div className="relative">
              <select
                className="w-full appearance-none bg-gray-800/60 text-white ring-1 ring-white/10 hover:ring-white/20 focus:outline-none focus:ring-2 focus:ring-[#F18800] rounded-md px-3 pr-8 h-10"
                value={i18n.language}
                onChange={(e) => changeLang(e.target.value)}
              >
                <option value="fi">FIN</option>
                <option value="en">ENG</option>
              </select>
              <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.17l3.71-2.94a.75.75 0 1 1 .94 1.16l-4.24 3.36a.75.75 0 0 1-.94 0L5.21 8.39a.75.75 0 0 1 .02-1.18z"/></svg>
            </div>
          </li>
          <li className="px-1 pt-3 pb-2">
            {userLoggedIn ? (
              <button
                type="button"
                onClick={() => { logout(); setOpen(false) }}
                className="block w-full rounded-md bg-[#F18800] px-3 py-2 text-center font-medium text-black hover:bg-[#F18800]/90 shadow-sm ring-1 ring-black/10"
              >
                {t('logout')}
              </button>
            ) : (
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="block rounded-md bg-[#F18800] px-3 py-2 text-center font-medium text-black hover:bg-[#F18800]/90 shadow-sm ring-1 ring-black/10"
              >
                {t('login')}
              </Link>
            )}
          </li>
        </ul>
      </div>
    </header>
  )
}

