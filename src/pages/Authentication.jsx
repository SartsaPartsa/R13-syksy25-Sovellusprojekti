import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/useUser'
import { toast } from 'react-toastify'

export const AuthenticationMode = Object.freeze({
  SignIn: 'SignIn',
  SignUp: 'SignUp',
})

export default function Authentication({ authenticationMode, toggleMode }) {
  // Auth form component
  const handleToggleMode = () => {
    setUser({ email: '', password: '' })
    toggleMode()
  }

  const { user, setUser, signUp, signIn } = useUser()
  const navigate = useNavigate()
  const { t } = useTranslation('common')
  // form submit and validation
  const handleSubmit = async (e) => {
    e.preventDefault()


    if (!user.email || !user.password) {
      toast.error(t('missingFields') || 'Syötä sähköposti ja salasana')
      return
    }

    // basic email check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(user.email)) {
      toast.error(t('invalidEmail') || 'Sähköpostiosoite ei ole kelvollinen.')
      return
    }

    const password = user.password
    const hasUpperCase = /[A-Z]/.test(password)
    const hasNumber = /\d/.test(password)
    const isLongEnough = password.length >= 8

    // simple password rules
    if (!hasUpperCase || !hasNumber || !isLongEnough) {
      toast.error(
        t('invalidPassword') ||
        'Salasanassa pitää olla vähintään 8 merkkiä, yksi iso kirjain ja yksi numero.'
      )
      return
    }

    // call sign up or sign in
    try {
      if (authenticationMode === AuthenticationMode.SignUp) {
        await signUp()
        toast.success(t('signupSuccess') || 'Rekisteröityminen onnistui! Nyt voit kirjautua sisään.')
        navigate('/login')
      } else {
        await signIn(user.email, user.password)
        toast.success(t('loginSuccess') || 'Kirjautuminen onnistui!')
        navigate('/')
      }
    } catch (err) {
      // show error message on failure
      if (authenticationMode === AuthenticationMode.SignIn) {
        toast.error(t('authFailed') || 'Kirjautuminen epäonnistui. Yritä uudelleen.')
      } else {
        toast.error(t('signupFailed') || 'Rekisteröityminen epäonnistui. Tarkista tiedot.')
      }
    }
  }
  return (
    <div className="max-w-md mx-auto bg-gray-700 rounded p-6 shadow-md">
      <h3 className="text-2xl font-bold mb-4">
        {authenticationMode === AuthenticationMode.SignIn ? t('login') : t('signUp')}
      </h3>

      {/* Auth form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block mb-1">{t('email')}</label>
          <input
            className="w-full px-4 py-2 rounded bg-gray-800 text-white"
            placeholder={t('email')}
            value={user.email || ''}
            onChange={(e) => setUser({ ...user, email: e.target.value })}
          />
        </div>
        <div>
          <label className="block mb-1">{t('password')}</label>
          <input
            className="w-full px-4 py-2 rounded bg-gray-800 text-white"
            type="password"
            placeholder={t('password')}
            value={user.password || ''}
            onChange={(e) => setUser({ ...user, password: e.target.value })}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
        >
          {authenticationMode === AuthenticationMode.SignIn ? t('login') : t('signup')}
        </button>
      </form>

      {/* Toggle between sign in and sign up */}
      <div className="mt-4">
        <button
          onClick={handleToggleMode}
          className="text-blue-400 hover:underline"
        >
          {authenticationMode === AuthenticationMode.SignIn
            ? t('noAccount')
            : t('alreadySignup')}
        </button>
      </div>
    </div>
  )
}