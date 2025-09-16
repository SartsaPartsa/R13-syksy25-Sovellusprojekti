// src/pages/Account.jsx
import { useUser } from '../context/useUser'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { deleteMyAccount } from '../lib/api.js'
import { toast } from 'react-toastify'

export default function Account() {
  const { user, token, signOut } = useUser()
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const email = useMemo(() => {
    if (user?.email) return user.email
    try { return JSON.parse(localStorage.getItem('auth'))?.user?.email || '' } catch { return '' }
  }, [user])

  const tk = useMemo(() => {
    if (token) return token
    try { return JSON.parse(localStorage.getItem('auth'))?.token || '' } catch { return '' }
  }, [token])

  // Тост-подтверждение (возвращает true/false)
  function confirmDeleteToast() {
    return new Promise((resolve) => {
      let id
      id = toast(
        ({ closeToast }) => (
          <div className="space-y-3">
            <p className="font-semibold">
              {t('account.confirmTitle', 'Poista tili?')}
            </p>
            <p className="text-sm opacity-80">
              {t('account.confirmDelete', 'Haluatko varmasti poistaa tilin? Tätä toimintoa ei voi perua.')}
            </p>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => { toast.dismiss(id); resolve(false) }}
                className="px-3 py-1.5 rounded-md bg-white/10 text-white hover:bg-white/20"
              >
                {t('common.cancel', 'Peruuta')}
              </button>
              <button
                onClick={() => { toast.dismiss(id); resolve(true) }}
                className="px-3 py-1.5 rounded-md border border-red-500/60 text-red-300 hover:bg-red-500/10"
              >
                {t('account.deleteBtn', 'Poista tili')}
              </button>
            </div>
          </div>
        ),
        { autoClose: false, closeOnClick: false, draggable: false, hideProgressBar: true }
      )
    })
  }

  const handleDelete = async () => {
    setErr('')

    // 1) Подтверждение тостом
    const ok = await confirmDeleteToast()
    if (!ok) return

    // 2) Проверка токена
    if (!tk) {
      const msg = 'No token provided — kirjaudu sisään uudelleen.'
      setErr(msg)
      toast.error(msg)
      return
    }

    // 3) Процесс → успех/ошибка
    setLoading(true)
    const tid = toast.loading(t('account.deleting')) // “Poistetaan…”
    try {
      await deleteMyAccount(tk)

      toast.update(tid, {
        render: t('account.deleted'),  // “Tili poistettu.”
        type: 'success',
        isLoading: false,
        autoClose: 2200,
      })

      try { localStorage.removeItem('auth') } catch {}
      signOut?.()
      // лёгкая пауза, чтобы тост не «съедался» навигацией
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

      {err && <p className="text-red-400 text-sm mt-3">{err}</p>}
      {!tk && <p className="text-amber-300 text-sm mt-2">No token provided — kirjaudu sisään uudelleen.</p>}

      <div className="max-w-md mt-6 space-y-3">
        <button
          onClick={handleDelete}
          disabled={loading || !tk}
          className="w-full px-4 py-2 rounded-lg border border-red-500/60 text-red-300 hover:bg-red-500/10 disabled:opacity-60"
        >
          {loading ? t('account.deleting') : t('account.deleteBtn')}
        </button>

        <Link
          to="/account/password"
          className="w-full inline-block text-center px-4 py-2 rounded-lg border border-white/20 text-white hover:bg-white/10"
        >
          {t('changePassword.go')}
        </Link>
      </div>
    </section>
  )
}
