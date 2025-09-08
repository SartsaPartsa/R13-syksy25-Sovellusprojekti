import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { useUser } from '../context/useUser'

export const AuthenticationMode = Object.freeze({
  SignIn: 'SignIn',
  SignUp: 'SignUp',
})

export default function Authentication({ authenticationMode }) {
  const { user, setUser, signUp, signIn } = useUser()
  const navigate = useNavigate()
  const { t } = useTranslation('common')

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (authenticationMode === AuthenticationMode.SignUp) {
        await signUp()
        navigate('/login')
      } else {
        await signIn(user.email, user.password)
        navigate('/') 
      }
    } catch (err) {
      alert(err?.message || 'Authentication failed')
    }
  }

  return (
    <div className="max-w-md mx-auto bg-gray-700 rounded p-6 shadow-md">
      <h3 className="text-2xl font-bold mb-4">
        {authenticationMode === AuthenticationMode.SignIn ? t('signin') : t('signup')}
      </h3>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block mb-1">{t('email')}</label>
          <input
            className="w-full px-4 py-2 rounded bg-gray-800 text-white"
            placeholder={t('email')}
            value={user.email}
            onChange={(e) => setUser({ ...user, email: e.target.value })}
          />
        </div>
        <div>
          <label className="block mb-1">{t('password')}</label>
          <input
            className="w-full px-4 py-2 rounded bg-gray-800 text-white"
            type="password"
            placeholder={t('password')}
            value={user.password}
            onChange={(e) => setUser({ ...user, password: e.target.value })}
          />
        </div>

        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded">
          {authenticationMode === AuthenticationMode.SignIn ? t('login') : t('submit')}
        </button>
      </form>

      <div className="mt-4">
        <Link
          to={authenticationMode === AuthenticationMode.SignIn ? '/signup' : '/login'}
          className="text-blue-400 hover:underline"
        >
          {authenticationMode === AuthenticationMode.SignIn ? t('noAccount') : t('alreadySignedUp')}
        </Link>
      </div>
    </div>
  )
}
