import { useTranslation } from 'react-i18next'

export default function Home() {
  const { t } = useTranslation('common')
  return (
    <section className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-gray-800 py-10 md:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
          {t('title')}
        </h1>
        <p className="mt-2 text-gray-300">{t('subtitle')}</p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-sm">
            <h3 className="font-semibold text-white">{t('introTitle')}</h3>
            <p className="mt-1 text-sm text-gray-300">{t('introLead')}</p>
          </div>
          <div className="rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-sm">
            <h3 className="font-semibold text-white">{t('showsTitle')}</h3>
            <p className="mt-1 text-sm text-gray-300">{t('showsLead')}</p>
          </div>
          <div className="rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-sm">
            <h3 className="font-semibold text-white">{t('reviewsTitle')}</h3>
            <p className="mt-1 text-sm text-gray-300">{t('reviewsLead')}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
