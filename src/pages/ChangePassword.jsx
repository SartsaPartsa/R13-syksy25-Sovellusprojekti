import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useUser } from '../context/useUser'
import { useTranslation } from 'react-i18next'
import { changeMyPassword } from '../lib/api.js'
import { toast } from 'react-toastify'

export default function ChangePassword() {
  const { token, signOut } = useUser()
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [loading, setLoading] = useState(false)

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()

    // basic validation
    if (!form.currentPassword || !form.newPassword) {
      toast.error(t('changePassword.errors.missing')); return
    }
    if (form.newPassword !== form.confirm) {
      toast.error(t('changePassword.errors.mismatch')); return
    }
    if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(form.newPassword)) {
      toast.error(t('invalidPassword')); return
    }
    if (form.currentPassword === form.newPassword) {
      toast.error(t('changePassword.errors.sameAsOld')); return
    }

    // get token from context or localStorage
    const tk =
      token ||
      (JSON.parse(localStorage.getItem('auth') || 'null')?.token ?? '')

    if (!tk) {
      toast.error('No token provided — kirjaudu sisään uudelleen.')
      return
    }

    try {
      setLoading(true)

      // call API and show toast state
      await toast.promise(
        changeMyPassword(form.currentPassword, form.newPassword, tk),
        {
          pending: t('changePassword.saving'),
          success: t('changePassword.success'),
          error: {
            render({ data }) {
              return data?.message || t('changePassword.errors.failed')
            }
          }
        }
      )

      // clear auth and sign out after success
      try { localStorage.removeItem('auth') } catch { }
      signOut?.()
      navigate('/login', { replace: true })
    } catch {
      // ignore, toast already shows error
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="min-h-[60vh] grid place-items-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-gray-900/60 p-6">
        <h1 className="text-2xl font-semibold text-white">{t('changePassword.title')}</h1>
        <p className="text-white/70 mt-1">{t('changePassword.lead')}</p>

        {/* Change password form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm text-white/80 mb-1">{t('changePassword.current')}</label>
            <input
              type="password"
              name="currentPassword"
              value={form.currentPassword}
              onChange={onChange}
              className="w-full px-4 py-2 rounded bg-gray-800 text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-white/80 mb-1">{t('changePassword.new')}</label>
            <input
              type="password"
              name="newPassword"
              value={form.newPassword}
              onChange={onChange}
              className="w-full px-4 py-2 rounded bg-gray-800 text-white"
            />
            <p className="text-xs text-white/50 mt-1">{t('changePassword.hint')}</p>
          </div>

          <div>
            <label className="block text-sm text-white/80 mb-1">{t('changePassword.confirm')}</label>
            <input
              type="password"
              name="confirm"
              value={form.confirm}
              onChange={onChange}
              className="w-full px-4 py-2 rounded bg-gray-800 text-white"
            />
          </div>

          {/* Save new password */}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
          >
            {loading ? t('changePassword.saving') : t('changePassword.saveBtn')}
          </button>
        </form>

        {/* Back link */}
        <div className="mt-4">
          <Link to="/account" className="text-blue-400 hover:underline">
            {t('changePassword.back')}
          </Link>
        </div>
      </div>
    </section>
  )
}
