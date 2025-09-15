import { useTranslation } from 'react-i18next'

export default function Reviews() {
  const { t } = useTranslation('common')
  return (
    <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 text-white">
      <h1 className="text-2xl font-semibold mb-3">{t('reviewsTitle')}</h1>
      <p className="text-gray-300">{t('reviewsLead')}</p>
    </main>
  )
}
