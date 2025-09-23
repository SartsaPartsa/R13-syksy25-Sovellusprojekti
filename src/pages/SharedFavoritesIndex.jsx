import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FavoritesAPI } from '../lib/api'

export default function SharedFavoritesIndex() {
  // List all shared favorites lists
  const { t } = useTranslation('common')
  // state
  const [lists, setLists] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // load shared lists
  useEffect(() => {
    let ignore = false
    async function load() {
      setLoading(true); setError(null)
      try {
        const data = await FavoritesAPI.sharedLists()
        if (!ignore) setLists(Array.isArray(data) ? data : [])
      } catch (e) { if (!ignore) setError(e.message) } finally { if (!ignore) setLoading(false) }
    }
    load(); return () => { ignore = true }
  }, [])

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">{t('favoritesPage.title')}</h1>
      {loading && <div className="text-neutral-300">{t('favoritesShare.loadingShared')}</div>}
      {error && <div className="text-red-300">{t('errorFetchingData')}: {error}</div>}
      {!loading && lists.length === 0 && (
        <div className="text-neutral-300">{t('favoritesShare.noneSharedYet')}</div>
      )}
      {/* Lists */}
      <div className="flex flex-wrap gap-2">
        {lists.map((s) => (
          <Link
            key={s.slug}
            to={`/shared/${s.slug}`}
            className="px-3 py-1.5 rounded-full text-sm border transition bg-neutral-900/50 text-neutral-300 border-neutral-700 hover:border-neutral-500"
            title={`${t('favoritesShare.showListPrefix')} ${s.display_name}`}
          >
            {s.display_name}
          </Link>
        ))}
      </div>
    </div>
  )
}
