import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function NotFound() {
  const { t } = useTranslation('common')

  return (
    <section className="min-h-[60vh] grid place-items-center">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-white">404</h1>
        <p className="mt-2 text-lg text-white/80">{t('notFound.lead')}</p>

        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 rounded-lg px-4 py-2 bg-[#F18800] text-black font-medium hover:opacity-90"
>
          {t('notFound.backHome')}
        </Link>
      </div>
    </section>
  )
}
