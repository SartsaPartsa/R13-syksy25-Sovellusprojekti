import { useTranslation } from 'react-i18next'
import Authentication, { AuthenticationMode } from './Authentication'

export default function Login() {
  const { t } = useTranslation('common')

  return (
    <section className="min-h-[60vh] grid place-items-center">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-gray-900/60 p-6">
        {/* Otsikko ja kuvaus */}
        <h1 className="text-2xl font-semibold text-white">{t('login')}</h1>
        <p className="mt-1 text-sm text-white/70">
          {t('loginLead')}
        </p>

        {/* Kirjautumislomake */}
        <div className="mt-6">
          <Authentication authenticationMode={AuthenticationMode.SignIn} />
        </div>
      </div>
    </section>
  )
}