import { useTranslation } from 'react-i18next'

export default function Groups() {
  const { t } = useTranslation('common')
  return (
    <section>
      <h1 className="text-2xl font-semibold mb-4">{t('groups')}</h1>

      {/* tänne myöhemmin: Luo ryhmä, Liity ryhmään, Lista omista ryhmistä, yms. */}
      <div className="grid gap-3">
        <button className="rounded-xl px-4 py-2 bg-white/10 hover:bg-white/15">
          {t('groups_create') || 'Create group'}
        </button>
        <button className="rounded-xl px-4 py-2 bg-white/10 hover:bg-white/15">
          {t('groups_join') || 'Request to join'}
        </button>
      </div>
    </section>
  )
}
