import { useTranslation } from 'react-i18next'

export default function Favorites() {
  const { t } = useTranslation('common')
  return (
    <section>
      <h1 className="text-2xl font-semibold mb-4">{t('favorites')}</h1>
      <p className="text-slate-300">{t('favorites_empty') || 'No favorites yet.'}</p>
    </section>
  )
}
