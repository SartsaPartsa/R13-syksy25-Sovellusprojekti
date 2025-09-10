import { useUser } from '../context/useUser'
import { useTranslation } from 'react-i18next'

export default function Account() {
  const { user } = useUser()
  const { t } = useTranslation('common')

  return (
    <section className="p-4">
      <h1 className="text-2xl font-semibold mb-2">{t('myAccount')}</h1>

      <div className="bg-white/5 p-4 rounded-lg border border-white/10 max-w-md">
        <p className="text-sm text-slate-400 mb-1">{t('email')}</p>
        <p className="text-white font-mono">{user?.email}</p>
      </div>

      {/* Voit lisätä tähän myöhemmin: vaihda salasana, poista tili, ym. */}
    </section>
  )
}
