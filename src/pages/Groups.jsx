import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { GroupsAPI, getAuthToken } from '../lib/api'

export default function Groups() {
  const { t } = useTranslation('common')
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // modal state
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  useEffect(() => {
    let cancelled = false
  let es
  let retry
    ;(async () => {
      try {
        const data = await GroupsAPI.list()
        if (!cancelled) setGroups(Array.isArray(data) ? data : [])
      } catch (e) {
        if (!cancelled) setError(e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    // SSE: kuuntele ryhmälistan muutoksia
    const start = () => {
      try {
        const tk = getAuthToken()
        if (!tk) return
        es = new EventSource(`/api/groups/stream?token=${encodeURIComponent(tk)}`)
        const reload = () => GroupsAPI.list().then((d)=>!cancelled && setGroups(Array.isArray(d)?d:[])).catch(()=>{})
        es.addEventListener('group-created', reload)
        es.addEventListener('group-deleted', reload)
        es.onerror = () => {
          try { es?.close() } catch {}
          if (!cancelled) retry = setTimeout(() => start(), 3000)
        }
      } catch {
        if (!cancelled) retry = setTimeout(() => start(), 3000)
      }
    }
    start()
    return () => { cancelled = true; if (es) es.close(); if (retry) clearTimeout(retry) }
  }, [])

  const onCreate = async (e) => {
    e.preventDefault()
    setFormError(null)
    const trimmed = name.trim()
    if (trimmed.length === 0 || trimmed.length > 120) {
      setFormError('Name must be 1–120 characters.')
      return
    }
    setSubmitting(true)
    try {
      const created = await GroupsAPI.create({ name: trimmed })
      setGroups((prev) => [created, ...prev])
      setName('')
      setOpen(false)
  toast.success(t('groupsPage.createSuccess'))
    } catch (e) {
  setFormError(e?.message || t('groupsPage.createFailed'))
  toast.error(e?.message || t('groupsPage.createFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="min-h-[60vh] px-3 py-6">
      <h1 className="text-2xl font-semibold text-white mb-4">
        {t('groups') || 'Groups'}
      </h1>

      <div className="mb-6">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg px-16 py-2 border border-white/10 bg-white/10 hover:bg-white/15 text-white"
          onClick={() => setOpen(true)}
        >
          {t('groupsPage.createBtn')}
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
          {t('errorFetchingData')}{' '}
          <span className="opacity-75 text-sm">({error.message})</span>
        </div>
      ) : groups.length === 0 ? (
        <EmptyState t={t} />
      ) : (
        <ul className="grid gap-3">
          {groups.map((g) => (
            <GroupCard key={g.id || g._id} group={g} t={t} />
          ))}
        </ul>
      )}

      {/* CREATE MODAL */}
      {open && (
        <div className="fixed inset-0 z-50">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !submitting && setOpen(false)}
          />
          {/* dialog */}
          <div className="absolute inset-0 grid place-items-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-gray-900/80 p-5 shadow-xl">
              <h2 className="text-white text-lg font-medium mb-3">
                {t('groupsPage.createDialogTitle')}
              </h2>
              <form onSubmit={onCreate} className="space-y-4">
                <div>
                  <label className="block text-sm text-white/70 mb-1">
                    {t('groupsPage.nameLabel')}
                  </label>
                  <input
                    className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                    placeholder={t('groupsPage.namePlaceholder')}
                    maxLength={120}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={submitting}
                    autoFocus
                  />
                </div>
                {formError && (
                  <p className="text-red-300 text-sm">{t('groupsPage.errorNameInvalid')}</p>
                )}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    className="px-3 py-2 rounded-lg border border-white/10 text-white/80 hover:bg-white/10"
                    onClick={() => setOpen(false)}
                    disabled={submitting}
                  >
                    {t('groupsPage.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-2 rounded-lg bg-white text-black hover:bg-white/90 disabled:opacity-60"
                    disabled={submitting}
                  >
                    {submitting ? t('groupsPage.creating') : t('groupsPage.create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

/* --- apukomponentit --- */

function GroupCard({ group, t }) {
  const id = group.id ?? group._id
  const name = group.name ?? group.title ?? 'Unnamed group'
  const owner = group.owner_email ?? group.owner?.email ?? '—'
  const members = group.membersCount ?? group.members_count ?? group.members?.length ?? 1
  const createdAt = group.created_at ?? group.createdAt

  return (
    <li className="rounded-2xl border border-white/10 bg-gray-900/60 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-white text-lg font-medium">{name}</h3>
          <p className="text-white/70 text-sm">
            {owner !== '—' && <>
              <span className="text-white/80">{t('groupsPage.owner')}:</span> <span className="text-white/90">{owner}</span> ·
            </>}
            <span className="text-white/80">{t('groupsPage.members')}:</span> <span className="text-white/90">{members}</span>
            {createdAt && <> · <span className="text-white/80">{t('groupsPage.created')}:</span> <span className="text-white/90">{fmtDate(createdAt)}</span></>}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/groups/${id}`}
            className="rounded-lg px-3 py-1.5 border border-white/10 bg-white/10 hover:bg-white/15 text-white"
          >
            {t('groupsPage.openCta')}
          </Link>
        </div>
      </div>
    </li>
  )
}

function EmptyState({ t }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-gray-900/60 p-8 text-center">
  <p className="text-white/80">{t('groupsPage.emptyTitle')}</p>
  <p className="text-white/60 text-sm mt-1">{t('groupsPage.emptyLead')}</p>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/10 bg-gray-900/60 p-4 animate-pulse">
      <div className="h-5 w-40 bg-white/10 rounded mb-2" />
      <div className="h-4 w-64 bg-white/10 rounded" />
    </div>
  )
}

function fmtDate(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  let lang = 'fi-FI'
  try { lang = (localStorage.getItem('lang') === 'en') ? 'en-US' : 'fi-FI' } catch {}
  return d.toLocaleDateString(lang)
}
