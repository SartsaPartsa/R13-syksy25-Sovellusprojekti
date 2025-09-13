// src/pages/Account.jsx
import { useUser } from '../context/useUser'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { deleteMyAccount } from '../lib/api'

export default function Account() {
  const { user, token, signOut } = useUser()
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  // email показываем из авторизованных данных
  const email = useMemo(() => {
    if (user?.email) return user.email
    try { return JSON.parse(localStorage.getItem('auth'))?.user?.email || '' } catch { return '' }
  }, [user])

  // токен (для дизейбла кнопки)
  const tk = useMemo(() => {
    if (token) return token
    try { return JSON.parse(localStorage.getItem('auth'))?.token || '' } catch { return '' }
  }, [token])

  const handleDelete = async () => {
    setErr('')
    if (!window.confirm(t('account.confirmDelete'))) return
    if (!tk) { setErr('No token provided'); return }

    try {
      setLoading(true)
      // функция сама бросит ошибку, если что-то пойдёт не так
      await deleteMyAccount(tk)

      // локальный логаут + редирект
      try { localStorage.removeItem('auth') } catch {}
      signOut?.()
      navigate('/', { replace: true })
      alert(t('account.deleted'))
    } catch (e) {
      // если сервер вернул 401, deleteMyAccount уже кинет ошибку
      setErr(e.message || 'Failed to delete account')
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

      <div className="max-w-md mt-6">
        <button
          onClick={handleDelete}
          disabled={loading || !tk}
          className="w-full px-4 py-2 rounded-lg border border-red-500/60 text-red-300 hover:bg-red-500/10 disabled:opacity-60"
        >
          {loading ? t('account.deleting') : t('account.deleteBtn')}
        </button>
      </div>
    </section>
  )
}
