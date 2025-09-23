import { useUser } from '../context/useUser'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { deleteMyAccount } from '../lib/api.js'
import { toast } from 'react-toastify'

export default function Account() {
  // user and auth
  const { user, token, signOut } = useUser()
  // translations
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  // derive email from context or localStorage
  const email = useMemo(() => {
    if (user?.email) return user.email
    try { return JSON.parse(localStorage.getItem('auth'))?.user?.email || '' } catch { return '' }
  }, [user])

  // get token from context or localStorage
  const tk = useMemo(() => {
    if (token) return token
    try { return JSON.parse(localStorage.getItem('auth'))?.token || '' } catch { return '' }
  }, [token])

  // Show a confirm toast, resolve true or false
  function confirmDeleteToast() {
    return new Promise((resolve) => {
      let id
      id = toast(() => (
        <div className="space-y-3">
          <p className="font-semibold text-black">{t('account.confirmTitle', 'Poista tili?')}</p>
          <p className="text-sm text-black">{t('account.confirmDelete', 'Haluatko varmasti poistaa tilin? Tätä toimintoa ei voi perua.')}</p>
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => { toast.dismiss(id); resolve(true) }}
              className="px-3 py-1.5 rounded-md bg-red-500/20 hover:bg-red-500/30 border border-red-600 text-red-600"
            >
              {t('account.deleteBtn', 'Poista tili')}
            </button>
          </div>
        </div>
      ), { autoClose: false, closeOnClick: false, closeButton: true, draggable: false, hideProgressBar: true })
    })
  }

  const handleDelete = async () => {
    setErr('')

    // Confirm with toast
    const ok = await confirmDeleteToast()
    if (!ok) return

    // Check token
    if (!tk) {
      const msg = 'No token provided — kirjaudu sisään uudelleen.'
      setErr(msg)
      toast.error(msg)
      return
    }

    // Run delete, show success or error
    setLoading(true)
    const tid = toast.loading(t('account.deleting')) // “Deleting…”
    try {
      await deleteMyAccount(tk)

      toast.update(tid, {
        render: t('account.deleted'),  // “Account deleted.”
        type: 'success',
        isLoading: false,
        autoClose: 2200,
      })

      try { localStorage.removeItem('auth') } catch { }
      signOut?.()
      // short delay so toast stays visible before navigation
      setTimeout(() => navigate('/', { replace: true }), 50)
    } catch (e) {
      const msg = e?.message || t('account.deleteFailed', 'Failed to delete account')
      setErr(msg)
      toast.update(tid, { render: msg, type: 'error', isLoading: false, autoClose: 4000 })
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="p-4">
      <h1 className="text-2xl font-semibold mb-2">{t('myAccount')}</h1>

      <div className="bg-white/5 p-4 rounded-lg border border-white/10 max-w-md">
        <p className="text-sm text-slate-400 mb-1">{t('email')}</p>
        <p className="text-white font-mono">{email}</p>
      </div>

      {/* Errors and auth state */}
      {err && <p className="text-red-400 text-sm mt-3">{err}</p>}
      {!tk && <p className="text-amber-300 text-sm mt-2">No token provided — kirjaudu sisään uudelleen.</p>}

      <div className="max-w-md mt-6 space-y-6">
        {/* Link to change password */}
        <Link
          to="/account/password"
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-white/10 bg-white/10 hover:bg-white/15 text-white"
        >
          {t('changePassword.go')}
        </Link>

        {/* Delete account */}
        <button
          onClick={handleDelete}
          disabled={loading || !tk}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-red-600/60 bg-red-500/10 hover:bg-red-500/20 text-red-200 disabled:opacity-60"
        >
          {loading ? t('account.deleting') : t('account.deleteBtn')}
        </button>
      </div>
    </section>
  )
}
