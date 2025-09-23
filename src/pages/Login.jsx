import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Authentication, { AuthenticationMode } from './Authentication'

export default function Login() {
  const { t } = useTranslation('common')
  const [mode, setMode] = useState(AuthenticationMode.SignIn)

  // active mode: SignIn or SignUp

  const toggleMode = () => {
    // switch mode
    setMode((prevMode) =>
      prevMode === AuthenticationMode.SignIn
        ? AuthenticationMode.SignUp
        : AuthenticationMode.SignIn
    )
  }

  return (
    <section className="min-h-[60vh] grid place-items-center">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-gray-900/60 p-6">
        <p className="mt-2 text-white/70">
          {mode === AuthenticationMode.SignIn ? t('loginlead') : t('signuplead')}
        </p>

        <h1 className="text-2xl font-semibold text-white">
          {mode === AuthenticationMode.SignIn ? t('login') : t('signUp')}
        </h1>

        <div className="mt-6">
          {/* Auth form */}
          <Authentication
            authenticationMode={mode}
            toggleMode={toggleMode}
          />
        </div>
      </div>
    </section>
  )
}
