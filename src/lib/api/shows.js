// Finnkino shows helper
// Fetch area list, get Helsinki region, fetch today's shows, return top N
import { XMLParser } from 'fast-xml-parser'

const FINNKINO_API = 'https://www.finnkino.fi/xml'

// Format date as dd.MM.yyyy
function formatTodayFi() {
    const d = new Date()
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${dd}.${mm}.${yyyy}`
}

// Normalize name for simple compare
function normalizeName(s) {
    return String(s || '')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .trim()
}

// Build Finnkino event URL
export function buildFinnkinoEventUrl(eventId, title) {
    if (!eventId) return undefined
    const slug = String(title || '')
        .toLowerCase()
        .replace(/[åä]/g, 'a')
        .replace(/[ö]/g, 'o')
        .replace(/[^a-z0-9]+/g, '-')
    return `https://www.finnkino.fi/event/${eventId}/title/${slug}`
}

export async function fetchMetroTodayTopShows(limit = 3) {
    const parser = new XMLParser({ ignoreAttributes: false })
    // 1) Get theatre areas
    const areasRes = await fetch(`${FINNKINO_API}/TheatreAreas/`)
    const areasXml = await areasRes.text()
    const areasJson = parser.parse(areasXml)
    let areas = areasJson?.TheatreAreas?.TheatreArea || []
    if (!Array.isArray(areas)) areas = [areas]

    // Find Helsinki region (tolerant to accents)
    const metro = areas.find(a => normalizeName(a?.Name) === 'paakaupunkiseutu')
    const metroId = metro?.ID

    const today = formatTodayFi()

    // Fetch schedule for one area
    const fetchScheduleForArea = async (areaId) => {
        const res = await fetch(`${FINNKINO_API}/Schedule/?area=${areaId}&dt=${today}`)
        const xml = await res.text()
        const json = parser.parse(xml)
        let list = json?.Schedule?.Shows?.Show || []
        if (!Array.isArray(list)) list = [list]
        return list
    }

    let showList = []
    if (metroId) {
        try {
            showList = await fetchScheduleForArea(metroId)
        } catch (_) {
            showList = []
        }
    }

    // Fallback to city theaters if metro not found
    if (!metroId || showList.length === 0) {
        const targetCities = new Set(['helsinki', 'espoo', 'vantaa', 'kauniainen'])
        const cityTheaters = areas
            .map(a => ({ id: a.ID, name: String(a.Name || '') }))
            // Entries of form "City: Theater"
            .filter(a => a.name.includes(':'))
            .filter(a => targetCities.has(normalizeName(a.name.split(':')[0])))

        // Limit to first 8 theaters to avoid many requests
        const limited = cityTheaters.slice(0, 8)
        const allLists = await Promise.all(limited.map(t => fetchScheduleForArea(t.id).catch(() => [])))
        showList = allLists.flat()
    }

    // Map shows to small objects
    const mapped = showList.map(Show => ({
        title: Show?.Title,
        originalTitle: Show?.OriginalTitle,
        year: Show?.ProductionYear,
        start: Show?.dttmShowStart,
        theatre: Show?.Theatre,
        theatreAuditorium: Show?.TheatreAuditorium,
        theatreId: Show?.TheatreID,
        eventId: Show?.EventID,
        image: Show?.Images ? Show.Images.EventSmallImagePortrait : null,
    }))

    // Return next N shows, or recent ones if none upcoming
    const now = new Date()
    const upcoming = mapped
        .filter(s => {
            const st = new Date(s.start)
            return (
                st.getFullYear() === now.getFullYear() &&
                st.getMonth() === now.getMonth() &&
                st.getDate() === now.getDate() &&
                st >= now
            )
        })
        .sort((a, b) => new Date(a.start) - new Date(b.start))

    if (upcoming.length >= limit) return upcoming.slice(0, limit)

    const pastToday = mapped
        .filter(s => {
            const st = new Date(s.start)
            return (
                st.getFullYear() === now.getFullYear() &&
                st.getMonth() === now.getMonth() &&
                st.getDate() === now.getDate() &&
                st < now
            )
        })
        .sort((a, b) => new Date(b.start) - new Date(a.start))

    return pastToday.slice(0, limit)
}
